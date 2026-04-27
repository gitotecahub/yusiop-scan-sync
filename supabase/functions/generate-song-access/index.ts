import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return json(401, { error: "Token de autorización requerido" });
    }

    const body = await req.json().catch(() => ({}));
    const songId =
      typeof body?.songId === "string" ? body.songId.trim() : "";
    if (!songId || !UUID_RE.test(songId)) {
      return json(400, { error: "songId inválido" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user?.id) {
      return json(401, { error: "Usuario no autenticado" });
    }

    // Resolver canción y storage path
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, title, track_url")
      .eq("id", songId)
      .maybeSingle();

    if (songError || !song) {
      return json(404, { error: "Canción no encontrada" });
    }
    if (!song.track_url) {
      return json(404, { error: "La canción no tiene archivo asociado" });
    }

    // Geolocalización por IP (best-effort)
    const rawIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      "";
    const geo: {
      country_code: string | null;
      country_name: string | null;
      city: string | null;
      region: string | null;
    } = {
      country_code: req.headers.get("cf-ipcountry") || null,
      country_name: null,
      city: null,
      region: null,
    };
    if (rawIp) {
      try {
        const r = await fetch(`https://ipapi.co/${rawIp}/json/`);
        if (r.ok) {
          const j = await r.json();
          geo.country_code = j.country_code || geo.country_code;
          geo.country_name = j.country_name || null;
          geo.city = j.city || null;
          geo.region = j.region || null;
        }
      } catch (_e) { /* silencioso */ }
    }

    // Consumir crédito de forma atómica (QR → suscripción → wallet)
    const { data: consumeData, error: consumeError } = await supabase.rpc(
      "consume_download",
      {
        p_user_id: user.id,
        p_song_id: song.id,
        p_ip: rawIp || null,
        p_country_code: geo.country_code,
        p_country_name: geo.country_name,
        p_city: geo.city,
        p_region: geo.region,
      },
    );

    if (consumeError) {
      console.error("consume_download error:", consumeError);
      return json(500, { error: "Error al procesar la descarga" });
    }

    const result = Array.isArray(consumeData) ? consumeData[0] : consumeData;
    if (!result?.success) {
      return json(403, {
        error: result?.message || "Sin créditos disponibles",
        balance_info: result?.balance_info ?? {},
      });
    }

    // Extraer bucket + path desde track_url. Acepta:
    //  - "songs/path/file.mp3" o "artist-submissions/uid/file.mp3" (path con bucket prefijado)
    //  - URL pública o firmada: ".../storage/v1/object/(public|sign)/<bucket>/<path>?token=..."
    //  - Path relativo dentro del bucket "songs" (legacy)
    const KNOWN_BUCKETS = ["songs", "artist-submissions"];
    let bucket = "songs";
    let storagePath = song.track_url as string;

    // Si es URL completa, extraer la parte tras /object/(public|sign)/
    const urlMatch = storagePath.match(/\/storage\/v1\/object\/(?:public|sign)\/([^?]+)/);
    if (urlMatch) {
      storagePath = urlMatch[1];
    }
    // Quitar query string si la hubiera
    const q = storagePath.indexOf("?");
    if (q >= 0) storagePath = storagePath.substring(0, q);

    // Detectar bucket por prefijo
    for (const b of KNOWN_BUCKETS) {
      if (storagePath.startsWith(`${b}/`)) {
        bucket = b;
        storagePath = storagePath.substring(b.length + 1);
        break;
      }
    }

    // Generar signed URL (60s)
    const { data: signed, error: signErr } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(storagePath, 60, { download: `${song.title}.mp3` });

    if (signErr || !signed?.signedUrl) {
      console.error("createSignedUrl error:", signErr, "bucket:", bucket, "path:", storagePath);
      return json(500, { error: "No se pudo generar acceso al archivo" });
    }

    return json(200, {
      success: true,
      signed_url: signed.signedUrl,
      expires_in: 60,
      source: result.source,
      balance_info: result.balance_info ?? {},
    });
  } catch (error) {
    console.error("generate-song-access fatal:", error);
    return json(500, { error: "Error interno del servidor" });
  }
});
