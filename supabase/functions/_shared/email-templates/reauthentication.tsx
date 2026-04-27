/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación YUSIOP</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandHeader}>
          <Text style={brandMark}>
            <span style={brandY}>Y</span>USIOP
          </Text>
        </Section>
        <Heading style={h1}>Confirma tu identidad</Heading>
        <Text style={text}>Usa el código siguiente para confirmar tu identidad:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Este código caduca en breve. Si no lo solicitaste, ignora este email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', textAlign: 'center' as const }
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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 800 as const,
  letterSpacing: '0.2em',
  color: '#9D5DFF',
  margin: '20px 0 30px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
