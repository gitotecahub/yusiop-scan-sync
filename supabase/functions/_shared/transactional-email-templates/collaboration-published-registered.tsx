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

interface Props {
  songTitle?: string
  primaryArtistName?: string
  collaboratorArtistName?: string
  sharePercent?: number
  role?: string
  appUrl?: string
}

const CollaborationPublishedRegistered = ({
  songTitle = 'una canción',
  primaryArtistName = 'el artista principal',
  collaboratorArtistName = 'tú',
  sharePercent = 0,
  role = 'colaborador',
  appUrl = 'https://yusiop.com',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Te han incluido en "${songTitle}" en ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎤 Tienes una nueva colaboración</Heading>
        <Text style={text}>
          Hola <strong>{collaboratorArtistName}</strong>,
        </Text>
        <Text style={text}>
          <strong>{primaryArtistName}</strong> te ha incluido como{' '}
          <strong>{role}</strong> en su nueva canción{' '}
          <strong>"{songTitle}"</strong>, que ya está publicada en {SITE_NAME}.
        </Text>
        <Text style={text}>
          Tienes un <strong>{sharePercent}%</strong> de los splits. Entra en
          tu panel de artista y reclama tu parte para empezar a recibir tu
          monetización.
        </Text>
        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Button href={`${appUrl}/artist/collaborations`} style={button}>
            Reclamar mi parte
          </Button>
        </Section>
        <Text style={footer}>
          Si crees que esto es un error, ignora este email.
          <br />
          El equipo de {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CollaborationPublishedRegistered,
  subject: (data: Record<string, any>) =>
    data?.songTitle
      ? `🎤 Estás en "${data.songTitle}" — reclama tu parte en ${SITE_NAME}`
      : `Tienes una nueva colaboración en ${SITE_NAME}`,
  displayName: 'Colaboración publicada (usuario registrado)',
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
