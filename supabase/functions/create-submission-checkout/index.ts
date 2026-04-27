// Edge function: create-submission-checkout
// Crea UNA sola sesión de Stripe Checkout que cobra al artista por:
//   - Lanzamiento Express (si lo activó y no es Elite)
//   - Promoción de banner Home (si seleccionó plan)
// El total es la suma de ambos importes (en EUR).
//
// Espera recibir submission_id y opcionalmente campaign_id.
// Tras el pago, el webhook de Stripe (purpose=submission_payment) marcará
// como pagados tanto el express como la campaña asociada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  submission_id: string;
  campaign_id?: string | null;
  success_url?: string;
  cancel_url?: string;
}

// Conversión XAF → EUR (paridad fija, igual que en src/lib/currency.ts)
const XAF_PER_EUR = 655.957;
const xafToEur = (xaf: number) => xaf / XAF_PER_EUR;

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
    if (!body.submission_id) {
      return new Response(JSON.stringify({ error: "submission_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cargar la submission (RLS garantiza ownership)
    const { data: submission, error: sErr } = await supabase
      .from("song_submissions")
      .select("id, user_id, title, artist_name, express_tier, express_price_xaf, express_paid_at")
      .eq("id", body.submission_id)
      .maybeSingle();

    if (sErr || !submission) {
      return new Response(JSON.stringify({ error: "Submission no encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (submission.user_id !== userId) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let includesExpress = false;
    let includesCampaign = false;
    let campaignDurationDays = 0;

    // ---- Express ----
    const expressXaf = Number(submission.express_price_xaf ?? 0);
    if (
      submission.express_tier &&
      expressXaf > 0 &&
      !submission.express_paid_at
    ) {
      const eur = xafToEur(expressXaf);
      const cents = Math.round(eur * 100);
      if (cents > 0) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: `Lanzamiento Express ${submission.express_tier} · ${submission.title}`,
              description: `Revisión prioritaria de "${submission.title}" — ${submission.artist_name}`,
            },
            unit_amount: cents,
          },
          quantity: 1,
        });
        includesExpress = true;
      }
    }

    // ---- Campaña promocional ----
    let campaign: any = null;
    if (body.campaign_id) {
      const { data: c, error: cErr } = await supabase
        .from("ad_campaigns")
        .select("id, user_id, title, subtitle, price_eur, duration_days, payment_status")
        .eq("id", body.campaign_id)
        .maybeSingle();

      if (cErr || !c) {
        return new Response(JSON.stringify({ error: "Campaña no encontrada" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (c.user_id !== userId) {
        return new Response(JSON.stringify({ error: "No autorizado (campaña)" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (c.payment_status !== "paid") {
        const priceEur = Number(c.price_eur ?? 0);
        if (priceEur > 0) {
          lineItems.push({
            price_data: {
              currency: "eur",
              product_data: {
                name: `Promoción YUSIOP · ${c.title}`,
                description: `Banner destacado · ${c.duration_days ?? 1} días${
                  c.subtitle ? ` · ${c.subtitle}` : ""
                }`,
              },
              unit_amount: Math.round(priceEur * 100),
            },
            quantity: 1,
          });
          includesCampaign = true;
          campaignDurationDays = c.duration_days ?? 1;
          campaign = c;
        }
      }
    }

    if (lineItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No hay servicios pendientes de pago" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const origin = req.headers.get("origin") ||
      `https://${Deno.env.get("SUPABASE_URL")!.replace("https://", "")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: lineItems,
      metadata: {
        purpose: "submission_payment",
        user_id: userId,
        submission_id: submission.id,
        campaign_id: includesCampaign && campaign ? campaign.id : "",
        includes_express: includesExpress ? "1" : "0",
        includes_campaign: includesCampaign ? "1" : "0",
        campaign_duration_days: String(campaignDurationDays),
      },
      success_url: body.success_url ??
        `${origin}/artist/dashboard?submission_payment=success&submission=${submission.id}`,
      cancel_url: body.cancel_url ??
        `${origin}/artist/dashboard?submission_payment=cancelled&submission=${submission.id}`,
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
        includes_express: includesExpress,
        includes_campaign: includesCampaign,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-submission-checkout error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
