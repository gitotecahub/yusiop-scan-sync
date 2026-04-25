// Edge Function: notify-collaborators
// Llamada por el admin tras aprobar una canción. Para cada colaborador no
// principal con contact_email definido, decide si enviar la plantilla
// "registered" (si el email ya tiene cuenta) o la "invite" (si no).
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'server_config' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Auth: requiere usuario autenticado y admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: userData.user.id })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const submissionId: string | undefined = body.submission_id
  const songId: string | undefined = body.song_id
  const appUrl: string = body.app_url ?? 'https://yusiop.com'
  if (!submissionId && !songId) {
    return new Response(JSON.stringify({ error: 'submission_id_or_song_id_required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Cargar la submission para obtener title + primary artist
  let songTitle = ''
  let primaryArtistName = ''
  let resolvedSongId: string | null = songId ?? null

  if (submissionId) {
    const { data: sub } = await supabase
      .from('song_submissions')
      .select('title, artist_name, published_song_id')
      .eq('id', submissionId)
      .maybeSingle()
    if (!sub) {
      return new Response(JSON.stringify({ error: 'submission_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    songTitle = sub.title
    primaryArtistName = sub.artist_name
    resolvedSongId = sub.published_song_id ?? resolvedSongId
  } else if (songId) {
    const { data: song } = await supabase
      .from('songs')
      .select('title, artist:artists(name)')
      .eq('id', songId)
      .maybeSingle()
    if (!song) {
      return new Response(JSON.stringify({ error: 'song_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    songTitle = song.title
    primaryArtistName = (song as any).artist?.name ?? ''
  }

  // Cargar colaboradores (preferimos los del song publicado; fallback a submission)
  let collabsQuery = supabase
    .from('song_collaborators')
    .select('id, artist_name, share_percent, is_primary, role, contact_email')
    .eq('is_primary', false)

  if (resolvedSongId) {
    collabsQuery = collabsQuery.eq('song_id', resolvedSongId)
  } else if (submissionId) {
    collabsQuery = collabsQuery.eq('submission_id', submissionId)
  }

  const { data: collabs, error: collabsErr } = await collabsQuery
  if (collabsErr) {
    return new Response(JSON.stringify({ error: 'collabs_query_failed', detail: collabsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const results: Array<{ email: string; template: string; ok: boolean; error?: string }> = []
  console.log('notify-collaborators: collabs found', { count: collabs?.length ?? 0, songTitle, primaryArtistName, resolvedSongId, submissionId })

  for (const c of collabs ?? []) {
    if (!c.contact_email) {
      console.log('Skipping collaborator without contact_email', { id: c.id, artist_name: c.artist_name })
      continue
    }
    // Resolver si ya tiene cuenta
    const { data: existingUserId } = await supabase.rpc('get_user_id_by_email', {
      p_email: c.contact_email,
    })
    const isRegistered = !!existingUserId
    const templateName = isRegistered
      ? 'collaboration-published-registered'
      : 'collaboration-published-invite'

    const idempotencyKey = `collab-notify-${c.id}-${templateName}`

    // Llamar directamente vía fetch con service role para evitar problemas de auth
    // entre edge functions (functions.invoke usa el JWT del cliente original).
    let invokeErrMsg: string | null = null
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          templateName,
          recipientEmail: c.contact_email,
          idempotencyKey,
          templateData: {
            songTitle,
            primaryArtistName,
            collaboratorArtistName: c.artist_name,
            sharePercent: Number(c.share_percent),
            role: c.role,
            appUrl,
          },
        }),
      })
      if (!resp.ok) {
        const txt = await resp.text()
        invokeErrMsg = `HTTP ${resp.status}: ${txt}`
        console.error('send-transactional-email failed', invokeErrMsg)
      } else {
        const json = await resp.json().catch(() => ({}))
        console.log('send-transactional-email OK', { email: c.contact_email, template: templateName, json })
      }
    } catch (e: any) {
      invokeErrMsg = e?.message ?? 'unknown_error'
      console.error('fetch send-transactional-email threw', invokeErrMsg)
    }

    results.push({
      email: c.contact_email,
      template: templateName,
      ok: !invokeErrMsg,
      ...(invokeErrMsg ? { error: invokeErrMsg } : {}),
    })
  }

  return new Response(
    JSON.stringify({ success: true, sent: results.length, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
