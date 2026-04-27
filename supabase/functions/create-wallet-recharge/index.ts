// Edge function: create-wallet-recharge
// Crea una sesión de Stripe Checkout para recargar saldo digital del wallet del usuario.
// Packs predefinidos en EUR; el saldo se acredita en XAF tras pago confirmado por webhook.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RechargeBody {
  amount_eur: 5 | 10 | 20;
  success_url?: string;
  cancel_url?: string;
}

const XAF_PER_EUR = 655.957;

const PACKS: Record<number, { downloads: number; bonus: number; label: string }> = {
  5: { downloads: 5, bonus: 1, label: "Recarga 5 €" },
  10: { downloads: 10, bonus: 2, label: "Recarga 10 €" },
  20: { downloads: 20, bonus: 5, label: "Recarga 20 €" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error:
            "STRIPE_SECRET_KEY no configurada. Añade tu clave en los secretos.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email as string;

    const body = (await req.json()) as RechargeBody;
    const amount = Number(body.amount_eur);
    if (!PACKS[amount]) {
      return new Response(
        JSON.stringify({ error: "amount_eur inválido. Usa 5, 10 o 20." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const pack = PACKS[amount];
    const amountCents = amount * 100;
    const xafCredit = Math.round(amount * XAF_PER_EUR);

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
              name: pack.label,
              description: `${pack.downloads} descargas + ${pack.bonus} bonus`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        purpose: "wallet_recharge",
        user_id: userId,
        user_email: userEmail,
        amount_eur: String(amount),
        amount_xaf: String(xafCredit),
        pack_downloads: String(pack.downloads),
        pack_bonus: String(pack.bonus),
      },
      success_url: body.success_url ??
        `${origin}/wallet?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancel_url ?? `${origin}/wallet?status=cancelled`,
    });

    console.log("Wallet recharge session created:", {
      id: session.id,
      user: userId,
      amount_eur: amount,
      xaf_credit: xafCredit,
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("create-wallet-recharge error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
