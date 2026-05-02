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
import { normalizeLocale, t, tHtml, type EmailLocale } from './i18n.ts'

function parseReason(raw: string): string[] {
  const text = (raw ?? '').trim()
  if (!text) return []
  let parts = text.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length === 1) {
    const inline = parts[0]
      .split(/\s*(?:[•·]|(?:^|\s)-\s|(?:^|\s)\*\s|;\s|\|\s)/g)
      .map((s) => s.trim())
      .filter(Boolean)
    if (inline.length > 1) parts = inline
  }
  if (parts.length === 1 && parts[0].length > 90) {
    const sentences = parts[0]
      .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ])/g)
      .map((s) => s.trim())
      .filter(Boolean)
    if (sentences.length > 1) parts = sentences
  }
  return parts.map((p) => p.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, '').trim()).filter(Boolean)
}

const SITE_NAME = 'Yusiop'
const BRAND_COLOR = '#9D5DFF'

interface SongRejectedProps {
  songTitle?: string
  artistName?: string
  reason?: string
  appUrl?: string
  locale?: string
}

const SongRejectedEmail = ({
  songTitle = 'tu canción',
  artistName = 'Artista',
  reason = '',
  appUrl = 'https://yusiop.com',
  locale,
}: SongRejectedProps) => {
  const lang: EmailLocale = normalizeLocale(locale)
  const vars = { songTitle, site: SITE_NAME }
  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{t(lang, 'songRejected.preview', vars)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t(lang, 'songRejected.heading')}</Heading>
          <Text style={text}>
            {t(lang, 'common.hello')} <strong>{artistName}</strong>,
          </Text>
          <Text style={text} dangerouslySetInnerHTML={tHtml(lang, 'songRejected.body', vars)} />

          {reason ? (() => {
            const items = parseReason(reason)
            const list = items.length > 0 ? items : [reason]
            return (
              <Section style={messageBox}>
                <Text style={messageLabel}>{t(lang, 'songRejected.reasonsLabel')}</Text>
                <ul style={listStyle}>
                  {list.map((it, i) => (
                    <li key={i} style={listItem}>{it}</li>
                  ))}
                </ul>
              </Section>
            )
          })() : null}

          <Text style={text}>{t(lang, 'songRejected.editHint')}</Text>

          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button href={`${appUrl}/artist/submissions`} style={button}>
              {t(lang, 'songRejected.cta')}
            </Button>
          </Section>

          <Text style={footer}>
            {t(lang, 'common.thanks_using')} {SITE_NAME}.
            <br />
            {t(lang, 'common.team', { site: SITE_NAME })}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SongRejectedEmail,
  subject: (data: Record<string, any>) => {
    const lang: EmailLocale = normalizeLocale(data?.locale)
    const vars = { songTitle: data?.songTitle ?? '', site: SITE_NAME }
    return data?.songTitle
      ? t(lang, 'songRejected.subject_with_title', vars)
      : t(lang, 'songRejected.subject_default', vars)
  },
  displayName: 'Canción rechazada',
  previewData: {
    songTitle: 'Mi nueva canción',
    artistName: 'Artista',
    reason: 'La calidad del audio es baja, sube un archivo a 320 kbps.\nLa portada no cumple las dimensiones mínimas (mínimo 1000x1000).\nEl título contiene errores tipográficos.',
    appUrl: 'https://yusiop.com',
    locale: 'es',
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
const listStyle: React.CSSProperties = {
  margin: '4px 0 0',
  paddingLeft: '20px',
  color: '#0F172A',
  fontSize: '15px',
  lineHeight: '1.6',
}
const listItem: React.CSSProperties = {
  marginBottom: '4px',
}
