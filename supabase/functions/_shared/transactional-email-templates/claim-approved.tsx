import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Yusiop'
const BRAND_COLOR = '#9D5DFF'

interface Props {
  artistName?: string
  songTitle?: string
  participationType?: string
  appUrl?: string
}

const ClaimApprovedEmail = ({ artistName = 'Artista', songTitle = 'una canción', participationType = 'colaboración', appUrl = 'https://yusiop.com' }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu reclamación ha sido aprobada</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 Reclamación aprobada</Heading>
        <Text style={text}>Hola <strong>{artistName}</strong>,</Text>
        <Text style={text}>
          Tu reclamación de <strong>{participationType}</strong> sobre <strong>{songTitle}</strong> ha sido <strong>aprobada</strong>.
          Tus ganancias relacionadas se desbloquearán y podrás retirarlas según el calendario habitual.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={`${appUrl}/artist/wallet`} style={button}>Ver mi wallet</Button>
        </Section>
        <Text style={footer}>El equipo de {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ClaimApprovedEmail,
  subject: 'Reclamación aprobada',
  displayName: 'Reclamación aprobada',
  previewData: { artistName: 'María', songTitle: 'Mi canción', participationType: 'voz principal', appUrl: 'https://yusiop.com' },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container: React.CSSProperties = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1: React.CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px' }
const text: React.CSSProperties = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const button: React.CSSProperties = { backgroundColor: BRAND_COLOR, color: '#ffffff', padding: '14px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const footer: React.CSSProperties = { fontSize: 12, color: '#94A3B8', margin: '32px 0 0', textAlign: 'center' }
