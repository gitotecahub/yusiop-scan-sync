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

interface SongRejectedProps {
  songTitle?: string
  artistName?: string
  reason?: string
  appUrl?: string
}

const SongRejectedEmail = ({
  songTitle = 'tu canción',
  artistName = 'Artista',
  reason = '',
  appUrl = 'https://yusiop.com',
}: SongRejectedProps) => {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{`"${songTitle}" necesita correcciones antes de publicarse`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Tu canción necesita correcciones</Heading>
          <Text style={text}>
            Hola <strong>{artistName}</strong>,
          </Text>
          <Text style={text}>
            Hemos revisado <strong>"{songTitle}"</strong> y no podemos publicarla todavía.
          </Text>

          {reason ? (
            <Section style={messageBox}>
              <Text style={messageLabel}>Motivo:</Text>
              <Text style={messageText}>{reason}</Text>
            </Section>
          ) : null}

          <Text style={text}>
            Puedes editar tu envío y volver a enviarlo a revisión desde el panel de artista.
          </Text>

          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button href={`${appUrl}/artist/submissions`} style={button}>
              Editar envío
            </Button>
          </Section>

          <Text style={footer}>
            Gracias por usar {SITE_NAME}.
            <br />
            El equipo de {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SongRejectedEmail,
  subject: (data: Record<string, any>) =>
    data?.songTitle
      ? `"${data.songTitle}" necesita correcciones`
      : `Tu canción necesita correcciones`,
  displayName: 'Canción rechazada',
  previewData: {
    songTitle: 'Mi nueva canción',
    artistName: 'Artista',
    reason: 'La calidad del audio es baja, sube un archivo a 320 kbps.',
    appUrl: 'https://yusiop.com',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}
const container: React.CSSProperties = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1: React.CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px' }
const text: React.CSSProperties = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const messageBox: React.CSSProperties = {
  background: '#FEF2F2',
  borderLeft: `4px solid #DC2626`,
  padding: '16px 20px',
  margin: '20px 0',
  borderRadius: '6px',
}
const messageLabel: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  color: '#DC2626',
  fontWeight: 600,
  margin: '0 0 6px',
  letterSpacing: '0.05em',
}
const messageText: React.CSSProperties = {
  fontSize: '15px',
  color: '#0F172A',
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
