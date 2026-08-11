/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { normalizeLocale, type EmailLocale } from './i18n.ts'

const SITE_NAME = 'Yusiop'
const BRAND_COLOR = '#9D5DFF'

interface ReceiptProps {
  receiptNumber?: string
  purchaseDate?: string
  cardType?: 'standard' | 'premium'
  downloadCredits?: number
  cardCode?: string
  amountCents?: number
  currency?: string
  buyerEmail?: string
  isGift?: boolean
  giftRecipientEmail?: string | null
  locale?: string
}

const STRINGS: Record<EmailLocale, Record<string, string>> = {
  es: {
    preview: 'Tu recibo de compra en Yusiop',
    heading: '🧾 Recibo de compra',
    intro: 'Gracias por tu compra. Aquí tienes el detalle de tu pedido.',
    receiptNo: 'Nº de recibo',
    date: 'Fecha',
    concept: 'Concepto',
    credits: 'Descargas incluidas',
    code: 'Código de tarjeta',
    total: 'Total pagado',
    buyer: 'Comprador',
    gift: 'Tarjeta regalo enviada a',
    card: 'Tarjeta',
    standard: 'Estándar',
    premium: 'Premium',
    footer: 'Este correo sirve como justificante de compra. Conserva este recibo.',
    regards: 'El equipo de',
    subject: 'Tu recibo de compra en Yusiop',
  },
  en: {
    preview: 'Your Yusiop purchase receipt',
    heading: '🧾 Purchase receipt',
    intro: 'Thanks for your purchase. Here are your order details.',
    receiptNo: 'Receipt no.',
    date: 'Date',
    concept: 'Item',
    credits: 'Downloads included',
    code: 'Card code',
    total: 'Total paid',
    buyer: 'Buyer',
    gift: 'Gift card sent to',
    card: 'Card',
    standard: 'Standard',
    premium: 'Premium',
    footer: 'This email serves as your proof of purchase. Please keep it.',
    regards: 'The team at',
    subject: 'Your Yusiop purchase receipt',
  },
  fr: {
    preview: 'Votre reçu d’achat Yusiop',
    heading: '🧾 Reçu d’achat',
    intro: 'Merci pour votre achat. Voici le détail de votre commande.',
    receiptNo: 'N° de reçu',
    date: 'Date',
    concept: 'Article',
    credits: 'Téléchargements inclus',
    code: 'Code de la carte',
    total: 'Total payé',
    buyer: 'Acheteur',
    gift: 'Carte cadeau envoyée à',
    card: 'Carte',
    standard: 'Standard',
    premium: 'Premium',
    footer: 'Cet e-mail constitue votre justificatif d’achat. Conservez-le.',
    regards: 'L’équipe',
    subject: 'Votre reçu d’achat Yusiop',
  },
  pt: {
    preview: 'O seu recibo de compra na Yusiop',
    heading: '🧾 Recibo de compra',
    intro: 'Obrigado pela sua compra. Aqui estão os detalhes do pedido.',
    receiptNo: 'Nº do recibo',
    date: 'Data',
    concept: 'Item',
    credits: 'Downloads incluídos',
    code: 'Código do cartão',
    total: 'Total pago',
    buyer: 'Comprador',
    gift: 'Cartão presente enviado para',
    card: 'Cartão',
    standard: 'Padrão',
    premium: 'Premium',
    footer: 'Este e-mail serve como comprovativo de compra. Guarde-o.',
    regards: 'A equipa da',
    subject: 'O seu recibo de compra na Yusiop',
  },
}

function formatAmount(cents: number, currency: string, lang: EmailLocale) {
  try {
    return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

const PurchaseReceiptEmail = ({
  receiptNumber = '—',
  purchaseDate,
  cardType = 'standard',
  downloadCredits = 4,
  cardCode,
  amountCents = 0,
  currency = 'EUR',
  buyerEmail,
  isGift = false,
  giftRecipientEmail,
  locale,
}: ReceiptProps) => {
  const lang: EmailLocale = normalizeLocale(locale)
  const s = STRINGS[lang]
  const cardLabel = cardType === 'premium' ? s.premium : s.standard
  const dateLabel = purchaseDate
    ? new Date(purchaseDate).toLocaleDateString(lang, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : ''

  const line = (label: string, value: string) => (
    <Row style={{ marginBottom: '6px' }}>
      <Column style={cellLabel}>{label}</Column>
      <Column style={cellValue}>{value}</Column>
    </Row>
  )

  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{s.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{s.heading}</Heading>
          <Text style={text}>{s.intro}</Text>

          <Section style={box}>
            {line(s.receiptNo, receiptNumber)}
            {dateLabel ? line(s.date, dateLabel) : null}
            {line(s.concept, `${s.card} ${SITE_NAME} ${cardLabel}`)}
            {line(s.credits, String(downloadCredits))}
            {cardCode ? line(s.code, cardCode) : null}
            {buyerEmail ? line(s.buyer, buyerEmail) : null}
            {isGift && giftRecipientEmail ? line(s.gift, giftRecipientEmail) : null}
            <Hr style={hr} />
            <Row>
              <Column style={cellLabel}>{s.total}</Column>
              <Column style={{ ...cellValue, fontWeight: 700, color: BRAND_COLOR }}>
                {formatAmount(amountCents, currency, lang)}
              </Column>
            </Row>
          </Section>

          <Text style={footer}>
            {s.footer}
            <br />
            {s.regards} {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PurchaseReceiptEmail,
  subject: (data: Record<string, any>) => {
    const lang: EmailLocale = normalizeLocale(data?.locale)
    const num = data?.receiptNumber ? ` · ${data.receiptNumber}` : ''
    return `${STRINGS[lang].subject}${num}`
  },
  displayName: 'Recibo de compra',
  previewData: {
    receiptNumber: 'YS-2026-0001',
    purchaseDate: new Date().toISOString(),
    cardType: 'premium',
    downloadCredits: 10,
    cardCode: 'PREM-A1B2C3D4E5F6',
    amountCents: 990,
    currency: 'EUR',
    buyerEmail: 'ana@example.com',
    locale: 'es',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container: React.CSSProperties = {
  padding: '32px 24px',
  maxWidth: '560px',
  margin: '0 auto',
}

const h1: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#111111',
  margin: '0 0 16px',
}

const text: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#333333',
}

const box: React.CSSProperties = {
  border: '1px solid #eeeeee',
  borderRadius: '12px',
  padding: '20px',
  margin: '20px 0',
}

const cellLabel: React.CSSProperties = {
  fontSize: '13px',
  color: '#777777',
  width: '50%',
  padding: '4px 0',
}

const cellValue: React.CSSProperties = {
  fontSize: '13px',
  color: '#111111',
  textAlign: 'right',
  padding: '4px 0',
}

const hr: React.CSSProperties = {
  borderColor: '#eeeeee',
  margin: '14px 0',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '20px',
  color: '#888888',
  marginTop: '24px',
}
