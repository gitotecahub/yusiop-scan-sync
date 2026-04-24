// Edge function: cancel-subscription
// Cancela la suscripción activa del usuario al final del período.
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: sub } = await admin
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!sub) {
      return new Response(JSON.stringify({ error: "No tienes una suscripción activa" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Si está en Stripe, marcarla cancel_at_period_end
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey && sub.stripe_subscription_id) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
      try {
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      } catch (e) {
        console.error("Stripe cancel error", e);
      }
    }

    await admin
      .from("user_subscriptions")
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", sub.id);

    return new Response(JSON.stringify({
      success: true,
      message: "Suscripción cancelada. Mantendrás acceso hasta el fin del ciclo.",
      access_until: sub.current_period_end,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cancel-subscription error", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
