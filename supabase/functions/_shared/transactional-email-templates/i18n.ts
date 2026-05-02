// Diccionario de traducciones para emails transaccionales.
// Idiomas soportados: es (default), en, fr, pt.
// Cada plantilla usa un namespace distinto para evitar colisiones.

export type EmailLocale = 'es' | 'en' | 'fr' | 'pt'

export const SUPPORTED_LOCALES: EmailLocale[] = ['es', 'en', 'fr', 'pt']

export function normalizeLocale(input: unknown): EmailLocale {
  if (typeof input !== 'string') return 'es'
  const lower = input.toLowerCase().slice(0, 2)
  if ((SUPPORTED_LOCALES as string[]).includes(lower)) return lower as EmailLocale
  return 'es'
}

type Dict = Record<string, string>

const DICT: Record<EmailLocale, Dict> = {
  es: {
    // Common
    'common.hello': 'Hola',
    'common.team': 'El equipo de',
    'common.thanks_music': 'Gracias por compartir tu música.',
    'common.thanks_using': 'Gracias por usar',
    'common.regards_love': 'Con cariño, el equipo de',
    'common.ignore_email': 'Si no esperabas este correo, puedes ignorarlo.',

    // Song approved
    'songApproved.preview': '"{{songTitle}}" ya está publicada en {{site}}',
    'songApproved.heading': '🎶 ¡Tu canción ha sido publicada!',
    'songApproved.body': 'Tu canción <strong>"{{songTitle}}"</strong> ha sido aprobada y ya está disponible en el catálogo de {{site}}.',
    'songApproved.cta': 'Ver en {{site}}',
    'songApproved.subject_with_title': '🎶 "{{songTitle}}" ha sido publicada en {{site}}',
    'songApproved.subject_default': 'Tu canción ha sido publicada en {{site}}',

    // Song rejected
    'songRejected.preview': '"{{songTitle}}" necesita correcciones antes de publicarse',
    'songRejected.heading': 'Tu canción necesita correcciones',
    'songRejected.body': 'Hemos revisado <strong>"{{songTitle}}"</strong> y no podemos publicarla todavía.',
    'songRejected.reasonsLabel': 'Su lanzamiento no se puede llevar a cabo por los siguientes motivos:',
    'songRejected.editHint': 'Puedes editar tu envío y volver a enviarlo a revisión desde el panel de artista.',
    'songRejected.cta': 'Editar envío',
    'songRejected.subject_with_title': '"{{songTitle}}" necesita correcciones',
    'songRejected.subject_default': 'Tu canción necesita correcciones',

    // Gift received
    'gift.preview': '{{from}} te ha enviado una tarjeta {{site}} {{cardLabel}}',
    'gift.heading': '🎁 Has recibido un regalo',
    'gift.body': '<strong>{{from}}</strong> te ha enviado una tarjeta {{site}} <strong>{{cardLabel}}</strong> con <strong>{{credits}} descargas</strong>.',
    'gift.messageLabel': 'Mensaje:',
    'gift.cta_hint': 'Pulsa el botón para canjear tu regalo y empezar a descargar música.',
    'gift.cta': 'Canjear regalo',
    'gift.unexpected': 'Si no esperabas este regalo, puedes ignorar este correo.',
    'gift.fromDefault': 'Alguien especial',
    'gift.cardStandard': 'Estándar',
    'gift.cardPremium': 'Premium',
    'gift.subject_with_sender': '{{from}} te ha enviado una tarjeta {{site}}',
    'gift.subject_default': 'Has recibido una tarjeta {{site}}',

    // Collab published (registered)
    'collabReg.preview': 'Te han incluido en "{{songTitle}}" en {{site}}',
    'collabReg.heading': '🎤 Tienes una nueva colaboración',
    'collabReg.body1': '<strong>{{primary}}</strong> te ha incluido como <strong>{{role}}</strong> en su nueva canción <strong>"{{songTitle}}"</strong>, que ya está publicada en {{site}}.',
    'collabReg.body2': 'Tienes un <strong>{{share}}%</strong> de los splits. Entra en tu panel de artista y reclama tu parte para empezar a recibir tu monetización.',
    'collabReg.cta': 'Reclamar mi parte',
    'collabReg.errorHint': 'Si crees que esto es un error, ignora este email.',
    'collabReg.subject_with_title': '🎤 Estás en "{{songTitle}}" — reclama tu parte en {{site}}',
    'collabReg.subject_default': 'Tienes una nueva colaboración en {{site}}',

    // Collab published (invite)
    'collabInv.preview': '{{primary}} te incluyó en "{{songTitle}}" — regístrate para reclamar tu parte',
    'collabInv.heading': '🎤 Estás en una colaboración en {{site}}',
    'collabInv.body1': '<strong>{{primary}}</strong> te ha incluido como <strong>{{role}}</strong> en su nueva canción <strong>"{{songTitle}}"</strong>, que acaba de publicarse en {{site}}.',
    'collabInv.body2': 'Te corresponde un <strong>{{share}}%</strong> de los splits, y tu parte queda <strong>reservada en el pozo común</strong> hasta que la reclames.',
    'collabInv.body3': 'Para reclamarla y empezar a cobrar tu monetización, regístrate como artista en {{site}}:',
    'collabInv.cta': 'Crear mi cuenta de artista',
    'collabInv.afterCta': 'Una vez verificado tu perfil de artista, podrás reclamar tu parte desde tu panel de colaboraciones.',
    'collabInv.notYou': 'Si no eres {{name}}, ignora este email.',
    'collabInv.subject_with_title': '🎤 Te han incluido en "{{songTitle}}" — reclama tu parte en {{site}}',
    'collabInv.subject_default': 'Tienes una colaboración esperándote en {{site}}',

    // Collab submitted
    'collabSub.preview': '{{primary}} te ha incluido en "{{songTitle}}" — {{share}}% para ti',
    'collabSub.heading': '🎶 Estás en una nueva colaboración en {{site}}',
    'collabSub.body1': '<strong>{{primary}}</strong> acaba de enviar a revisión su nueva canción <strong>"{{songTitle}}"</strong> en {{site}} y te ha incluido como <strong>{{role}}</strong>.',
    'collabSub.shareLabel': 'Tu participación acordada',
    'collabSub.shareValue': '{{share}}% de los splits',
    'collabSub.roleLabel': 'Rol',
    'collabSub.body2': 'La canción está siendo revisada por nuestro equipo. Cuando se publique, tu parte quedará reservada en el pozo común hasta que la reclames con tu cuenta de artista en {{site}}.',
    'collabSub.body3': 'Si no tienes cuenta de artista todavía, podrás registrarte en <a href="{{authUrl}}" style="color:#9D5DFF;text-decoration:underline">{{authUrl}}</a> para reclamarla cuando se publique.',
    'collabSub.errorHint': 'Si crees que esto es un error o no conoces a {{primary}}, puedes ignorar este email.',
    'collabSub.subject_full': '🎶 {{primary}} te incluyó en "{{songTitle}}" ({{share}}%)',
    'collabSub.subject_default': 'Tienes una nueva colaboración en {{site}}',

    // Roles
    'role.featuring': 'featuring',
    'role.producer': 'productor',
    'role.performer': 'intérprete',
    'role.composer': 'compositor',
    'role.remix': 'remix',
    'role.collaborator': 'colaborador',
  },
  en: {
    'common.hello': 'Hi',
    'common.team': 'The {{site}} team',
    'common.thanks_music': 'Thanks for sharing your music.',
    'common.thanks_using': 'Thanks for using',
    'common.regards_love': 'With love, the {{site}} team',
    'common.ignore_email': "If you weren't expecting this email, you can ignore it.",

    'songApproved.preview': '"{{songTitle}}" is now live on {{site}}',
    'songApproved.heading': '🎶 Your song has been published!',
    'songApproved.body': 'Your song <strong>"{{songTitle}}"</strong> has been approved and is now available in the {{site}} catalog.',
    'songApproved.cta': 'View on {{site}}',
    'songApproved.subject_with_title': '🎶 "{{songTitle}}" is now live on {{site}}',
    'songApproved.subject_default': 'Your song has been published on {{site}}',

    'songRejected.preview': '"{{songTitle}}" needs revisions before going live',
    'songRejected.heading': 'Your song needs revisions',
    'songRejected.body': "We've reviewed <strong>\"{{songTitle}}\"</strong> and we can't publish it yet.",
    'songRejected.reasonsLabel': 'Your release cannot go live for the following reasons:',
    'songRejected.editHint': 'You can edit your submission and resubmit it from the artist dashboard.',
    'songRejected.cta': 'Edit submission',
    'songRejected.subject_with_title': '"{{songTitle}}" needs revisions',
    'songRejected.subject_default': 'Your song needs revisions',

    'gift.preview': '{{from}} sent you a {{cardLabel}} {{site}} card',
    'gift.heading': '🎁 You received a gift',
    'gift.body': '<strong>{{from}}</strong> sent you a <strong>{{cardLabel}}</strong> {{site}} card with <strong>{{credits}} downloads</strong>.',
    'gift.messageLabel': 'Message:',
    'gift.cta_hint': 'Tap the button to redeem your gift and start downloading music.',
    'gift.cta': 'Redeem gift',
    'gift.unexpected': "If you weren't expecting this gift, you can ignore this email.",
    'gift.fromDefault': 'Someone special',
    'gift.cardStandard': 'Standard',
    'gift.cardPremium': 'Premium',
    'gift.subject_with_sender': '{{from}} sent you a {{site}} card',
    'gift.subject_default': 'You received a {{site}} card',

    'collabReg.preview': "You've been added to \"{{songTitle}}\" on {{site}}",
    'collabReg.heading': '🎤 You have a new collaboration',
    'collabReg.body1': '<strong>{{primary}}</strong> added you as <strong>{{role}}</strong> on their new song <strong>"{{songTitle}}"</strong>, which is now live on {{site}}.',
    'collabReg.body2': 'You have <strong>{{share}}%</strong> of the splits. Open your artist dashboard and claim your share to start receiving your earnings.',
    'collabReg.cta': 'Claim my share',
    'collabReg.errorHint': 'If you think this is a mistake, ignore this email.',
    'collabReg.subject_with_title': '🎤 You\'re on "{{songTitle}}" — claim your share on {{site}}',
    'collabReg.subject_default': 'You have a new collaboration on {{site}}',

    'collabInv.preview': '{{primary}} added you to "{{songTitle}}" — sign up to claim your share',
    'collabInv.heading': "🎤 You're on a collaboration on {{site}}",
    'collabInv.body1': '<strong>{{primary}}</strong> added you as <strong>{{role}}</strong> on their new song <strong>"{{songTitle}}"</strong>, just published on {{site}}.',
    'collabInv.body2': 'You\'re entitled to <strong>{{share}}%</strong> of the splits, and your share is <strong>reserved in escrow</strong> until you claim it.',
    'collabInv.body3': 'To claim it and start receiving your earnings, sign up as an artist on {{site}}:',
    'collabInv.cta': 'Create my artist account',
    'collabInv.afterCta': 'Once your artist profile is verified, you can claim your share from your collaborations dashboard.',
    'collabInv.notYou': "If you're not {{name}}, ignore this email.",
    'collabInv.subject_with_title': '🎤 You\'ve been added to "{{songTitle}}" — claim your share on {{site}}',
    'collabInv.subject_default': 'You have a collaboration waiting on {{site}}',

    'collabSub.preview': '{{primary}} added you to "{{songTitle}}" — {{share}}% for you',
    'collabSub.heading': "🎶 You're on a new collaboration on {{site}}",
    'collabSub.body1': '<strong>{{primary}}</strong> just submitted their new song <strong>"{{songTitle}}"</strong> for review on {{site}} and added you as <strong>{{role}}</strong>.',
    'collabSub.shareLabel': 'Your agreed share',
    'collabSub.shareValue': '{{share}}% of splits',
    'collabSub.roleLabel': 'Role',
    'collabSub.body2': 'The song is being reviewed by our team. Once published, your share will be held in escrow until you claim it with your {{site}} artist account.',
    'collabSub.body3': "If you don't have an artist account yet, you can sign up at <a href=\"{{authUrl}}\" style=\"color:#9D5DFF;text-decoration:underline\">{{authUrl}}</a> to claim it once published.",
    'collabSub.errorHint': "If you think this is a mistake or don't know {{primary}}, you can ignore this email.",
    'collabSub.subject_full': '🎶 {{primary}} added you to "{{songTitle}}" ({{share}}%)',
    'collabSub.subject_default': 'You have a new collaboration on {{site}}',

    'role.featuring': 'featuring',
    'role.producer': 'producer',
    'role.performer': 'performer',
    'role.composer': 'composer',
    'role.remix': 'remix',
    'role.collaborator': 'collaborator',
  },
  fr: {
    'common.hello': 'Bonjour',
    'common.team': "L'équipe {{site}}",
    'common.thanks_music': 'Merci de partager ta musique.',
    'common.thanks_using': "Merci d'utiliser",
    'common.regards_love': "Avec affection, l'équipe {{site}}",
    'common.ignore_email': "Si tu n'attendais pas cet e-mail, tu peux l'ignorer.",

    'songApproved.preview': '"{{songTitle}}" est en ligne sur {{site}}',
    'songApproved.heading': '🎶 Ton morceau a été publié !',
    'songApproved.body': 'Ton morceau <strong>"{{songTitle}}"</strong> a été approuvé et est désormais disponible dans le catalogue {{site}}.',
    'songApproved.cta': 'Voir sur {{site}}',
    'songApproved.subject_with_title': '🎶 "{{songTitle}}" est en ligne sur {{site}}',
    'songApproved.subject_default': 'Ton morceau a été publié sur {{site}}',

    'songRejected.preview': '"{{songTitle}}" nécessite des corrections avant publication',
    'songRejected.heading': 'Ton morceau nécessite des corrections',
    'songRejected.body': "Nous avons examiné <strong>\"{{songTitle}}\"</strong> et nous ne pouvons pas encore le publier.",
    'songRejected.reasonsLabel': 'Ta sortie ne peut pas être publiée pour les raisons suivantes :',
    'songRejected.editHint': "Tu peux modifier ta soumission et la renvoyer depuis le panneau artiste.",
    'songRejected.cta': 'Modifier la soumission',
    'songRejected.subject_with_title': '"{{songTitle}}" nécessite des corrections',
    'songRejected.subject_default': 'Ton morceau nécessite des corrections',

    'gift.preview': "{{from}} t'a envoyé une carte {{site}} {{cardLabel}}",
    'gift.heading': '🎁 Tu as reçu un cadeau',
    'gift.body': "<strong>{{from}}</strong> t'a envoyé une carte {{site}} <strong>{{cardLabel}}</strong> avec <strong>{{credits}} téléchargements</strong>.",
    'gift.messageLabel': 'Message :',
    'gift.cta_hint': 'Appuie sur le bouton pour utiliser ton cadeau et commencer à télécharger de la musique.',
    'gift.cta': 'Utiliser le cadeau',
    'gift.unexpected': "Si tu n'attendais pas ce cadeau, tu peux ignorer cet e-mail.",
    'gift.fromDefault': "Quelqu'un de spécial",
    'gift.cardStandard': 'Standard',
    'gift.cardPremium': 'Premium',
    'gift.subject_with_sender': "{{from}} t'a envoyé une carte {{site}}",
    'gift.subject_default': 'Tu as reçu une carte {{site}}',

    'collabReg.preview': 'Tu as été ajouté à "{{songTitle}}" sur {{site}}',
    'collabReg.heading': '🎤 Tu as une nouvelle collaboration',
    'collabReg.body1': "<strong>{{primary}}</strong> t'a ajouté en tant que <strong>{{role}}</strong> sur son nouveau morceau <strong>\"{{songTitle}}\"</strong>, désormais publié sur {{site}}.",
    'collabReg.body2': "Tu as <strong>{{share}}%</strong> des splits. Ouvre ton panneau artiste et réclame ta part pour commencer à percevoir tes revenus.",
    'collabReg.cta': 'Réclamer ma part',
    'collabReg.errorHint': "Si tu penses qu'il s'agit d'une erreur, ignore cet e-mail.",
    'collabReg.subject_with_title': '🎤 Tu es sur "{{songTitle}}" — réclame ta part sur {{site}}',
    'collabReg.subject_default': 'Tu as une nouvelle collaboration sur {{site}}',

    'collabInv.preview': "{{primary}} t'a ajouté à \"{{songTitle}}\" — inscris-toi pour réclamer ta part",
    'collabInv.heading': '🎤 Tu es sur une collaboration sur {{site}}',
    'collabInv.body1': "<strong>{{primary}}</strong> t'a ajouté en tant que <strong>{{role}}</strong> sur son nouveau morceau <strong>\"{{songTitle}}\"</strong>, qui vient d'être publié sur {{site}}.",
    'collabInv.body2': "Il te revient <strong>{{share}}%</strong> des splits, et ta part est <strong>réservée dans le pot commun</strong> jusqu'à ce que tu la réclames.",
    'collabInv.body3': "Pour la réclamer et commencer à percevoir tes revenus, inscris-toi comme artiste sur {{site}} :",
    'collabInv.cta': 'Créer mon compte artiste',
    'collabInv.afterCta': 'Une fois ton profil artiste vérifié, tu pourras réclamer ta part depuis ton panneau collaborations.',
    'collabInv.notYou': "Si tu n'es pas {{name}}, ignore cet e-mail.",
    'collabInv.subject_with_title': '🎤 Tu as été ajouté à "{{songTitle}}" — réclame ta part sur {{site}}',
    'collabInv.subject_default': 'Une collaboration t\'attend sur {{site}}',

    'collabSub.preview': "{{primary}} t'a ajouté à \"{{songTitle}}\" — {{share}}% pour toi",
    'collabSub.heading': '🎶 Tu es sur une nouvelle collaboration sur {{site}}',
    'collabSub.body1': "<strong>{{primary}}</strong> vient d'envoyer son nouveau morceau <strong>\"{{songTitle}}\"</strong> en révision sur {{site}} et t'a ajouté en tant que <strong>{{role}}</strong>.",
    'collabSub.shareLabel': 'Ta participation convenue',
    'collabSub.shareValue': '{{share}}% des splits',
    'collabSub.roleLabel': 'Rôle',
    'collabSub.body2': "Le morceau est en cours de révision par notre équipe. Une fois publié, ta part sera réservée dans le pot commun jusqu'à ce que tu la réclames avec ton compte artiste {{site}}.",
    'collabSub.body3': "Si tu n'as pas encore de compte artiste, tu peux t'inscrire sur <a href=\"{{authUrl}}\" style=\"color:#9D5DFF;text-decoration:underline\">{{authUrl}}</a> pour la réclamer après publication.",
    'collabSub.errorHint': "Si tu penses qu'il s'agit d'une erreur ou si tu ne connais pas {{primary}}, tu peux ignorer cet e-mail.",
    'collabSub.subject_full': "🎶 {{primary}} t'a ajouté à \"{{songTitle}}\" ({{share}}%)",
    'collabSub.subject_default': 'Tu as une nouvelle collaboration sur {{site}}',

    'role.featuring': 'featuring',
    'role.producer': 'producteur',
    'role.performer': 'interprète',
    'role.composer': 'compositeur',
    'role.remix': 'remix',
    'role.collaborator': 'collaborateur',
  },
  pt: {
    'common.hello': 'Olá',
    'common.team': 'A equipa {{site}}',
    'common.thanks_music': 'Obrigado por partilhares a tua música.',
    'common.thanks_using': 'Obrigado por usares',
    'common.regards_love': 'Com carinho, a equipa {{site}}',
    'common.ignore_email': 'Se não estavas à espera deste e-mail, podes ignorá-lo.',

    'songApproved.preview': '"{{songTitle}}" já está publicada em {{site}}',
    'songApproved.heading': '🎶 A tua música foi publicada!',
    'songApproved.body': 'A tua música <strong>"{{songTitle}}"</strong> foi aprovada e já está disponível no catálogo de {{site}}.',
    'songApproved.cta': 'Ver no {{site}}',
    'songApproved.subject_with_title': '🎶 "{{songTitle}}" foi publicada em {{site}}',
    'songApproved.subject_default': 'A tua música foi publicada em {{site}}',

    'songRejected.preview': '"{{songTitle}}" precisa de correções antes de ser publicada',
    'songRejected.heading': 'A tua música precisa de correções',
    'songRejected.body': 'Revimos <strong>"{{songTitle}}"</strong> e ainda não a podemos publicar.',
    'songRejected.reasonsLabel': 'O teu lançamento não pode avançar pelos seguintes motivos:',
    'songRejected.editHint': 'Podes editar o teu envio e reenviá-lo para revisão a partir do painel de artista.',
    'songRejected.cta': 'Editar envio',
    'songRejected.subject_with_title': '"{{songTitle}}" precisa de correções',
    'songRejected.subject_default': 'A tua música precisa de correções',

    'gift.preview': '{{from}} enviou-te um cartão {{site}} {{cardLabel}}',
    'gift.heading': '🎁 Recebeste um presente',
    'gift.body': '<strong>{{from}}</strong> enviou-te um cartão {{site}} <strong>{{cardLabel}}</strong> com <strong>{{credits}} downloads</strong>.',
    'gift.messageLabel': 'Mensagem:',
    'gift.cta_hint': 'Carrega no botão para resgatar o presente e começar a descarregar música.',
    'gift.cta': 'Resgatar presente',
    'gift.unexpected': 'Se não estavas à espera deste presente, podes ignorar este e-mail.',
    'gift.fromDefault': 'Alguém especial',
    'gift.cardStandard': 'Standard',
    'gift.cardPremium': 'Premium',
    'gift.subject_with_sender': '{{from}} enviou-te um cartão {{site}}',
    'gift.subject_default': 'Recebeste um cartão {{site}}',

    'collabReg.preview': 'Foste incluído em "{{songTitle}}" em {{site}}',
    'collabReg.heading': '🎤 Tens uma nova colaboração',
    'collabReg.body1': '<strong>{{primary}}</strong> incluiu-te como <strong>{{role}}</strong> na sua nova música <strong>"{{songTitle}}"</strong>, agora publicada em {{site}}.',
    'collabReg.body2': 'Tens <strong>{{share}}%</strong> dos splits. Entra no teu painel de artista e reclama a tua parte para começar a receber.',
    'collabReg.cta': 'Reclamar a minha parte',
    'collabReg.errorHint': 'Se achas que isto é um engano, ignora este e-mail.',
    'collabReg.subject_with_title': '🎤 Estás em "{{songTitle}}" — reclama a tua parte em {{site}}',
    'collabReg.subject_default': 'Tens uma nova colaboração em {{site}}',

    'collabInv.preview': '{{primary}} incluiu-te em "{{songTitle}}" — regista-te para reclamar a tua parte',
    'collabInv.heading': '🎤 Estás numa colaboração em {{site}}',
    'collabInv.body1': '<strong>{{primary}}</strong> incluiu-te como <strong>{{role}}</strong> na sua nova música <strong>"{{songTitle}}"</strong>, acabada de ser publicada em {{site}}.',
    'collabInv.body2': 'Cabem-te <strong>{{share}}%</strong> dos splits, e a tua parte fica <strong>reservada no pote comum</strong> até a reclamares.',
    'collabInv.body3': 'Para a reclamares e começares a receber, regista-te como artista em {{site}}:',
    'collabInv.cta': 'Criar a minha conta de artista',
    'collabInv.afterCta': 'Depois de o teu perfil de artista ser verificado, poderás reclamar a tua parte no painel de colaborações.',
    'collabInv.notYou': 'Se não és {{name}}, ignora este e-mail.',
    'collabInv.subject_with_title': '🎤 Foste incluído em "{{songTitle}}" — reclama a tua parte em {{site}}',
    'collabInv.subject_default': 'Tens uma colaboração à tua espera em {{site}}',

    'collabSub.preview': '{{primary}} incluiu-te em "{{songTitle}}" — {{share}}% para ti',
    'collabSub.heading': '🎶 Estás numa nova colaboração em {{site}}',
    'collabSub.body1': '<strong>{{primary}}</strong> acabou de enviar para revisão a sua nova música <strong>"{{songTitle}}"</strong> em {{site}} e incluiu-te como <strong>{{role}}</strong>.',
    'collabSub.shareLabel': 'A tua participação acordada',
    'collabSub.shareValue': '{{share}}% dos splits',
    'collabSub.roleLabel': 'Função',
    'collabSub.body2': 'A música está a ser revista pela nossa equipa. Quando for publicada, a tua parte ficará reservada no pote comum até a reclamares com a tua conta de artista em {{site}}.',
    'collabSub.body3': 'Se ainda não tens conta de artista, podes registar-te em <a href="{{authUrl}}" style="color:#9D5DFF;text-decoration:underline">{{authUrl}}</a> para a reclamar após a publicação.',
    'collabSub.errorHint': 'Se achas que isto é um engano ou não conheces {{primary}}, podes ignorar este e-mail.',
    'collabSub.subject_full': '🎶 {{primary}} incluiu-te em "{{songTitle}}" ({{share}}%)',
    'collabSub.subject_default': 'Tens uma nova colaboração em {{site}}',

    'role.featuring': 'featuring',
    'role.producer': 'produtor',
    'role.performer': 'intérprete',
    'role.composer': 'compositor',
    'role.remix': 'remix',
    'role.collaborator': 'colaborador',
  },
}

function interpolate(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key]
    return v === undefined || v === null ? '' : String(v)
  })
}

export function t(
  locale: EmailLocale,
  key: string,
  vars: Record<string, string | number> = {},
): string {
  const lang = DICT[locale] ?? DICT.es
  const raw = lang[key] ?? DICT.es[key] ?? key
  return interpolate(raw, vars)
}

// Render an HTML string from a translation key into React using
// dangerouslySetInnerHTML. The HTML is hard-coded in this dictionary
// (no user input) so this is safe.
export function tHtml(
  locale: EmailLocale,
  key: string,
  vars: Record<string, string | number> = {},
): { __html: string } {
  return { __html: t(locale, key, vars) }
}
