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

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!songId || !uuidRegex.test(songId)) {
      return new Response(JSON.stringify({ error: "songId inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

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

    // Bloquear descargas de admins/moderadores: deben usar otra cuenta
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"]);

    if (adminRoles && adminRoles.length > 0) {
      return new Response(
        JSON.stringify({
          error:
            "Los administradores no pueden descargar música. Usa una cuenta de usuario con tarjeta para descargar.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const getRemainingCredits = async () => {
      const [{ data: ownedCards }, { data: creditsRows }] = await Promise.all([
        supabase
          .from("qr_cards")
          .select("download_credits")
          .or(`owner_user_id.eq.${user.id},activated_by.eq.${user.id}`)
          .gt("download_credits", 0),
        supabase
          .from("user_credits")
          .select("credits_remaining")
          .eq("user_email", user.email)
          .eq("is_active", true)
          .gt("credits_remaining", 0),
      ]);

      const totalOwned = (ownedCards ?? []).reduce(
        (sum, card) => sum + (card.download_credits ?? 0),
        0,
      );
      const totalLegacy = (creditsRows ?? []).reduce(
        (sum, credit) => sum + (credit.credits_remaining ?? 0),
        0,
      );

      return totalOwned + totalLegacy;
    };

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

    const { data: existingDownload } = await supabase
      .from("user_downloads")
      .select("id, hidden_from_library")
      .eq("user_id", user.id)
      .eq("song_id", song.id)
      .maybeSingle();

    if (existingDownload) {
      if (existingDownload.hidden_from_library) {
        await supabase
          .from("user_downloads")
          .update({ hidden_from_library: false })
          .eq("id", existingDownload.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          credits_remaining: await getRemainingCredits(),
          source: "existing_download",
          restored: Boolean(existingDownload.hidden_from_library),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Geolocalización por IP (best-effort, no bloquea la descarga si falla)
    const rawIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      "";
    const geo: {
      ip_address: string | null;
      country_code: string | null;
      country_name: string | null;
      city: string | null;
      region: string | null;
    } = {
      ip_address: rawIp || null,
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
      } catch (_e) {
        // silencioso
      }
    }

    // 1) Tarjetas digitales/owned (qr_cards) primero
    const { data: ownedCard, error: ownedErr } = await supabase
      .from("qr_cards")
      .select("*")
      .or(`owner_user_id.eq.${user.id},activated_by.eq.${user.id}`)
      .gt("download_credits", 0)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownedErr) console.error("Error fetching owned cards:", ownedErr);

    if (ownedCard) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "consume_card_credit",
        {
          p_card_id: ownedCard.id,
          p_user_id: user.id,
          p_song_id: song.id,
        },
      );

      if (rpcError) {
        console.error("consume_card_credit error:", rpcError);

        if (rpcError.code === "23505") {
          const { data: duplicatedDownload } = await supabase
            .from("user_downloads")
            .select("id, hidden_from_library")
            .eq("user_id", user.id)
            .eq("song_id", song.id)
            .maybeSingle();

          if (duplicatedDownload?.hidden_from_library) {
            await supabase
              .from("user_downloads")
              .update({ hidden_from_library: false })
              .eq("id", duplicatedDownload.id);
          }

          return new Response(
            JSON.stringify({
              success: true,
              credits_remaining: await getRemainingCredits(),
              card_type: ownedCard.card_type,
              source: "existing_download",
              restored: Boolean(duplicatedDownload?.hidden_from_library),
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({ error: "Error al consumir crédito" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!result?.success) {
        return new Response(
          JSON.stringify({ error: result?.message || "No se pudo descargar" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Enriquecer la última descarga con datos geo y reevaluar regla anti-fraude por IP
      // (consume_card_credit no tiene la IP del request actual)
      try {
        const { data: lastDl } = await supabase
          .from("user_downloads")
          .select("id, download_type, fraud_score")
          .eq("user_id", user.id)
          .eq("song_id", song.id)
          .eq("qr_card_id", ownedCard.id)
          .order("downloaded_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastDl?.id) {
          const updatePayload: Record<string, unknown> = { ...geo };

          // Si la descarga ya fue marcada como sospechosa por velocidad de usuario,
          // no degradamos el tipo. Solo añadimos geo.
          if (rawIp && lastDl.download_type === "real") {
            const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { count: ipCount } = await supabase
              .from("user_downloads")
              .select("id", { count: "exact", head: true })
              .eq("ip_address", rawIp)
              .gte("downloaded_at", tenMinAgo);

            if ((ipCount ?? 0) >= 5) {
              updatePayload.download_type = "suspicious";
              updatePayload.fraud_score = (lastDl.fraud_score ?? 0) + 10;

              // Acumular puntuación antifraude del usuario
              const { data: existingScore } = await supabase
                .from("user_fraud_score")
                .select("score")
                .eq("user_id", user.id)
                .maybeSingle();

              const newScore = (existingScore?.score ?? 0) + 10;
              const isSuspicious = newScore >= 50;

              await supabase
                .from("user_fraud_score")
                .upsert({
                  user_id: user.id,
                  score: newScore,
                  is_suspicious: isSuspicious,
                  flagged_at: isSuspicious ? new Date().toISOString() : null,
                  last_event_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }, { onConflict: "user_id" });
            }
          }

          await supabase.from("user_downloads").update(updatePayload).eq("id", lastDl.id);
        }
      } catch (_e) { /* no bloquear */ }

      return new Response(
        JSON.stringify({
          success: true,
          credits_remaining: result.credits_left,
          card_type: ownedCard.card_type,
          source: "qr_card",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2) Fallback: créditos legacy en user_credits
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

    const { error: downloadError } = await supabase
      .from("user_downloads")
      .insert({
        user_id: user.id,
        user_email: user.email,
        song_id: song.id,
        card_type: credits.card_type,
        ...geo,
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
        source: "user_credits",
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
