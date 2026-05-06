import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL = 'https://yusiop.lovable.app'

function buildHtml(name: string) {
  const greeting = name ? `Hola ${name},` : '¡Hola!'
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Bienvenido a YUSIOP</title>
</head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#E6ECF5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Tu nueva forma de descubrir, comprar y disfrutar música ya está aquí.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F1A;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0F1424;border:1px solid rgba(255,255,255,0.06);border-radius:24px;overflow:hidden;">
      <tr><td style="padding:48px 40px 24px;text-align:center;background:linear-gradient(135deg,#7B5CFF 0%,#5FA8FF 50%,#5FE1D9 100%);">
        <div style="font-size:42px;font-weight:800;letter-spacing:0.04em;color:#ffffff;">YUSIOP</div>
        <div style="font-size:12px;letter-spacing:0.3em;color:rgba(255,255,255,0.85);margin-top:6px;">SCAN · SYNC · PLAY</div>
      </td></tr>
      <tr><td style="padding:40px 40px 8px;">
        <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#ffffff;">Bienvenido a YUSIOP</h1>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#B8C2D6;">${greeting}</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#B8C2D6;">Gracias por unirte a <strong style="color:#fff;">YUSIOP</strong>, la plataforma que conecta artistas y oyentes mediante una nueva forma de acceder a la música: escanear, sincronizar y reproducir.</p>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#B8C2D6;">Con YUSIOP podrás descubrir canciones, canjear tarjetas musicales, guardar tu biblioteca y disfrutar de tu música descargada incluso sin conexión.</p>
      </td></tr>
      <tr><td style="padding:0 40px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${[['1','Escanea tu tarjeta'],['2','Elige tu música'],['3','Descarga y disfruta']].map(([n,t])=>`
          <tr><td style="padding:10px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#7B5CFF,#5FA8FF,#5FE1D9);text-align:center;color:#0B0F1A;font-weight:800;font-size:14px;line-height:36px;">${n}</td>
              <td style="padding-left:14px;font-size:15px;color:#E6ECF5;">${t}</td>
            </tr></table>
          </td></tr>`).join('')}
        </table>
      </td></tr>
      <tr><td style="padding:32px 40px 48px;text-align:center;">
        <a href="${APP_URL}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:linear-gradient(135deg,#7B5CFF 0%,#5FA8FF 50%,#5FE1D9 100%);color:#0B0F1A;font-weight:700;font-size:15px;text-decoration:none;">Entrar en YUSIOP</a>
      </td></tr>
      <tr><td style="padding:24px 40px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
        <div style="font-size:12px;letter-spacing:0.2em;color:#7B86A2;">YUSIOP · SCAN · SYNC · PLAY</div>
        <div style="font-size:11px;color:#5C6680;margin-top:8px;">Este email se ha enviado porque te has registrado en YUSIOP.</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = claimsData.claims.sub as string
    const email = (claimsData.claims.email as string) || ''
    const meta = (claimsData.claims.user_metadata as Record<string, any>) || {}
    const name: string = meta.username || meta.full_name || meta.name || ''

    if (!email) {
      return new Response(JSON.stringify({ error: 'No email on user' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Idempotency
    const { data: existing } = await admin
      .from('welcome_emails_sent')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ ok: true, alreadySent: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'YUSIOP <onboarding@resend.dev>',
        to: [email],
        subject: 'Bienvenido a YUSIOP — Scan · Sync · Play',
        html: buildHtml(name),
      }),
    })

    if (!resp.ok) {
      const errTxt = await resp.text()
      console.error('Resend error', resp.status, errTxt)
      return new Response(JSON.stringify({ error: 'Email send failed', detail: errTxt }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await admin.from('welcome_emails_sent').insert({ user_id: userId, email })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
