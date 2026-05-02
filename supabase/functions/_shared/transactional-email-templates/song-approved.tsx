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

const SITE_NAME = 'Yusiop'
const BRAND_COLOR = '#9D5DFF'

interface SongApprovedProps {
  songTitle?: string
  artistName?: string
  appUrl?: string
  locale?: string
}

const SongApprovedEmail = ({
  songTitle = 'tu canción',
  artistName = 'Artista',
  appUrl = 'https://yusiop.com',
  locale,
}: SongApprovedProps) => {
  const lang: EmailLocale = normalizeLocale(locale)
  const vars = { songTitle, site: SITE_NAME }
  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{t(lang, 'songApproved.preview', vars)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t(lang, 'songApproved.heading')}</Heading>
          <Text style={text}>
            {t(lang, 'common.hello')} <strong>{artistName}</strong>,
          </Text>
          <Text style={text} dangerouslySetInnerHTML={tHtml(lang, 'songApproved.body', vars)} />
          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button href={appUrl} style={button}>
              {t(lang, 'songApproved.cta', vars)}
            </Button>
          </Section>
          <Text style={footer}>
            {t(lang, 'common.thanks_music')}
            <br />
            {t(lang, 'common.team', vars)}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SongApprovedEmail,
  subject: (data: Record<string, any>) => {
    const lang: EmailLocale = normalizeLocale(data?.locale)
    const vars = { songTitle: data?.songTitle ?? '', site: SITE_NAME }
    return data?.songTitle
      ? t(lang, 'songApproved.subject_with_title', vars)
      : t(lang, 'songApproved.subject_default', vars)
  },
  displayName: 'Canción aprobada',
  previewData: {
    songTitle: 'Mi nueva canción',
    artistName: 'Artista',
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
