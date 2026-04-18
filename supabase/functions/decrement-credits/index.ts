import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autorización requerido" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const songId = typeof body?.songId === "string" ? body.songId.trim() : "";

    // Basic input validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!songId || !uuidRegex.test(songId)) {
      return new Response(JSON.stringify({ error: "songId inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client to bypass RLS for atomic credit operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Authenticate caller
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: "Usuario no autenticado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify the song exists
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, title")
      .eq("id", songId)
      .maybeSingle();

    if (songError || !song) {
      return new Response(JSON.stringify({ error: "Canción no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the most recent active credit row for this user with credits remaining
    const { data: credits, error: creditsError } = await supabase
      .from("user_credits")
      .select("*")
      .eq("user_email", user.email)
      .eq("is_active", true)
      .gt("credits_remaining", 0)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (creditsError) {
      return new Response(
        JSON.stringify({ error: "Error verificando créditos" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!credits) {
      return new Response(
        JSON.stringify({ error: "No tienes créditos disponibles" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check expiration
    if (
      credits.expires_at && new Date(credits.expires_at).getTime() < Date.now()
    ) {
      return new Response(
        JSON.stringify({ error: "Tus créditos han expirado" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const newRemaining = credits.credits_remaining - 1;

    // Record the download
    const { error: downloadError } = await supabase
      .from("user_downloads")
      .insert({
        user_id: user.id,
        user_email: user.email,
        song_id: song.id,
        card_type: credits.card_type,
      });

    if (downloadError) {
      return new Response(
        JSON.stringify({ error: "Error al registrar la descarga" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Decrement credits server-side
    const { error: updateError } = await supabase
      .from("user_credits")
      .update({
        credits_remaining: newRemaining,
        is_active: newRemaining > 0,
      })
      .eq("id", credits.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Error al actualizar créditos" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits_remaining: newRemaining,
        card_type: credits.card_type,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
