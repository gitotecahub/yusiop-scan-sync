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
    const auth = req.headers.get("authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { giftId, recipientEmail, songTitle, artistName, message } = body ?? {};

    if (!recipientEmail || !songTitle) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Validar el caller
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderName = user.email?.split("@")[0] ?? "Un amigo";
    const origin = req.headers.get("origin") ?? "https://yusiop.lovable.app";
    const signupUrl = `${origin}/auth?gift=${giftId ?? ""}&email=${encodeURIComponent(recipientEmail)}`;

    // Encolar email transaccional reusando la plantilla genérica gift-received
    // (mensaje adaptado a regalo de canción)
    const { error: emailErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "gift-received",
        recipientEmail,
        idempotencyKey: `song-gift-${giftId}`,
        templateData: {
          senderName,
          giftMessage: message
            ? `${message}\n\n🎵 "${songTitle}" — ${artistName}`
            : `🎵 "${songTitle}" — ${artistName}`,
          cardType: "standard",
          downloadCredits: 1,
          redemptionUrl: signupUrl,
        },
      },
    });

    if (emailErr) {
      console.error("send-song-gift-email: error encolando", emailErr);
      return new Response(JSON.stringify({ error: emailErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-song-gift-email fatal:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
