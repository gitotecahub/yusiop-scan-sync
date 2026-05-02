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
import { normalizeLocale, t, tHtml, type EmailLocale } from './i18n.ts'

const SITE_NAME = 'Yusiop'
const BRAND_COLOR = '#9D5DFF'

interface Props {
  songTitle?: string
  primaryArtistName?: string
  collaboratorArtistName?: string
  sharePercent?: number
  role?: string
  appUrl?: string
  locale?: string
}

const CollaborationSubmitted = ({
  songTitle = 'una canción',
  primaryArtistName = 'un artista',
  collaboratorArtistName = 'tú',
  sharePercent = 0,
  role = 'collaborator',
  appUrl = 'https://yusiop.com',
  locale,
}: Props) => {
  const lang: EmailLocale = normalizeLocale(locale)
  const roleLabel = t(lang, `role.${role}`) || role
  const authUrl = `${appUrl}/auth`
  const vars = {
    songTitle,
    primary: primaryArtistName,
    role: roleLabel,
    share: sharePercent,
    site: SITE_NAME,
    authUrl,
  }
  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{t(lang, 'collabSub.preview', vars)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t(lang, 'collabSub.heading', vars)}</Heading>
          <Text style={text}>
            {t(lang, 'common.hello')} <strong>{collaboratorArtistName}</strong>,
          </Text>
          <Text style={text} dangerouslySetInnerHTML={tHtml(lang, 'collabSub.body1', vars)} />
          <Section style={infoBox}>
            <Text style={infoLabel}>{t(lang, 'collabSub.shareLabel')}</Text>
            <Text style={infoValue}>{t(lang, 'collabSub.shareValue', vars)}</Text>
            <Text style={infoLabel}>{t(lang, 'collabSub.roleLabel')}</Text>
            <Text style={infoValue}>{roleLabel}</Text>
          </Section>
          <Text style={text} dangerouslySetInnerHTML={tHtml(lang, 'collabSub.body2', vars)} />
          <Text style={text} dangerouslySetInnerHTML={tHtml(lang, 'collabSub.body3', vars)} />
          <Text style={footer}>
            {t(lang, 'collabSub.errorHint', vars)}
            <br />
            {t(lang, 'common.team', { site: SITE_NAME })}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CollaborationSubmitted,
  subject: (data: Record<string, any>) => {
    const lang: EmailLocale = normalizeLocale(data?.locale)
    const vars = {
      songTitle: data?.songTitle ?? '',
      primary: data?.primaryArtistName ?? '',
      share: data?.sharePercent ?? 0,
      site: SITE_NAME,
    }
    return data?.songTitle && data?.primaryArtistName
      ? t(lang, 'collabSub.subject_full', vars)
      : t(lang, 'collabSub.subject_default', vars)
  },
  displayName: 'Colaboración enviada a revisión (notificación)',
  previewData: {
    songTitle: 'Mi nueva canción',
    primaryArtistName: 'Diddyes',
    collaboratorArtistName: 'Kanteo',
    sharePercent: 30,
    role: 'featuring',
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
const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#94A3B8',
  margin: '32px 0 0',
  textAlign: 'center',
  lineHeight: '1.5',
}
