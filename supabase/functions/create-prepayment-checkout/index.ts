// Edge function: create-prepayment-checkout
// Crea una sesión de Stripe Checkout para PAGAR los upgrades (Express + Promo)
// ANTES de subir los archivos de música. Tras el pago, el webhook marca la fila
// `submission_prepayments` como `paid`. El frontend la consume con la RPC
// `consume_submission_prepayment` al enviar las canciones definitivas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const XAF_PER_EUR = 655.957;
const xafToEur = (xaf: number) => xaf / XAF_PER_EUR;

const PROMO_PLAN_PRICES: Record<string, { eur: number; days: number; label: string }> = {
  basic:    { eur: 5,  days: 1, label: "Básico" },
  boost:    { eur: 15, days: 3, label: "Impulso" },
  featured: { eur: 40, days: 7, label: "Destacado" },
};

const EXPRESS_PRICES_XAF: Record<string, number> = {
  "72h": 5000, "48h": 10000, "24h": 15000,
};

interface Body {
  kind: "single" | "album";
  context_title?: string;
  context_artist_name?: string;
  express_tier?: "72h" | "48h" | "24h" | null;
  promo_plan?: "basic" | "boost" | "featured" | null;
  promo_ad_text?: string | null;
  promo_cta_text?: string | null;
  promo_start_date?: string | null;
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
    const userEmail = userData.user.email as string;

    const body = (await req.json()) as Body;
    if (!body.kind || !["single", "album"].includes(body.kind)) {
      return new Response(JSON.stringify({ error: "kind inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expressTier = body.express_tier || null;
    const promoPlan = body.promo_plan || null;
    if (!expressTier && !promoPlan) {
      return new Response(JSON.stringify({ error: "Nada que pagar (sin Express ni Promo)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    let expressPriceXaf = 0;
    if (expressTier) {
      expressPriceXaf = EXPRESS_PRICES_XAF[expressTier] ?? 0;
      const cents = Math.round(xafToEur(expressPriceXaf) * 100);
      if (cents > 0) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: `Lanzamiento Express ${expressTier}${body.kind === "album" ? " · Álbum" : ""}`,
              description: body.context_title
                ? `Revisión prioritaria de "${body.context_title}"`
                : "Revisión prioritaria de tu envío",
            },
            unit_amount: cents,
          },
          quantity: 1,
        });
      }
    }

    let promoPriceEur = 0;
    if (promoPlan) {
      const plan = PROMO_PLAN_PRICES[promoPlan];
      if (plan) {
        promoPriceEur = plan.eur;
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: `Promoción YUSIOP · ${plan.label}`,
              description: `Banner destacado · ${plan.days} día(s)${
                body.context_title ? ` · ${body.context_title}` : ""
              }`,
            },
            unit_amount: Math.round(promoPriceEur * 100),
          },
          quantity: 1,
        });
      }
    }

    if (lineItems.length === 0) {
      return new Response(JSON.stringify({ error: "Sin importes válidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Crear fila de prepayment (status=pending)
    const { data: pp, error: ppErr } = await supabase
      .from("submission_prepayments")
      .insert({
        user_id: userId,
        kind: body.kind,
        status: "pending",
        express_tier: expressTier,
        express_price_xaf: expressPriceXaf,
        promo_plan: promoPlan,
        promo_price_eur: promoPriceEur,
        promo_ad_text: body.promo_ad_text ?? null,
        promo_cta_text: body.promo_cta_text ?? null,
        promo_start_date: body.promo_start_date || null,
        context_title: body.context_title ?? null,
        context_artist_name: body.context_artist_name ?? null,
      })
      .select("id")
      .single();
    if (ppErr || !pp) {
      console.error("prepayment insert failed", ppErr);
      return new Response(JSON.stringify({ error: ppErr?.message ?? "No se pudo crear el prepayment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const origin = req.headers.get("origin") ||
      `https://${Deno.env.get("SUPABASE_URL")!.replace("https://", "")}`;

    const successBase = body.success_url ?? `${origin}/artist/dashboard`;
    const cancelBase = body.cancel_url ?? `${origin}/artist/dashboard`;
    const joiner = (u: string) => (u.includes("?") ? "&" : "?");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: lineItems,
      metadata: {
        purpose: "prepayment",
        user_id: userId,
        prepayment_id: pp.id,
        kind: body.kind,
      },
      success_url: `${successBase}${joiner(successBase)}prepayment=success&pid=${pp.id}`,
      cancel_url: `${cancelBase}${joiner(cancelBase)}prepayment=cancelled&pid=${pp.id}`,
    });

    // Guardar session id
    await supabase
      .from("submission_prepayments")
      .update({ stripe_session_id: session.id })
      .eq("id", pp.id);

    return new Response(
      JSON.stringify({ url: session.url, prepayment_id: pp.id, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-prepayment-checkout error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
