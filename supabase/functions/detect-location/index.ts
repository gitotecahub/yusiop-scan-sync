// Detecta el país aproximado del usuario a partir de la IP del request.
// Usa cabeceras estándar (cf-ipcountry, x-vercel-ip-country) cuando están
// disponibles; en su defecto consulta un servicio gratuito de geo-IP.
//
// Responde: { country_code: 'ES' | 'GQ' | ... | null, source: 'header' | 'geoip' | 'unknown' }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function pickIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    null
  );
}

async function lookupByIp(ip: string): Promise<string | null> {
  try {
    // Servicio público sin API key. Limita a ~45 req/min por IP, suficiente.
    const res = await fetch(`https://ipapi.co/${ip}/country/`, {
      headers: { 'User-Agent': 'Yusiop-LocaleDetector/1.0' },
    });
    if (!res.ok) return null;
    const txt = (await res.text()).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(txt) ? txt : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1) Cabeceras de proxy (Cloudflare, Vercel, Fly...)
  const headerCountry =
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('x-country-code');

  if (headerCountry && /^[A-Z]{2}$/i.test(headerCountry)) {
    return new Response(
      JSON.stringify({
        country_code: headerCountry.toUpperCase(),
        source: 'header',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  }

  // 2) Lookup de IP
  const ip = pickIp(req);
  if (ip) {
    const cc = await lookupByIp(ip);
    if (cc) {
      return new Response(
        JSON.stringify({ country_code: cc, source: 'geoip' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }
  }

  // 3) Sin información
  return new Response(
    JSON.stringify({ country_code: null, source: 'unknown' }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  );
});
