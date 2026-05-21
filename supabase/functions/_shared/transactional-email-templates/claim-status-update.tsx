import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Yusiop'
const BRAND_COLOR = '#9D5DFF'

interface Props {
  artistName?: string
  songTitle?: string
  participationType?: string
  status?: string // 'under_review' | 'rejected' | 'disputed' | 'blocked'
  reason?: string
  adminNote?: string
  appUrl?: string
}

const STATUS_LABEL: Record<string, string> = {
  under_review: 'En revisión',
  rejected: 'Rechazada',
  disputed: 'En disputa',
  blocked: 'Bloqueada',
  pending: 'Pendiente',
}

const ClaimStatusUpdateEmail = ({
  artistName = 'Artista',
  songTitle = 'una canción',
  participationType = 'colaboración',
  status = 'under_review',
  reason,
  adminNote,
  appUrl = 'https://yusiop.com',
}: Props) => {
  const label = STATUS_LABEL[status] ?? status
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Tu reclamación cambió de estado: {label}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Estado de tu reclamación: {label}</Heading>
          <Text style={text}>Hola <strong>{artistName}</strong>,</Text>
          <Text style={text}>
            Tu reclamación de <strong>{participationType}</strong> sobre <strong>{songTitle}</strong> ha pasado al estado <strong>{label}</strong>.
          </Text>
          {(reason || adminNote) && (
            <Section style={info}>
              {reason && <Text style={infoText}><strong>Motivo:</strong> {reason}</Text>}
              {adminNote && <Text style={infoText}><strong>Nota del equipo:</strong> {adminNote}</Text>}
            </Section>
          )}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={`${appUrl}/artist/claim-collab`} style={button}>Ver mis reclamaciones</Button>
          </Section>
          <Text style={footer}>El equipo de {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ClaimStatusUpdateEmail,
  subject: (d: Record<string, any>) => {
    const label = STATUS_LABEL[d?.status] ?? 'actualizada'
    return `Tu reclamación: ${label}`
  },
  displayName: 'Cambio de estado de reclamación',
  previewData: { artistName: 'María', songTitle: 'Mi canción', participationType: 'voz principal', status: 'under_review', adminNote: 'Necesitamos un documento adicional.', appUrl: 'https://yusiop.com' },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container: React.CSSProperties = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1: React.CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px' }
const text: React.CSSProperties = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const info: React.CSSProperties = { background: '#F8FAFC', border: `1px solid ${BRAND_COLOR}33`, borderRadius: 8, padding: 16, margin: '16px 0' }
const infoText: React.CSSProperties = { fontSize: 13, color: '#475569', margin: '0 0 8px', lineHeight: 1.5 }
const button: React.CSSProperties = { backgroundColor: BRAND_COLOR, color: '#ffffff', padding: '14px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const footer: React.CSSProperties = { fontSize: 12, color: '#94A3B8', margin: '32px 0 0', textAlign: 'center' }
