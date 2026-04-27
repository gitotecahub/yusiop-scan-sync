// Edge function: devuelve una signed URL de corta duración (5 min) del archivo
// de la canción para reproducción en streaming. NO consume crédito.
// El frontend la usa para previews y para el reproductor cuando la canción
// no está descargada offline. La descarga real (que persiste el archivo y
// consume crédito) sigue pasando por `generate-song-access`.
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

    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, preview_url, track_url, scheduled_release_at")
      .eq("id", songId)
      .maybeSingle();

    if (songError || !song) {
      return json(404, { error: "Canción no encontrada" });
    }

    // Bloquear streaming de canciones no publicadas
    if (
      song.scheduled_release_at &&
      new Date(song.scheduled_release_at).getTime() > Date.now()
    ) {
      return json(403, { error: "Canción aún no disponible" });
    }

    const source = song.preview_url || song.track_url;
    if (!source) {
      return json(404, { error: "La canción no tiene archivo" });
    }

    // Detectar bucket y path correctos a partir de la URL guardada.
    // Soporta tanto URLs públicas como signed URLs de cualquier bucket
    // (p.ej. "songs" para subidas del admin, "artist-submissions" para
    // canciones aprobadas que vienen de envíos de artistas).
    const KNOWN_BUCKETS = ["songs", "artist-submissions"];
    let bucket = "songs";
    let storagePath = source as string;

    for (const b of KNOWN_BUCKETS) {
      const marker = `/${b}/`;
      const idx = storagePath.indexOf(marker);
      if (idx >= 0) {
        bucket = b;
        storagePath = storagePath.substring(idx + marker.length);
        const q = storagePath.indexOf("?");
        if (q >= 0) storagePath = storagePath.substring(0, q);
        break;
      }
    }

    const { data: signed, error: signErr } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(storagePath, 300); // 5 min para streaming

    if (signErr || !signed?.signedUrl) {
      console.error("createSignedUrl error:", signErr, "path:", storagePath);
      return json(500, { error: "No se pudo generar acceso al archivo" });
    }

    return json(200, {
      success: true,
      signed_url: signed.signedUrl,
      expires_in: 300,
    });
  } catch (error) {
    console.error("get-song-stream fatal:", error);
    return json(500, { error: "Error interno del servidor" });
  }
});
