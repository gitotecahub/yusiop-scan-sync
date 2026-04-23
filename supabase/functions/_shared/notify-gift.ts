// Helper compartido: notificar al destinatario de un regalo (in-app + email)
// Busca el usuario por email en auth.users (no en public.users que puede estar vacía).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface NotifyGiftArgs {
  admin: SupabaseClient;
  cardId: string;
  redemptionToken: string;
  giftEmail: string;
  giftMessage: string | null;
  cardType: "standard" | "premium";
  credits: number;
  buyerEmail: string;
  origin: string;
}

export async function notifyGiftRecipient(args: NotifyGiftArgs) {
  const {
    admin,
    cardId,
    redemptionToken,
    giftEmail,
    giftMessage,
    cardType,
    credits,
    buyerEmail,
    origin,
  } = args;

  const redemptionUrl = `${origin}/redeem/${redemptionToken}`;
  const normalizedEmail = giftEmail.toLowerCase().trim();

  // 1) Buscar al destinatario en auth.users (paginado, máx 1000 por página)
  let recipientId: string | null = null;
  try {
    let page = 1;
    while (page <= 10 && !recipientId) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        console.error("notifyGift: listUsers error", error);
        break;
      }
      const match = data.users.find(
        (u) => (u.email ?? "").toLowerCase() === normalizedEmail,
      );
      if (match) recipientId = match.id;
      if (data.users.length < 1000) break;
      page++;
    }
  } catch (e) {
    console.error("notifyGift: error buscando destinatario", e);
  }

  // 2) Crear notificación in-app si está registrado
  if (recipientId) {
    const { error: nErr } = await admin.from("notifications").insert({
      user_id: recipientId,
      type: "gift_received",
      title: "🎁 Has recibido un regalo",
      body: giftMessage
        ? `Mensaje: "${giftMessage}"`
        : `Tarjeta ${cardType} con ${credits} descargas`,
      data: {
        qr_card_id: cardId,
        redemption_token: redemptionToken,
        card_type: cardType,
        download_credits: credits,
        sender_email: buyerEmail,
        gift_message: giftMessage,
        redemption_url: redemptionUrl,
      },
    });
    if (nErr) console.error("notifyGift: insert notification error", nErr);
    else console.log(`notifyGift: notificación creada para ${normalizedEmail} (${recipientId})`);
  } else {
    console.log(`notifyGift: ${normalizedEmail} no está registrado, solo email`);
  }

  // 3) Enviar email transaccional (siempre, esté o no registrado)
  try {
    const { error: eErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "gift-received",
        recipientEmail: giftEmail,
        idempotencyKey: `gift-${cardId}`,
        templateData: {
          senderName: buyerEmail.split("@")[0],
          giftMessage,
          cardType,
          downloadCredits: credits,
          redemptionUrl,
        },
      },
    });
    if (eErr) console.error("notifyGift: send-email error", eErr);
    else console.log(`notifyGift: email encolado para ${normalizedEmail}`);
  } catch (e) {
    console.error("notifyGift: invoke send-transactional-email failed", e);
  }

  return { recipientId, redemptionUrl };
}
