// Edge function: confirm-card-purchase
// Confirma una compra de tarjeta consultando Stripe directamente con session_id.
// Sirve como fallback al webhook: si la sesión está pagada, crea la qr_card e inserta card_purchases.
// Es idempotente: si ya se procesó esa sesión, devuelve la tarjeta existente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { notifyGiftRecipient } from "../_shared/notify-gift.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function genCode(prefix: string) {
  const rnd = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `${prefix}-${rnd}`;
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.session_id === "string" ? body.session_id : "";
    if (!sessionId.startsWith("cs_")) {
      return new Response(JSON.stringify({ error: "session_id inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role para escribir saltando RLS (validamos lógicamente quién es el comprador)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // 1) Idempotencia: ¿ya hay compra con esta session?
    const { data: existing } = await supabase
      .from("card_purchases")
      .select("id, qr_card_id, buyer_user_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existing && existing.qr_card_id) {
      const { data: card } = await supabase
        .from("qr_cards")
        .select("id, code, card_type, is_gift, redemption_token")
        .eq("id", existing.qr_card_id)
        .maybeSingle();
      return new Response(
        JSON.stringify({ success: true, already_processed: true, card }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Consultar la sesión en Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, payment_status: session.payment_status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const meta = session.metadata ?? {};
    const buyerUserId = meta.buyer_user_id || userId;
    if (buyerUserId !== userId) {
      // Solo el comprador puede confirmar su propia compra
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buyerEmail = meta.buyer_email || session.customer_email || userEmail;
    const cardType = (meta.card_type ?? "standard") as "standard" | "premium";
    const credits = parseInt(meta.download_credits ?? (cardType === "premium" ? "10" : "4"), 10);
    const isGift = meta.is_gift === "true";
    const giftEmail = meta.gift_recipient_email || null;
    const giftMessage = meta.gift_message || null;

    // 3) Insertar card_purchases (si no existía)
    let purchaseId = existing?.id;
    if (!purchaseId) {
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
      purchaseId = purchase.id;
    }

    // 4) Crear qr_card
    const code = genCode(cardType === "premium" ? "PREM" : "STD");
    const redemptionToken = isGift
      ? crypto.randomUUID().replace(/-/g, "")
      : null;

    const { data: card, error: cErr } = await supabase
      .from("qr_cards")
      .insert({
        code,
        origin: "digital",
        card_type: cardType,
        download_credits: credits,
        price_cents: session.amount_total ?? 0,
        currency: (session.currency ?? "eur").toUpperCase(),
        purchase_id: purchaseId,
        is_gift: isGift,
        gift_recipient_email: giftEmail,
        gift_message: giftMessage,
        redemption_token: redemptionToken,
        owner_user_id: isGift ? null : buyerUserId,
        activated_by: isGift ? null : buyerUserId,
        is_activated: !isGift,
        activated_at: isGift ? null : new Date().toISOString(),
      })
      .select()
      .single();
    if (cErr) throw cErr;

    await supabase
      .from("card_purchases")
      .update({ qr_card_id: card.id })
      .eq("id", purchaseId);

    console.log(`confirm-card-purchase: created card ${card.code} for user ${userId}`);

    // 5) Si es regalo: crear notificación in-app + enviar email al destinatario
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

    return new Response(
      JSON.stringify({
        success: true,
        card: {
          id: card.id,
          code: card.code,
          card_type: card.card_type,
          is_gift: card.is_gift,
          redemption_token: card.redemption_token,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("confirm-card-purchase error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
