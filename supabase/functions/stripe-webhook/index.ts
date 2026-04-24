// Edge function: stripe-webhook
// Recibe eventos de Stripe:
//  - checkout.session.completed (mode=payment) → crea qr_card (compra de tarjeta).
//  - checkout.session.completed (mode=subscription) → crea/activa user_subscription.
//  - customer.subscription.updated/deleted → actualiza estado.
//  - invoice.payment_succeeded → renueva créditos del mes y actualiza periodo.
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // ===== Compras de tarjetas =====
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // ----- Modo subscription -----
      if (session.mode === "subscription") {
        const meta = session.metadata ?? {};
        const userId = meta.user_id;
        const planId = meta.plan_id;
        const monthlyDownloads = parseInt(meta.monthly_downloads ?? "0", 10);

        if (!userId || !planId) {
          console.warn("subscription session sin metadata válida");
          return new Response(JSON.stringify({ received: true }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const stripeSubId = session.subscription as string;
        let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        let customerId: string | null = null;
        try {
          const sub = await stripe.subscriptions.retrieve(stripeSubId);
          if (sub.current_period_end) {
            periodEnd = new Date(sub.current_period_end * 1000).toISOString();
          }
          customerId = (sub.customer as string) ?? null;
        } catch (e) {
          console.error("retrieve sub failed", e);
        }

        // Upsert por stripe_subscription_id
        const { data: existing } = await supabase
          .from("user_subscriptions")
          .select("id")
          .eq("stripe_subscription_id", stripeSubId)
          .maybeSingle();

        if (!existing) {
          await supabase.from("user_subscriptions").insert({
            user_id: userId,
            plan_id: planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd,
            renewal_date: periodEnd,
            downloads_remaining: monthlyDownloads,
            monthly_downloads: monthlyDownloads,
            stripe_subscription_id: stripeSubId,
            stripe_customer_id: customerId,
          });
        } else {
          await supabase.from("user_subscriptions").update({
            status: "active",
            current_period_end: periodEnd,
            renewal_date: periodEnd,
            downloads_remaining: monthlyDownloads,
          }).eq("id", existing.id);
        }

        console.log(`Suscripción activada user=${userId} plan=${meta.plan_code}`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ----- Modo payment (tarjetas) -----
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

      if (pErr) throw pErr;

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

      if (cErr) throw cErr;

      await supabase
        .from("card_purchases")
        .update({ qr_card_id: card.id })
        .eq("id", purchase.id);

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

    // ===== Renovación / pagos recurrentes =====
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.subscription as string | null;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const meta = sub.metadata ?? {};
        const monthlyDownloads = parseInt(meta.monthly_downloads ?? "0", 10);

        const { data: row } = await supabase
          .from("user_subscriptions")
          .select("id, monthly_downloads")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (row) {
          const credits = monthlyDownloads || row.monthly_downloads || 0;
          await supabase.from("user_subscriptions").update({
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd,
            renewal_date: periodEnd,
            downloads_remaining: credits,
            last_event_at: new Date().toISOString(),
          }).eq("id", row.id);
          console.log(`Renovación OK sub=${subId}`);
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from("user_subscriptions").update({
        cancel_at_period_end: sub.cancel_at_period_end,
        status: sub.status === "active" ? "active"
          : sub.status === "canceled" ? "cancelled"
          : sub.status === "past_due" ? "past_due"
          : "active",
        current_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : undefined,
      }).eq("stripe_subscription_id", sub.id);
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from("user_subscriptions").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      }).eq("stripe_subscription_id", sub.id);
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
