import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Yusiop'
const BRAND_COLOR = '#9D5DFF'

interface GiftReceivedProps {
  senderName?: string
  giftMessage?: string
  cardType?: 'standard' | 'premium'
  downloadCredits?: number
  redemptionUrl?: string
}

const GiftReceivedEmail = ({
  senderName,
  giftMessage,
  cardType = 'standard',
  downloadCredits = 4,
  redemptionUrl = 'https://yusiop.com',
}: GiftReceivedProps) => {
  const fromLabel = senderName ? senderName : 'Alguien especial'
  const cardLabel = cardType === 'premium' ? 'Premium' : 'Estándar'

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{`${fromLabel} te ha enviado una tarjeta ${SITE_NAME} ${cardLabel}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎁 Has recibido un regalo</Heading>
          <Text style={text}>
            <strong>{fromLabel}</strong> te ha enviado una tarjeta {SITE_NAME}{' '}
            <strong>{cardLabel}</strong> con <strong>{downloadCredits} descargas</strong>.
          </Text>

          {giftMessage ? (
            <Section style={messageBox}>
              <Text style={messageLabel}>Mensaje:</Text>
              <Text style={messageText}>"{giftMessage}"</Text>
            </Section>
          ) : null}

          <Text style={text}>
            Pulsa el botón para canjear tu regalo y empezar a descargar música.
          </Text>

          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button href={redemptionUrl} style={button}>
              Canjear regalo
            </Button>
          </Section>

          <Text style={footer}>
            Si no esperabas este regalo, puedes ignorar este correo.
            <br />
            Con cariño, el equipo de {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: GiftReceivedEmail,
  subject: (data: Record<string, any>) =>
    data?.senderName
      ? `${data.senderName} te ha enviado una tarjeta ${SITE_NAME}`
      : `Has recibido una tarjeta ${SITE_NAME}`,
  displayName: 'Regalo recibido',
  previewData: {
    senderName: 'Ana',
    giftMessage: '¡Disfruta la música! 🎶',
    cardType: 'premium',
    downloadCredits: 10,
    redemptionUrl: 'https://yusiop.com/redeem?token=demo',
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
  color: '#0F172A',
  margin: '0 0 20px',
}

const text: React.CSSProperties = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const messageBox: React.CSSProperties = {
  background: '#F8F5FF',
  borderLeft: `4px solid ${BRAND_COLOR}`,
  padding: '16px 20px',
  margin: '20px 0',
  borderRadius: '6px',
}

const messageLabel: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  color: BRAND_COLOR,
  fontWeight: 600,
  margin: '0 0 6px',
  letterSpacing: '0.05em',
}

const messageText: React.CSSProperties = {
  fontSize: '15px',
  color: '#0F172A',
  fontStyle: 'italic',
  margin: 0,
  lineHeight: '1.5',
}

const button: React.CSSProperties = {
  backgroundColor: BRAND_COLOR,
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#94A3B8',
  margin: '32px 0 0',
  textAlign: 'center',
  lineHeight: '1.5',
}
