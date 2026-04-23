// Edge function: simulate-card-purchase
// Simula una compra completa SIN pasar por Stripe. Crea card_purchases + qr_cards
// y la asocia al usuario (o al destinatario si es regalo). Solo para pruebas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { notifyGiftRecipient } from "../_shared/notify-gift.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  card_type: "standard" | "premium";
  is_gift?: boolean;
  gift_recipient_email?: string;
  gift_message?: string;
}

const PRICING = {
  standard: { amount_cents: 499, credits: 4 },
  premium: { amount_cents: 999, credits: 10 },
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email as string;

    const body = (await req.json()) as Body;
    if (!body.card_type || !["standard", "premium"].includes(body.card_type)) {
      return new Response(JSON.stringify({ error: "card_type inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.is_gift && (!body.gift_recipient_email || !body.gift_recipient_email.includes("@"))) {
      return new Response(
        JSON.stringify({ error: "Email del destinatario inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tier = PRICING[body.card_type];
    const isGift = !!body.is_gift;

    // Service role para escribir saltando RLS
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // 1) Registrar la compra simulada
    const { data: purchase, error: pErr } = await admin
      .from("card_purchases")
      .insert({
        buyer_user_id: userId,
        buyer_email: userEmail,
        card_type: body.card_type,
        download_credits: tier.credits,
        amount_cents: tier.amount_cents,
        currency: "EUR",
        status: "paid",
        stripe_session_id: `sim_${crypto.randomUUID()}`,
        is_gift: isGift,
        gift_recipient_email: isGift ? body.gift_recipient_email : null,
        gift_message: isGift ? (body.gift_message ?? null) : null,
      })
      .select()
      .single();

    if (pErr) {
      console.error("Error insertando card_purchases", pErr);
      throw pErr;
    }

    // 2) Crear la qr_card digital
    const code = genCode(body.card_type === "premium" ? "PREM" : "STD");
    const redemptionToken = isGift
      ? crypto.randomUUID().replace(/-/g, "")
      : null;

    const { data: card, error: cErr } = await admin
      .from("qr_cards")
      .insert({
        code,
        origin: "digital",
        card_type: body.card_type,
        download_credits: tier.credits,
        price_cents: tier.amount_cents,
        currency: "EUR",
        purchase_id: purchase.id,
        is_gift: isGift,
        gift_recipient_email: isGift ? body.gift_recipient_email : null,
        gift_message: isGift ? (body.gift_message ?? null) : null,
        redemption_token: redemptionToken,
        owner_user_id: isGift ? null : userId,
        activated_by: isGift ? null : userId,
        is_activated: !isGift,
        activated_at: isGift ? null : new Date().toISOString(),
      })
      .select()
      .single();

    if (cErr) {
      console.error("Error insertando qr_cards", cErr);
      throw cErr;
    }

    await admin
      .from("card_purchases")
      .update({ qr_card_id: card.id })
      .eq("id", purchase.id);

    console.log(`[SIM] Tarjeta creada ${card.code} gift=${isGift} token=${redemptionToken}`);

    // Notificar al destinatario si es regalo
    if (isGift && body.gift_recipient_email && redemptionToken) {
      const origin = req.headers.get("origin") ?? "https://yusiop.com";
      await notifyGiftRecipient({
        admin,
        cardId: card.id,
        redemptionToken,
        giftEmail: body.gift_recipient_email,
        giftMessage: body.gift_message ?? null,
        cardType: body.card_type,
        credits: tier.credits,
        buyerEmail: userEmail,
        origin,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        card_id: card.id,
        code: card.code,
        is_gift: isGift,
        redemption_token: redemptionToken,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("simulate-card-purchase error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
