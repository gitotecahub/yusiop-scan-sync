// Edge function: stripe-webhook
// Recibe eventos de Stripe (checkout.session.completed) y genera la tarjeta digital.
// Si es regalo: crea una qr_card con redemption_token y la asocia al destinatario por email.
// Si es compra normal: crea la qr_card asignada al comprador y la marca como activada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { notifyGiftRecipient } from "../_shared/notify-gift.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function genCode(prefix: string) {
  const rnd = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `${prefix}-${rnd}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response(
      JSON.stringify({
        error: "Stripe no configurado. Añade STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response(
      JSON.stringify({ error: `Invalid signature: ${(err as Error).message}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Service role para escribir en tablas independientemente de RLS
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};

      const buyerUserId = meta.buyer_user_id;
      const buyerEmail = meta.buyer_email ?? session.customer_email ?? "";
      const cardType = (meta.card_type ?? "standard") as "standard" | "premium";
      const credits = parseInt(meta.download_credits ?? "4", 10);
      const isGift = meta.is_gift === "true";
      const giftEmail = meta.gift_recipient_email || null;
      const giftMessage = meta.gift_message || null;

      if (!buyerUserId) {
        console.warn("Webhook sin buyer_user_id en metadata");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1) Registrar la compra
      const { data: purchase, error: pErr } = await supabase
        .from("card_purchases")
        .insert({
          buyer_user_id: buyerUserId,
          buyer_email: buyerEmail,
          card_type: cardType,
          download_credits: credits,
          amount_cents: session.amount_total ?? 0,
          currency: (session.currency ?? "eur").toUpperCase(),
          status: "paid",
          stripe_session_id: session.id,
          stripe_payment_intent: (session.payment_intent as string) ?? null,
          is_gift: isGift,
          gift_recipient_email: giftEmail,
          gift_message: giftMessage,
        })
        .select()
        .single();

      if (pErr) {
        console.error("Error insertando card_purchases", pErr);
        throw pErr;
      }

      // 2) Crear la qr_card digital
      const code = genCode(cardType === "premium" ? "PREM" : "STD");
      const redemptionToken = isGift
        ? crypto.randomUUID().replace(/-/g, "")
        : null;

      const cardInsert = {
        code,
        origin: "digital" as const,
        card_type: cardType,
        download_credits: credits,
        price_cents: session.amount_total ?? 0,
        currency: (session.currency ?? "eur").toUpperCase(),
        purchase_id: purchase.id,
        is_gift: isGift,
        gift_recipient_email: giftEmail,
        gift_message: giftMessage,
        redemption_token: redemptionToken,
        // Si es regalo: queda sin owner hasta canjearse
        owner_user_id: isGift ? null : buyerUserId,
        activated_by: isGift ? null : buyerUserId,
        is_activated: !isGift,
        activated_at: isGift ? null : new Date().toISOString(),
      };

      const { data: card, error: cErr } = await supabase
        .from("qr_cards")
        .insert(cardInsert)
        .select()
        .single();

      if (cErr) {
        console.error("Error insertando qr_cards", cErr);
        throw cErr;
      }

      // 3) Vincular la card a la compra
      await supabase
        .from("card_purchases")
        .update({ qr_card_id: card.id })
        .eq("id", purchase.id);

      console.log(
        `Tarjeta creada ${card.code} (${cardType}) - gift=${isGift} token=${redemptionToken}`,
      );

      // Notificar al destinatario si es regalo
      if (isGift && giftEmail && redemptionToken) {
        const origin = req.headers.get("origin") ?? "https://yusiop.com";
        await notifyGiftRecipient({
          admin: supabase,
          cardId: card.id,
          redemptionToken,
          giftEmail,
          giftMessage,
          cardType,
          credits,
          buyerEmail,
          origin,
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook handler error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
