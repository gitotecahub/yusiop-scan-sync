// Helper compartido: enviar recibo/factura de compra de tarjeta al comprador.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface ReceiptArgs {
  admin: SupabaseClient;
  purchaseId: string;
  buyerEmail: string;
  cardType: "standard" | "premium";
  credits: number;
  cardCode?: string | null;
  amountCents: number;
  currency: string;
  isGift?: boolean;
  giftRecipientEmail?: string | null;
  locale?: string;
}

export async function sendPurchaseReceipt(args: ReceiptArgs) {
  const {
    admin, purchaseId, buyerEmail, cardType, credits, cardCode,
    amountCents, currency, isGift, giftRecipientEmail, locale,
  } = args;

  if (!buyerEmail) {
    console.warn("sendPurchaseReceipt: sin email de comprador, se omite");
    return;
  }

  try {
    const { error } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "purchase-receipt",
        recipientEmail: buyerEmail,
        // idempotente por compra: evita recibos duplicados (webhook + fallback)
        idempotencyKey: `receipt-${purchaseId}`,
        templateData: {
          receiptNumber: `YS-${String(purchaseId).slice(0, 8).toUpperCase()}`,
          purchaseDate: new Date().toISOString(),
          cardType,
          downloadCredits: credits,
          cardCode: cardCode ?? null,
          amountCents,
          currency,
          buyerEmail,
          isGift: !!isGift,
          giftRecipientEmail: giftRecipientEmail ?? null,
          locale: locale ?? "es",
        },
      },
    });
    if (error) console.error("sendPurchaseReceipt: error", error);
    else console.log(`sendPurchaseReceipt: recibo encolado para ${buyerEmail}`);
  } catch (e) {
    console.error("sendPurchaseReceipt: invoke failed", e);
  }
}
