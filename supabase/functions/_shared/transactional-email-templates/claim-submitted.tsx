import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Yusiop'
const BRAND_COLOR = '#9D5DFF'

interface Props {
  artistName?: string
  songTitle?: string
  participationType?: string
}

const ClaimSubmittedEmail = ({ artistName = 'Artista', songTitle = 'una canción', participationType = 'colaboración' }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Hemos recibido tu reclamación de colaboración</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reclamación recibida</Heading>
        <Text style={text}>Hola <strong>{artistName}</strong>,</Text>
        <Text style={text}>
          Hemos recibido tu reclamación de <strong>{participationType}</strong> sobre <strong>{songTitle}</strong>.
          Nuestro equipo la revisará lo antes posible.
        </Text>
        <Section style={info}>
          <Text style={infoText}>
            Mientras tanto, asegúrate de que tu perfil de artista esté verificado y de que tus enlaces oficiales estén actualizados. Eso acelera la aprobación.
          </Text>
        </Section>
        <Text style={footer}>El equipo de {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ClaimSubmittedEmail,
  subject: 'Hemos recibido tu reclamación',
  displayName: 'Reclamación recibida',
  previewData: { artistName: 'María', songTitle: 'Mi canción', participationType: 'voz principal' },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container: React.CSSProperties = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1: React.CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px' }
const text: React.CSSProperties = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const info: React.CSSProperties = { background: '#F8FAFC', border: `1px solid ${BRAND_COLOR}33`, borderRadius: 8, padding: 16, margin: '16px 0' }
const infoText: React.CSSProperties = { fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 }
const footer: React.CSSProperties = { fontSize: 12, color: '#94A3B8', margin: '32px 0 0', textAlign: 'center' }
