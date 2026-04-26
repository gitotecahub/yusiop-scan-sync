// Edge function: create-ad-checkout
// Crea sesión de Stripe Checkout para una campaña de promoción de artista (banner Home).
// La campaña debe existir previamente en `ad_campaigns` con status = 'pending_payment'
// y pertenecer al usuario autenticado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  campaign_id: string;
  success_url?: string;
  cancel_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email as string;

    const body = (await req.json()) as Body;
    if (!body.campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cargar la campaña con cliente del usuario (RLS valida ownership)
    const { data: campaign, error: cErr } = await supabase
      .from("ad_campaigns")
      .select("id, user_id, title, subtitle, price_eur, price_xaf, duration_days, status, payment_status, campaign_type")
      .eq("id", body.campaign_id)
      .maybeSingle();

    if (cErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaña no encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (campaign.user_id !== userId) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (campaign.payment_status === "paid") {
      return new Response(JSON.stringify({ error: "Esta campaña ya está pagada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceEur = Number(campaign.price_eur ?? 0);
    if (!priceEur || priceEur <= 0) {
      return new Response(JSON.stringify({ error: "Precio inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const amountCents = Math.round(priceEur * 100);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const origin = req.headers.get("origin") ||
      `https://${Deno.env.get("SUPABASE_URL")!.replace("https://", "")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Promoción YUSIOP · ${campaign.title}`,
              description: `Banner destacado · ${campaign.duration_days ?? 1} días${
                campaign.subtitle ? ` · ${campaign.subtitle}` : ""
              }`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        purpose: "ad_campaign",
        campaign_id: campaign.id,
        user_id: userId,
        duration_days: String(campaign.duration_days ?? 1),
      },
      success_url: body.success_url ??
        `${origin}/artist/dashboard?ad_payment=success&campaign=${campaign.id}`,
      cancel_url: body.cancel_url ??
        `${origin}/artist/dashboard?ad_payment=cancelled&campaign=${campaign.id}`,
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-ad-checkout error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
