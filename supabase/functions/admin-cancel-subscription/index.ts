// Edge function: admin-cancel-subscription
// Permite a un admin cancelar la suscripción de cualquier usuario,
// al final del periodo o de forma inmediata.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Verificar que es admin
    const { data: isAdmin, error: roleErr } = await admin.rpc("is_admin", {
      _user_id: userData.user.id,
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const subscriptionId: string | undefined = body?.subscription_id;
    const mode: "period_end" | "immediate" = body?.mode === "immediate" ? "immediate" : "period_end";

    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: "subscription_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sub, error: subErr } = await admin
      .from("user_subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .maybeSingle();
    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: "Suscripción no encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stripe (si aplica)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey && sub.stripe_subscription_id) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
      try {
        if (mode === "immediate") {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        } else {
          await stripe.subscriptions.update(sub.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
        }
      } catch (e) {
        console.error("Stripe cancel error", e);
      }
    }

    const nowIso = new Date().toISOString();
    const update: Record<string, unknown> = {
      cancelled_at: nowIso,
      last_event_at: nowIso,
      updated_at: nowIso,
    };
    if (mode === "immediate") {
      update.status = "cancelled";
      update.cancel_at_period_end = false;
      update.downloads_remaining = 0;
      update.current_period_end = nowIso;
    } else {
      update.cancel_at_period_end = true;
    }

    const { error: updErr } = await admin
      .from("user_subscriptions")
      .update(update)
      .eq("id", subscriptionId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({
      success: true,
      mode,
      message: mode === "immediate"
        ? "Suscripción cancelada inmediatamente."
        : "Suscripción cancelada al final del periodo.",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-cancel-subscription error", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
