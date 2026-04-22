// Edge function: create-card-checkout
// Crea una sesión de Stripe Checkout para comprar una tarjeta digital (estándar/premium)
// Soporta modo "regalo" guardando email de destinatario y mensaje en metadata.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckoutBody {
  card_type: "standard" | "premium";
  is_gift?: boolean;
  gift_recipient_email?: string;
  gift_message?: string;
  success_url?: string;
  cancel_url?: string;
}

const PRICING = {
  standard: { amount_cents: 499, credits: 4, label: "Tarjeta YUSIOP Estándar" },
  premium: { amount_cents: 999, credits: 10, label: "Tarjeta YUSIOP Premium" },
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
            "STRIPE_SECRET_KEY no configurada. Añade tu clave de prueba (sk_test_...) en los secretos.",
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

    const body = (await req.json()) as CheckoutBody;
    if (!body.card_type || !["standard", "premium"].includes(body.card_type)) {
      return new Response(JSON.stringify({ error: "card_type inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.is_gift) {
      if (!body.gift_recipient_email || !body.gift_recipient_email.includes("@")) {
        return new Response(
          JSON.stringify({ error: "Email del destinatario inválido" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const tier = PRICING[body.card_type];
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
              name: tier.label,
              description: `${tier.credits} descargas${
                body.is_gift ? " · Regalo" : ""
              }`,
            },
            unit_amount: tier.amount_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        buyer_user_id: userId,
        buyer_email: userEmail,
        card_type: body.card_type,
        download_credits: String(tier.credits),
        is_gift: body.is_gift ? "true" : "false",
        gift_recipient_email: body.gift_recipient_email ?? "",
        gift_message: body.gift_message?.slice(0, 280) ?? "",
      },
      success_url: body.success_url ??
        `${origin}/store?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancel_url ?? `${origin}/store?status=cancelled`,
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("create-card-checkout error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
