// Edge function: create-subscription-checkout
// Crea una sesión Stripe Checkout en modo subscription para un plan YUSIOP.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  plan_code: "plus" | "pro" | "elite";
  success_url?: string;
  cancel_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY no configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    const body = (await req.json()) as Body;
    if (!body.plan_code || !["plus", "pro", "elite"].includes(body.plan_code)) {
      return new Response(JSON.stringify({ error: "plan_code inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: plan, error: planErr } = await admin
      .from("subscription_plans")
      .select("*")
      .eq("code", body.plan_code)
      .eq("is_active", true)
      .maybeSingle();

    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: "Plan no disponible" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar que no tenga ya una suscripción activa
    const { data: active } = await admin
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (active) {
      return new Response(JSON.stringify({ error: "Ya tienes una suscripción activa" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const origin = req.headers.get("origin") ||
      `https://${Deno.env.get("SUPABASE_URL")!.replace("https://", "")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [{
        price_data: {
          currency: "eur",
          recurring: { interval: "month" },
          unit_amount: plan.price_eur_cents,
          product_data: {
            name: plan.name,
            description: `${plan.monthly_downloads} descargas / mes (${plan.price_xaf} XAF)`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        user_id: userId,
        plan_code: plan.code,
        plan_id: plan.id,
        monthly_downloads: String(plan.monthly_downloads),
        price_xaf: String(plan.price_xaf),
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_code: plan.code,
          plan_id: plan.id,
          monthly_downloads: String(plan.monthly_downloads),
          price_xaf: String(plan.price_xaf),
        },
      },
      success_url: body.success_url ??
        `${origin}/subscriptions?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancel_url ?? `${origin}/subscriptions?status=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-subscription-checkout error", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
