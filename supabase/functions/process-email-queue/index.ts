// Edge Function: process-email-queue
// Drains the auth_emails and transactional_emails pgmq queues, calls the
// Lovable Email API to actually deliver each message, and handles retries,
// rate-limits, TTL expiry, and dead-letter routing.
// Triggered by pg_cron every minute (see migration that schedules it).
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_EMAIL_API_URL = 'https://api.lovable.dev/v1/messaging/email/send'

interface QueueRow {
  msg_id: number
  read_ct: number
  enqueued_at: string
  vt: string
  message: Record<string, any>
}

interface SendState {
  batch_size: number
  send_delay_ms: number
  visibility_timeout_seconds: number
  max_attempts: number
  auth_email_ttl_minutes: number
  transactional_email_ttl_minutes: number
  rate_limit_until: string | null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

  if (!lovableApiKey) {
    console.error('LOVABLE_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'missing_api_key' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Load dispatcher state
  const { data: stateRow } = await supabase
    .from('email_send_state')
    .select('*')
    .eq('id', 1)
    .single()

  const state: SendState = stateRow ?? {
    batch_size: 10,
    send_delay_ms: 200,
    visibility_timeout_seconds: 30,
    max_attempts: 5,
    auth_email_ttl_minutes: 15,
    transactional_email_ttl_minutes: 60,
    rate_limit_until: null,
  }

  // Respect rate-limit backoff
  if (state.rate_limit_until && new Date(state.rate_limit_until) > new Date()) {
    return new Response(
      JSON.stringify({ skipped: true, reason: 'rate_limited', until: state.rate_limit_until }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const results = { auth: 0, transactional: 0, sent: 0, failed: 0, dlq: 0, expired: 0 }

  // Process auth_emails first (priority), then transactional_emails
  for (const queueName of ['auth_emails', 'transactional_emails'] as const) {
    const ttlMinutes =
      queueName === 'auth_emails'
        ? state.auth_email_ttl_minutes
        : state.transactional_email_ttl_minutes

    const { data: batch, error: readErr } = await supabase.rpc('read_email_batch', {
      queue_name: queueName,
      batch_size: state.batch_size,
      visibility_timeout: state.visibility_timeout_seconds,
    })

    if (readErr) {
      console.error('Failed to read batch', { queueName, error: readErr.message })
      continue
    }

    const rows: QueueRow[] = batch ?? []

    for (const row of rows) {
      if (queueName === 'auth_emails') results.auth++
      else results.transactional++

      const payload = row.message
      const enqueuedAt = new Date(payload.queued_at ?? row.enqueued_at).getTime()
      const ageMin = (Date.now() - enqueuedAt) / 60_000

      // TTL expired → move to DLQ without sending
      if (ageMin > ttlMinutes) {
        await supabase.rpc('move_to_dlq', {
          source_queue: queueName,
          msg_id: row.msg_id,
          payload,
        })
        await supabase.from('email_send_log').insert({
          message_id: payload.message_id,
          template_name: payload.label ?? queueName,
          recipient_email: payload.to,
          status: 'dlq',
          error_message: `TTL expired (${ageMin.toFixed(1)} min > ${ttlMinutes} min)`,
        })
        results.expired++
        continue
      }

      // Build Lovable Email API request
      const apiPayload: Record<string, any> = {
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        sender_domain: payload.sender_domain,
        purpose: payload.purpose ?? 'transactional',
        label: payload.label,
        idempotency_key: payload.idempotency_key,
      }
      if (payload.unsubscribe_token) {
        apiPayload.unsubscribe_token = payload.unsubscribe_token
      }

      try {
        const resp = await fetch(LOVABLE_EMAIL_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': payload.idempotency_key ?? payload.message_id,
          },
          body: JSON.stringify(apiPayload),
        })

        if (resp.status === 429) {
          // Rate limited → set backoff + leave message in queue
          const retryAfter = Number(resp.headers.get('Retry-After') ?? '60')
          const until = new Date(Date.now() + retryAfter * 1000).toISOString()
          await supabase
            .from('email_send_state')
            .update({ rate_limit_until: until, updated_at: new Date().toISOString() })
            .eq('id', 1)
          console.warn('Rate limited; pausing', { retryAfter, until })
          // Return early — don't process more this cycle
          return new Response(
            JSON.stringify({ rate_limited: true, until, results }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        if (!resp.ok) {
          const errText = await resp.text()
          const isRetryable = resp.status >= 500 && resp.status < 600

          if (!isRetryable || row.read_ct >= state.max_attempts) {
            // Permanent failure or too many retries → DLQ
            await supabase.rpc('move_to_dlq', {
              source_queue: queueName,
              msg_id: row.msg_id,
              payload,
            })
            await supabase.from('email_send_log').insert({
              message_id: payload.message_id,
              template_name: payload.label ?? queueName,
              recipient_email: payload.to,
              status: 'dlq',
              error_message: `HTTP ${resp.status}: ${errText.slice(0, 500)}`,
            })
            results.dlq++
          } else {
            // Transient failure → leave in queue for retry (visibility timeout)
            await supabase.from('email_send_log').insert({
              message_id: payload.message_id,
              template_name: payload.label ?? queueName,
              recipient_email: payload.to,
              status: 'failed',
              error_message: `HTTP ${resp.status} (attempt ${row.read_ct}): ${errText.slice(0, 500)}`,
            })
            results.failed++
          }
          continue
        }

        // Success → log + delete from queue
        const respBody = await resp.json().catch(() => ({}))
        await supabase.from('email_send_log').insert({
          message_id: payload.message_id,
          template_name: payload.label ?? queueName,
          recipient_email: payload.to,
          status: 'sent',
          metadata: respBody,
        })
        await supabase.rpc('delete_email', { queue_name: queueName, msg_id: row.msg_id })
        results.sent++

        if (state.send_delay_ms > 0) {
          await sleep(state.send_delay_ms)
        }
      } catch (e: any) {
        console.error('Send threw', { error: e?.message, msg_id: row.msg_id })
        if (row.read_ct >= state.max_attempts) {
          await supabase.rpc('move_to_dlq', {
            source_queue: queueName,
            msg_id: row.msg_id,
            payload,
          })
          results.dlq++
        }
        await supabase.from('email_send_log').insert({
          message_id: payload.message_id,
          template_name: payload.label ?? queueName,
          recipient_email: payload.to,
          status: 'failed',
          error_message: e?.message ?? 'unknown',
        })
        results.failed++
      }
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
