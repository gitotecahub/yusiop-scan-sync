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
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Yusiop'
const BRAND_COLOR = '#9D5DFF'

interface Props {
  songTitle?: string
  primaryArtistName?: string
  collaboratorArtistName?: string
  sharePercent?: number
  role?: string
  appUrl?: string
}

const ROLE_LABELS: Record<string, string> = {
  featuring: 'featuring',
  producer: 'productor',
  performer: 'intérprete',
  composer: 'compositor',
  remix: 'remix',
}

const CollaborationSubmitted = ({
  songTitle = 'una canción',
  primaryArtistName = 'un artista',
  collaboratorArtistName = 'tú',
  sharePercent = 0,
  role = 'colaborador',
  appUrl = 'https://yusiop.com',
}: Props) => {
  const roleLabel = ROLE_LABELS[role] ?? role
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{`${primaryArtistName} te ha incluido en "${songTitle}" — ${sharePercent}% para ti`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎶 Estás en una nueva colaboración en {SITE_NAME}</Heading>
          <Text style={text}>
            Hola <strong>{collaboratorArtistName}</strong>,
          </Text>
          <Text style={text}>
            <strong>{primaryArtistName}</strong> acaba de enviar a revisión su
            nueva canción <strong>"{songTitle}"</strong> en {SITE_NAME} y te ha
            incluido como <strong>{roleLabel}</strong>.
          </Text>
          <Section style={infoBox}>
            <Text style={infoLabel}>Tu participación acordada</Text>
            <Text style={infoValue}>{sharePercent}% de los splits</Text>
            <Text style={infoLabel}>Rol</Text>
            <Text style={infoValue}>{roleLabel}</Text>
          </Section>
          <Text style={text}>
            La canción está siendo revisada por nuestro equipo. Cuando se
            publique, tu parte quedará reservada en el pozo común hasta que la
            reclames con tu cuenta de artista en {SITE_NAME}.
          </Text>
          <Text style={text}>
            Si no tienes cuenta de artista todavía, podrás registrarte en{' '}
            <a href={`${appUrl}/auth`} style={link}>{appUrl}</a> para reclamarla
            cuando se publique.
          </Text>
          <Text style={footer}>
            Si crees que esto es un error o no conoces a {primaryArtistName},
            puedes ignorar este email.
            <br />
            El equipo de {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CollaborationSubmitted,
  subject: (data: Record<string, any>) =>
    data?.songTitle && data?.primaryArtistName
      ? `🎶 ${data.primaryArtistName} te incluyó en "${data.songTitle}" (${data.sharePercent ?? 0}%)`
      : `Tienes una nueva colaboración en ${SITE_NAME}`,
  displayName: 'Colaboración enviada a revisión (notificación)',
  previewData: {
    songTitle: 'Mi nueva canción',
    primaryArtistName: 'Diddyes',
    collaboratorArtistName: 'Kanteo',
    sharePercent: 30,
    role: 'featuring',
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
const infoBox: React.CSSProperties = {
  backgroundColor: '#F8F5FF',
  border: `1px solid ${BRAND_COLOR}33`,
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '20px 0',
}
const infoLabel: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#64748B',
  margin: '0 0 4px',
}
const infoValue: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: BRAND_COLOR,
  margin: '0 0 12px',
}
const link: React.CSSProperties = { color: BRAND_COLOR, textDecoration: 'underline' }
const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#94A3B8',
  margin: '32px 0 0',
  textAlign: 'center',
  lineHeight: '1.5',
}
