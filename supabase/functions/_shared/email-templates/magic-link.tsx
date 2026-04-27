/// <reference types="npm:@types/react@18.3.1" />

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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu enlace de acceso a YUSIOP</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandHeader}>
          <Text style={brandMark}>
            <span style={brandY}>Y</span>USIOP
          </Text>
        </Section>
        <Heading style={h1}>Tu enlace de acceso</Heading>
        <Text style={text}>
          Haz clic en el botón para iniciar sesión en YUSIOP. Este enlace caduca en breve.
        </Text>
        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Iniciar sesión
          </Button>
        </Section>
        <Text style={footer}>
          Si no solicitaste este enlace, puedes ignorar este email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandHeader = { textAlign: 'center' as const, margin: '0 0 32px' }
const brandMark = { fontSize: '32px', fontWeight: 800 as const, letterSpacing: '0.05em', color: '#0a0a0f', margin: 0 }
const brandY = {
  background: 'linear-gradient(135deg, #9D5DFF 0%, #FF5DBA 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
}
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0a0a0f', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 18px' }
const button = {
  background: 'linear-gradient(135deg, #9D5DFF 0%, #FF5DBA 100%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700 as const,
  borderRadius: '999px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
