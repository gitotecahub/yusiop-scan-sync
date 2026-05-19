// IA lógica de soporte basada en reglas (sin OpenAI todavía).
// Detecta intención y devuelve la respuesta en el idioma del mensaje del usuario.

export type SupportIntent =
  | 'qr'
  | 'downloads'
  | 'payments'
  | 'cards'
  | 'subscriptions'
  | 'artist'
  | 'collaborations'
  | 'human'
  | 'greeting'
  | 'unknown';

export type SupportLang = 'es' | 'en' | 'pt' | 'fr' | 'it' | 'de';

export interface SupportReply {
  intent: SupportIntent;
  text: string;
  /** Si true, la UI debe ofrecer escalar a soporte humano */
  suggestEscalation?: boolean;
  /** Categoría sugerida para el ticket si se escala */
  suggestedCategory?: string;
  /** Idioma detectado en el mensaje del usuario */
  lang?: SupportLang;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// ---------- Detección de idioma ----------
// Heurística sencilla por palabras frecuentes (stopwords) por idioma.
const LANG_HINTS: Record<SupportLang, string[]> = {
  es: ['hola', 'gracias', 'porque', 'porqué', 'cuando', 'cuándo', 'donde', 'dónde', 'como', 'cómo', 'que', 'qué', 'puedo', 'tengo', 'mi', 'una', 'esta', 'no funciona', 'ayuda', 'quiero', 'necesito', 'por favor', 'buenas', 'buenos dias'],
  en: ['hello', 'hi', 'thanks', 'thank you', 'please', 'help', 'how', 'what', 'when', 'where', 'why', 'cannot', "can't", "doesn't", 'does not', 'i need', 'i want', "i'm", 'i am', 'my', 'the', 'is not', 'not working', 'good morning'],
  pt: ['ola', 'olá', 'obrigado', 'obrigada', 'porque', 'quando', 'onde', 'como', 'nao', 'não', 'eu', 'minha', 'meu', 'preciso', 'quero', 'ajuda', 'bom dia', 'boa tarde', 'por favor'],
  fr: ['bonjour', 'salut', 'merci', 'comment', 'pourquoi', 'quand', 'ou', 'où', 'je', "j'ai", 'je veux', 'je voudrais', 'mon', 'ma', "s'il vous plait", 'sil vous plait', 'aide', 'ne fonctionne pas', 'pas', 'aidez'],
  it: ['ciao', 'salve', 'grazie', 'come', 'perche', 'perché', 'quando', 'dove', 'io', 'mio', 'mia', 'voglio', 'ho bisogno', 'aiuto', 'per favore', 'non funziona', 'buongiorno'],
  de: ['hallo', 'guten tag', 'guten morgen', 'danke', 'bitte', 'wie', 'warum', 'wann', 'wo', 'ich', 'mein', 'meine', 'brauche', 'will', 'möchte', 'mochte', 'hilfe', 'funktioniert nicht', 'nicht'],
};

export function detectLanguage(message: string, fallback: SupportLang = 'es'): SupportLang {
  const text = ' ' + norm(message) + ' ';
  if (!text.trim()) return fallback;
  const scores: Record<SupportLang, number> = { es: 0, en: 0, pt: 0, fr: 0, it: 0, de: 0 };
  (Object.keys(LANG_HINTS) as SupportLang[]).forEach((lang) => {
    for (const kw of LANG_HINTS[lang]) {
      if (text.includes(' ' + norm(kw) + ' ') || text.includes(' ' + norm(kw)) || text.includes(norm(kw) + ' ')) {
        scores[lang] += 1;
      }
    }
  });
  let best: SupportLang = fallback;
  let max = 0;
  (Object.keys(scores) as SupportLang[]).forEach((l) => {
    if (scores[l] > max) {
      max = scores[l];
      best = l;
    }
  });
  return max === 0 ? fallback : best;
}

// ---------- Reglas (keywords multilingües) ----------
interface IntentRule {
  intent: SupportIntent;
  keywords: string[];
  suggestEscalation?: boolean;
  suggestedCategory?: string;
}

const RULES: IntentRule[] = [
  {
    intent: 'human',
    keywords: [
      'humano', 'agente', 'persona real', 'hablar con soporte', 'hablar con alguien', 'soporte humano',
      'human', 'real person', 'talk to support', 'speak to someone', 'live agent',
      'humano', 'pessoa real', 'falar com suporte',
      'humain', 'parler a quelqu un', 'agent reel',
      'umano', 'parlare con qualcuno', 'agente reale',
      'mensch', 'mit jemandem sprechen',
    ],
    suggestEscalation: true,
    suggestedCategory: 'other',
  },
  {
    intent: 'qr',
    keywords: [
      'qr', 'codigo', 'código', 'escanear', 'escaner', 'escáner', 'tarjeta no funciona', 'no escanea',
      'scan', 'scanner', 'code', 'qr code', 'card not working',
      'escanear', 'leitor', 'codigo qr',
      'scanner', 'scanne', 'ne marche pas', 'ne fonctionne pas qr',
      'scansionare', 'scanner', 'codice', 'non funziona',
      'scannen', 'scanner', 'qr-code', 'funktioniert nicht',
    ],
    suggestEscalation: true,
    suggestedCategory: 'qr',
  },
  {
    intent: 'downloads',
    keywords: [
      'descargar', 'descarga', 'no descarga', 'biblioteca', 'creditos', 'créditos', 'bajar cancion', 'bajar canción',
      'download', 'downloads', 'library', 'credits', "can't download", 'cannot download',
      'baixar', 'biblioteca', 'creditos', 'nao baixa',
      'telecharger', 'téléchargement', 'bibliotheque', 'credits',
      'scaricare', 'download', 'libreria', 'crediti',
      'herunterladen', 'bibliothek', 'credits', 'guthaben',
    ],
    suggestEscalation: true,
    suggestedCategory: 'downloads',
  },
  {
    intent: 'payments',
    keywords: [
      'pago', 'stripe', 'compra', 'tarjeta bancaria', 'cobro', 'cobrado', 'factura', 'reembolso',
      'payment', 'paid', 'purchase', 'charge', 'invoice', 'refund', 'billing',
      'pagamento', 'comprei', 'cobranca', 'reembolso', 'fatura',
      'paiement', 'paye', 'achat', 'facture', 'remboursement',
      'pagamento', 'acquisto', 'fattura', 'rimborso', 'addebito',
      'zahlung', 'kauf', 'rechnung', 'erstattung', 'bezahlt',
    ],
    suggestEscalation: true,
    suggestedCategory: 'payments',
  },
  {
    intent: 'cards',
    keywords: [
      'tarjeta', 'tarjetas', 'activar tarjeta', 'mis tarjetas', 'regalar tarjeta', 'regalo',
      'card', 'cards', 'activate card', 'my cards', 'gift card', 'gift',
      'cartao', 'cartão', 'cartões', 'ativar cartao', 'presente',
      'carte', 'cartes', 'activer carte', 'cadeau',
      'carta', 'carte', 'attivare carta', 'regalo',
      'karte', 'karten', 'karte aktivieren', 'geschenk',
    ],
    suggestEscalation: true,
    suggestedCategory: 'cards',
  },
  {
    intent: 'subscriptions',
    keywords: [
      'suscripcion', 'suscripción', 'subscripcion', 'plus', 'pro', 'elite', 'cancelar', 'mensualidad',
      'subscription', 'cancel', 'monthly', 'plan',
      'assinatura', 'cancelar', 'mensalidade',
      'abonnement', 'annuler', 'mensuel',
      'abbonamento', 'cancellare', 'mensile',
      'abonnement', 'abo', 'kundigen', 'kündigen', 'monatlich',
    ],
    suggestEscalation: true,
    suggestedCategory: 'subscriptions',
  },
  {
    intent: 'artist',
    keywords: [
      'artista', 'subir cancion', 'subir canción', 'revision', 'revisión', 'aprobacion', 'aprobación', 'rechazo', 'mi cancion', 'mi canción', 'modo artista', 'express', 'copyright',
      'artist', 'upload song', 'review', 'approval', 'rejected', 'my song', 'artist mode',
      'artista', 'subir musica', 'aprovacao', 'rejeitada',
      'artiste', 'telecharger chanson', 'approbation', 'refusee',
      'artista', 'caricare canzone', 'approvazione', 'rifiutata',
      'kunstler', 'künstler', 'lied hochladen', 'genehmigung', 'abgelehnt',
    ],
    suggestEscalation: true,
    suggestedCategory: 'artist',
  },
  {
    intent: 'collaborations',
    keywords: [
      'colaborador', 'colaboracion', 'colaboración', 'featuring', 'feat', 'productor', 'reclamar', 'reclamacion', 'reclamación', 'porcentaje', 'split',
      'collaboration', 'collaborator', 'producer', 'claim', 'split', 'percentage',
      'colaboracao', 'colaborador', 'reivindicar', 'percentual',
      'collaboration', 'collaborateur', 'producteur', 'reclamer', 'pourcentage',
      'collaborazione', 'collaboratore', 'produttore', 'rivendicare', 'percentuale',
      'zusammenarbeit', 'mitwirkender', 'produzent', 'beanspruchen', 'prozentsatz',
    ],
    suggestEscalation: true,
    suggestedCategory: 'collaborations',
  },
  {
    intent: 'greeting',
    keywords: [
      'hola', 'buenas', 'buenos dias', 'buenas tardes', 'saludos',
      'hello', 'hi', 'hey', 'good morning', 'good afternoon',
      'ola', 'olá', 'bom dia', 'boa tarde',
      'bonjour', 'salut', 'bonsoir',
      'ciao', 'salve', 'buongiorno', 'buonasera',
      'hallo', 'guten tag', 'guten morgen', 'guten abend',
    ],
  },
];

// ---------- Traducciones de respuestas ----------
type ReplyTexts = Record<SupportLang, string>;

const REPLIES: Record<SupportIntent, ReplyTexts> = {
  human: {
    es: 'Entiendo. Voy a preparar tu caso para soporte humano. Por favor, completa el formulario para que el equipo de YUSIOP pueda revisarlo.',
    en: "Got it. I'll prepare your case for human support. Please fill in the form so the YUSIOP team can review it.",
    pt: 'Entendi. Vou preparar o seu caso para o suporte humano. Por favor, preencha o formulário para que a equipe YUSIOP possa revisá-lo.',
    fr: "Compris. Je prépare votre cas pour le support humain. Veuillez remplir le formulaire pour que l'équipe YUSIOP puisse l'examiner.",
    it: 'Capito. Preparo il tuo caso per il supporto umano. Per favore, compila il modulo affinché il team YUSIOP possa esaminarlo.',
    de: 'Verstanden. Ich bereite deinen Fall für den menschlichen Support vor. Bitte fülle das Formular aus, damit das YUSIOP-Team es prüfen kann.',
  },
  qr: {
    es:
      'Si tu QR no funciona, prueba esto:\n\n' +
      '1. Comprueba los permisos de cámara en tu navegador o sistema.\n' +
      '2. Verifica que el código no haya sido usado o canjeado antes.\n' +
      '3. Introduce el código manualmente desde la pantalla de escaneo.\n' +
      '4. Si sigue fallando, escala a soporte y te ayudaremos.',
    en:
      "If your QR isn't working, try this:\n\n" +
      '1. Check camera permissions in your browser or system.\n' +
      '2. Make sure the code has not been used or redeemed before.\n' +
      '3. Enter the code manually from the scan screen.\n' +
      '4. If it still fails, escalate to support and we will help you.',
    pt:
      'Se o seu QR não funciona, tente isto:\n\n' +
      '1. Verifique as permissões da câmera no seu navegador ou sistema.\n' +
      '2. Confirme que o código não foi usado antes.\n' +
      '3. Introduza o código manualmente na tela de leitura.\n' +
      '4. Se continuar falhando, abra um ticket de suporte.',
    fr:
      "Si votre QR ne fonctionne pas, essayez ceci :\n\n" +
      '1. Vérifiez les autorisations de la caméra dans votre navigateur ou système.\n' +
      "2. Assurez-vous que le code n'a pas déjà été utilisé.\n" +
      "3. Saisissez le code manuellement depuis l'écran de scan.\n" +
      '4. Si cela échoue toujours, contactez le support.',
    it:
      'Se il tuo QR non funziona, prova questo:\n\n' +
      '1. Controlla i permessi della fotocamera nel browser o nel sistema.\n' +
      '2. Verifica che il codice non sia già stato usato.\n' +
      '3. Inserisci il codice manualmente dalla schermata di scansione.\n' +
      '4. Se continua a non funzionare, contatta il supporto.',
    de:
      'Wenn dein QR-Code nicht funktioniert, versuche Folgendes:\n\n' +
      '1. Prüfe die Kameraberechtigungen in deinem Browser oder System.\n' +
      '2. Stelle sicher, dass der Code noch nicht eingelöst wurde.\n' +
      '3. Gib den Code manuell auf dem Scan-Bildschirm ein.\n' +
      '4. Wenn es weiterhin fehlschlägt, eskaliere an den Support.',
  },
  downloads: {
    es:
      'Para problemas con descargas:\n\n' +
      '1. Comprueba si tienes créditos disponibles en Mis Tarjetas.\n' +
      '2. Revisa tu conexión a internet.\n' +
      '3. Confirma que la canción no está ya descargada en tu Biblioteca.\n' +
      '4. Si tienes una suscripción activa, verifica que no hayas agotado tus descargas mensuales.',
    en:
      'For download issues:\n\n' +
      '1. Check if you have credits available in My Cards.\n' +
      '2. Check your internet connection.\n' +
      '3. Confirm the song is not already downloaded in your Library.\n' +
      '4. If you have an active subscription, make sure you have not used up your monthly downloads.',
    pt:
      'Para problemas com downloads:\n\n' +
      '1. Verifique se há créditos disponíveis em Meus Cartões.\n' +
      '2. Confira sua conexão com a internet.\n' +
      '3. Confirme se a música já não está na sua Biblioteca.\n' +
      '4. Se tem assinatura ativa, verifique se não esgotou os downloads mensais.',
    fr:
      'Pour les problèmes de téléchargement :\n\n' +
      '1. Vérifiez vos crédits disponibles dans Mes Cartes.\n' +
      '2. Vérifiez votre connexion Internet.\n' +
      '3. Confirmez que la chanson n’est pas déjà dans votre Bibliothèque.\n' +
      "4. Si vous avez un abonnement actif, vérifiez que vous n'avez pas épuisé vos téléchargements mensuels.",
    it:
      'Per problemi con i download:\n\n' +
      '1. Controlla i crediti disponibili in Le mie Carte.\n' +
      '2. Verifica la connessione internet.\n' +
      '3. Conferma che il brano non sia già nella tua Libreria.\n' +
      '4. Se hai un abbonamento attivo, verifica di non aver esaurito i download mensili.',
    de:
      'Bei Download-Problemen:\n\n' +
      '1. Prüfe deine verfügbaren Credits unter Meine Karten.\n' +
      '2. Überprüfe deine Internetverbindung.\n' +
      '3. Stelle sicher, dass das Lied nicht bereits in deiner Bibliothek ist.\n' +
      '4. Wenn du ein aktives Abo hast, prüfe deine monatlichen Downloads.',
  },
  payments: {
    es:
      'Sobre tu pago:\n\n' +
      '1. Confirma si has recibido el email de confirmación.\n' +
      '2. Revisa el estado de tu compra en Perfil → Mis Tarjetas.\n' +
      '3. Si el pago aparece como pendiente, espera unos minutos.\n' +
      '4. Si se cobró pero no ves la tarjeta o la suscripción, escala a soporte y revisaremos tu caso.',
    en:
      'About your payment:\n\n' +
      '1. Check if you received the confirmation email.\n' +
      '2. Review your purchase status in Profile → My Cards.\n' +
      '3. If the payment is pending, wait a few minutes.\n' +
      '4. If you were charged but cannot see the card or subscription, escalate to support and we will review your case.',
    pt:
      'Sobre o seu pagamento:\n\n' +
      '1. Confirme se recebeu o email de confirmação.\n' +
      '2. Verifique o status da compra em Perfil → Meus Cartões.\n' +
      '3. Se o pagamento está pendente, aguarde alguns minutos.\n' +
      '4. Se foi cobrado mas não vê o cartão/assinatura, abra um ticket.',
    fr:
      'À propos de votre paiement :\n\n' +
      '1. Vérifiez si vous avez reçu l’email de confirmation.\n' +
      '2. Consultez l’état de votre achat dans Profil → Mes Cartes.\n' +
      '3. Si le paiement est en attente, patientez quelques minutes.\n' +
      '4. Si vous avez été débité sans voir la carte/abonnement, contactez le support.',
    it:
      'Sul tuo pagamento:\n\n' +
      '1. Verifica di aver ricevuto l’email di conferma.\n' +
      '2. Controlla lo stato dell’acquisto in Profilo → Le mie Carte.\n' +
      '3. Se il pagamento è in sospeso, attendi qualche minuto.\n' +
      '4. Se sei stato addebitato ma non vedi la carta/abbonamento, contatta il supporto.',
    de:
      'Zu deiner Zahlung:\n\n' +
      '1. Prüfe, ob du die Bestätigungs-E-Mail erhalten hast.\n' +
      '2. Sieh den Kaufstatus unter Profil → Meine Karten ein.\n' +
      '3. Wenn die Zahlung ausstehend ist, warte einige Minuten.\n' +
      '4. Wurde abgebucht, aber Karte/Abo fehlt, eskaliere an den Support.',
  },
  cards: {
    es:
      'Sobre las tarjetas YUSIOP:\n\n' +
      '• Tarjetas estándar y premium dan créditos para descargar canciones.\n' +
      '• Para activarlas, escanea el QR o introduce el código manualmente.\n' +
      '• Puedes ver tus tarjetas activas en Perfil → Mis Tarjetas.\n' +
      '• Las tarjetas digitales se pueden regalar mediante un enlace de canje.',
    en:
      'About YUSIOP cards:\n\n' +
      '• Standard and premium cards give credits to download songs.\n' +
      '• To activate them, scan the QR or enter the code manually.\n' +
      '• You can see your active cards in Profile → My Cards.\n' +
      '• Digital cards can be gifted via a redemption link.',
    pt:
      'Sobre os cartões YUSIOP:\n\n' +
      '• Cartões padrão e premium dão créditos para baixar músicas.\n' +
      '• Para ativar, escaneie o QR ou insira o código manualmente.\n' +
      '• Veja seus cartões ativos em Perfil → Meus Cartões.\n' +
      '• Cartões digitais podem ser presenteados por link de resgate.',
    fr:
      'À propos des cartes YUSIOP :\n\n' +
      '• Les cartes standard et premium offrent des crédits pour télécharger des chansons.\n' +
      '• Pour les activer, scannez le QR ou saisissez le code manuellement.\n' +
      '• Vous pouvez voir vos cartes actives dans Profil → Mes Cartes.\n' +
      '• Les cartes numériques peuvent être offertes via un lien d’échange.',
    it:
      'Sulle carte YUSIOP:\n\n' +
      '• Le carte standard e premium danno crediti per scaricare canzoni.\n' +
      '• Per attivarle, scansiona il QR o inserisci il codice manualmente.\n' +
      '• Puoi vedere le tue carte attive in Profilo → Le mie Carte.\n' +
      '• Le carte digitali possono essere regalate tramite link di riscatto.',
    de:
      'Zu den YUSIOP-Karten:\n\n' +
      '• Standard- und Premium-Karten geben Credits zum Herunterladen von Songs.\n' +
      '• Zum Aktivieren scanne den QR-Code oder gib den Code manuell ein.\n' +
      '• Aktive Karten siehst du unter Profil → Meine Karten.\n' +
      '• Digitale Karten können per Einlöse-Link verschenkt werden.',
  },
  subscriptions: {
    es:
      'Sobre suscripciones (Plus, Pro, Elite):\n\n' +
      '• Cada plan otorga un número de descargas mensuales que se renuevan al inicio de cada periodo.\n' +
      '• Puedes gestionar o cancelar tu suscripción desde Perfil → Suscripción.\n' +
      '• Si cancelas, mantendrás los beneficios hasta el final del periodo en curso.\n' +
      '• Las descargas no usadas no se acumulan al siguiente mes.',
    en:
      'About subscriptions (Plus, Pro, Elite):\n\n' +
      '• Each plan grants monthly downloads that renew at the start of each period.\n' +
      '• You can manage or cancel your subscription from Profile → Subscription.\n' +
      '• If you cancel, you keep the benefits until the end of the current period.\n' +
      '• Unused downloads do not roll over to the next month.',
    pt:
      'Sobre assinaturas (Plus, Pro, Elite):\n\n' +
      '• Cada plano concede downloads mensais que renovam no início de cada período.\n' +
      '• Gerencie ou cancele em Perfil → Assinatura.\n' +
      '• Ao cancelar, mantém os benefícios até o fim do período atual.\n' +
      '• Downloads não usados não acumulam para o próximo mês.',
    fr:
      'À propos des abonnements (Plus, Pro, Elite) :\n\n' +
      '• Chaque plan offre des téléchargements mensuels renouvelés au début de chaque période.\n' +
      '• Gérez ou annulez depuis Profil → Abonnement.\n' +
      '• Si vous annulez, vous gardez les avantages jusqu’à la fin de la période en cours.\n' +
      '• Les téléchargements non utilisés ne sont pas reportés.',
    it:
      'Sugli abbonamenti (Plus, Pro, Elite):\n\n' +
      '• Ogni piano offre download mensili che si rinnovano all’inizio di ogni periodo.\n' +
      '• Gestisci o cancella da Profilo → Abbonamento.\n' +
      '• Se cancelli, mantieni i benefici fino alla fine del periodo in corso.\n' +
      '• I download non usati non si accumulano al mese successivo.',
    de:
      'Zu Abonnements (Plus, Pro, Elite):\n\n' +
      '• Jeder Plan gewährt monatliche Downloads, die zu Beginn jeder Periode erneuert werden.\n' +
      '• Verwalten oder kündigen unter Profil → Abonnement.\n' +
      '• Bei Kündigung behältst du die Vorteile bis zum Ende der aktuellen Periode.\n' +
      '• Nicht genutzte Downloads werden nicht übertragen.',
  },
  artist: {
    es:
      'Modo Artista YUSIOP:\n\n' +
      '1. Solicita tu perfil de artista desde Perfil → Conviértete en Artista.\n' +
      '2. Una vez aprobado, podrás subir canciones desde el panel de artista.\n' +
      '3. Cada envío pasa por un análisis de copyright y revisión por el equipo.\n' +
      '4. Estados posibles: pending (en revisión), approved (publicada), rejected (rechazada).\n' +
      '5. Si necesitas publicación urgente, existe la opción Express (24h, 48h, 72h).',
    en:
      'YUSIOP Artist Mode:\n\n' +
      '1. Request your artist profile from Profile → Become an Artist.\n' +
      '2. Once approved, you can upload songs from the artist panel.\n' +
      '3. Each submission goes through copyright analysis and team review.\n' +
      '4. Possible statuses: pending, approved, rejected.\n' +
      '5. For urgent publishing, the Express option is available (24h, 48h, 72h).',
    pt:
      'Modo Artista YUSIOP:\n\n' +
      '1. Solicite o perfil de artista em Perfil → Torne-se Artista.\n' +
      '2. Após aprovação, poderá enviar músicas pelo painel do artista.\n' +
      '3. Cada envio passa por análise de copyright e revisão da equipe.\n' +
      '4. Estados: pending, approved, rejected.\n' +
      '5. Para publicação urgente, existe a opção Express (24h, 48h, 72h).',
    fr:
      'Mode Artiste YUSIOP :\n\n' +
      '1. Demandez votre profil artiste depuis Profil → Devenir Artiste.\n' +
      '2. Une fois approuvé, vous pourrez téléverser des chansons.\n' +
      '3. Chaque envoi passe par une analyse copyright et une revue.\n' +
      '4. États : pending, approved, rejected.\n' +
      '5. Pour publication urgente, option Express (24h, 48h, 72h).',
    it:
      'Modalità Artista YUSIOP:\n\n' +
      '1. Richiedi il profilo artista da Profilo → Diventa Artista.\n' +
      '2. Una volta approvato, potrai caricare canzoni dal pannello artista.\n' +
      '3. Ogni invio passa per analisi copyright e revisione del team.\n' +
      '4. Stati: pending, approved, rejected.\n' +
      '5. Per pubblicazione urgente, opzione Express (24h, 48h, 72h).',
    de:
      'YUSIOP Künstler-Modus:\n\n' +
      '1. Beantrage dein Künstlerprofil unter Profil → Künstler werden.\n' +
      '2. Nach Genehmigung kannst du Songs im Künstler-Panel hochladen.\n' +
      '3. Jede Einreichung durchläuft Copyright-Analyse und Team-Prüfung.\n' +
      '4. Status: pending, approved, rejected.\n' +
      '5. Für dringende Veröffentlichung gibt es Express (24h, 48h, 72h).',
  },
  collaborations: {
    es:
      'Sistema de colaboraciones:\n\n' +
      '• Cuando se sube una canción, se pueden añadir colaboradores (featuring, productor, etc.) con un porcentaje de participación.\n' +
      '• Si apareces como colaborador en una canción y aún no la has reclamado, podrás verla en tu modo artista → Colaboraciones.\n' +
      '• Las reclamaciones son revisadas por el equipo administrador antes de aprobarse.',
    en:
      'Collaborations system:\n\n' +
      '• When a song is uploaded, collaborators (featuring, producer, etc.) can be added with a participation percentage.\n' +
      '• If you appear as a collaborator on a song and have not claimed it, you can see it in artist mode → Collaborations.\n' +
      '• Claims are reviewed by the admin team before approval.',
    pt:
      'Sistema de colaborações:\n\n' +
      '• Ao enviar uma música, podem adicionar colaboradores (feat, produtor) com percentual.\n' +
      '• Se aparece como colaborador e ainda não reclamou, veja em modo artista → Colaborações.\n' +
      '• As reivindicações são revisadas pela equipe antes de aprovação.',
    fr:
      'Système de collaborations :\n\n' +
      '• Lors de l’upload, on peut ajouter des collaborateurs (feat, producteur) avec un pourcentage.\n' +
      '• Si vous êtes collaborateur non réclamé, voyez-le dans Mode Artiste → Collaborations.\n' +
      '• Les réclamations sont vérifiées par l’équipe admin.',
    it:
      'Sistema di collaborazioni:\n\n' +
      '• Caricando una canzone si possono aggiungere collaboratori (feat, produttore) con percentuale.\n' +
      '• Se sei collaboratore non rivendicato, lo vedi in modalità artista → Collaborazioni.\n' +
      '• Le rivendicazioni sono revisionate dal team admin.',
    de:
      'Kollaborationssystem:\n\n' +
      '• Beim Hochladen können Mitwirkende (Feature, Produzent) mit Anteil hinzugefügt werden.\n' +
      '• Erscheinst du als Mitwirkender, siehst du es im Künstler-Modus → Kollaborationen.\n' +
      '• Ansprüche werden vom Admin-Team geprüft.',
  },
  greeting: {
    es: '¡Hola! 👋 Soy el asistente de YUSIOP. Puedo ayudarte con tarjetas QR, descargas, pagos, suscripciones o el modo artista. ¿En qué te ayudo?',
    en: 'Hi! 👋 I am the YUSIOP assistant. I can help you with QR cards, downloads, payments, subscriptions or artist mode. How can I help?',
    pt: 'Olá! 👋 Sou o assistente da YUSIOP. Posso ajudar com cartões QR, downloads, pagamentos, assinaturas ou modo artista. Como posso ajudar?',
    fr: 'Bonjour ! 👋 Je suis l’assistant YUSIOP. Je peux vous aider avec les cartes QR, téléchargements, paiements, abonnements ou le mode artiste. Comment puis-je aider ?',
    it: 'Ciao! 👋 Sono l’assistente YUSIOP. Posso aiutarti con carte QR, download, pagamenti, abbonamenti o modalità artista. Come posso aiutarti?',
    de: 'Hallo! 👋 Ich bin der YUSIOP-Assistent. Ich helfe dir mit QR-Karten, Downloads, Zahlungen, Abos oder Künstler-Modus. Wie kann ich helfen?',
  },
  unknown: {
    es:
      'No estoy seguro de haberte entendido bien. Puedo ayudarte con:\n\n' +
      '• Tarjetas QR y activación\n• Descargas y créditos\n• Pagos y compras\n• Suscripciones (Plus, Pro, Elite)\n• Modo Artista y subida de canciones\n• Colaboraciones\n\n' +
      'O si lo prefieres, puedo abrir un ticket para que un humano te ayude.',
    en:
      "I'm not sure I understood. I can help you with:\n\n" +
      '• QR cards and activation\n• Downloads and credits\n• Payments and purchases\n• Subscriptions (Plus, Pro, Elite)\n• Artist Mode and song uploads\n• Collaborations\n\n' +
      'Or I can open a ticket so a human can help you.',
    pt:
      'Não tenho certeza se entendi. Posso ajudar com:\n\n' +
      '• Cartões QR e ativação\n• Downloads e créditos\n• Pagamentos e compras\n• Assinaturas (Plus, Pro, Elite)\n• Modo Artista e envio de músicas\n• Colaborações\n\n' +
      'Ou posso abrir um ticket para um humano te ajudar.',
    fr:
      "Je ne suis pas sûr d'avoir compris. Je peux vous aider avec :\n\n" +
      '• Cartes QR et activation\n• Téléchargements et crédits\n• Paiements et achats\n• Abonnements (Plus, Pro, Elite)\n• Mode Artiste et upload de chansons\n• Collaborations\n\n' +
      'Ou je peux ouvrir un ticket pour qu’un humain vous aide.',
    it:
      'Non sono sicuro di aver capito. Posso aiutarti con:\n\n' +
      '• Carte QR e attivazione\n• Download e crediti\n• Pagamenti e acquisti\n• Abbonamenti (Plus, Pro, Elite)\n• Modalità Artista e upload canzoni\n• Collaborazioni\n\n' +
      'Oppure posso aprire un ticket per farti aiutare da un umano.',
    de:
      'Ich bin nicht sicher, ob ich das verstanden habe. Ich kann dir helfen mit:\n\n' +
      '• QR-Karten und Aktivierung\n• Downloads und Credits\n• Zahlungen und Käufe\n• Abos (Plus, Pro, Elite)\n• Künstler-Modus und Song-Uploads\n• Kollaborationen\n\n' +
      'Oder ich öffne ein Ticket, damit ein Mensch dir hilft.',
  },
};

const EMPTY_TEXT: ReplyTexts = {
  es: 'Cuéntame con un poco más de detalle qué problema tienes y te ayudo.',
  en: 'Tell me a bit more about your issue and I will help you.',
  pt: 'Conte-me um pouco mais sobre o problema e eu ajudo.',
  fr: 'Dites-m’en un peu plus sur votre problème et je vous aide.',
  it: 'Dimmi qualcosa in più sul problema e ti aiuto.',
  de: 'Erzähl mir mehr über dein Problem und ich helfe dir.',
};

export function detectIntent(message: string): SupportReply {
  const text = norm(message);
  const lang = detectLanguage(message);

  if (!text) {
    return { intent: 'unknown', text: EMPTY_TEXT[lang], lang };
  }

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => text.includes(norm(kw)))) {
      return {
        intent: rule.intent,
        text: REPLIES[rule.intent][lang],
        suggestEscalation: rule.suggestEscalation,
        suggestedCategory: rule.suggestedCategory,
        lang,
      };
    }
  }

  return {
    intent: 'unknown',
    text: REPLIES.unknown[lang],
    suggestEscalation: true,
    suggestedCategory: 'other',
    lang,
  };
}

export const QUICK_TOPICS: { key: string; label: string; prompt: string; category: string }[] = [
  { key: 'qr', label: 'Mi código QR no funciona', prompt: 'Mi código QR no funciona', category: 'qr' },
  { key: 'downloads', label: 'No puedo descargar una canción', prompt: 'No puedo descargar una canción', category: 'downloads' },
  { key: 'payments', label: 'Problemas con una compra', prompt: 'Tengo un problema con una compra', category: 'payments' },
  { key: 'cards', label: 'Tarjetas y créditos', prompt: 'Quiero saber sobre tarjetas y créditos', category: 'cards' },
  { key: 'subscriptions', label: 'Suscripciones', prompt: 'Tengo una duda sobre suscripciones', category: 'subscriptions' },
  { key: 'artist', label: 'Soy artista', prompt: 'Soy artista, tengo una duda sobre subir canciones', category: 'artist' },
  { key: 'collaborations', label: 'Reclamaciones de colaboración', prompt: 'Quiero reclamar una colaboración', category: 'collaborations' },
  { key: 'human', label: 'Hablar con soporte', prompt: 'Quiero hablar con soporte humano', category: 'other' },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: '¿Cómo activo una tarjeta?',
    a: 'Escanea el código QR de tu tarjeta desde Perfil → Escanear, o introduce el código manualmente. Una vez activada, los créditos se sumarán a tu cuenta.',
  },
  {
    q: '¿Cómo uso mis créditos?',
    a: 'Cada descarga consume un crédito. Puedes ver el saldo restante en Perfil → Mis Tarjetas. Las suscripciones activas tienen su propio contador mensual.',
  },
  {
    q: '¿Qué pasa si mi QR no funciona?',
    a: 'Comprueba los permisos de cámara, asegúrate de que el código no haya sido usado y prueba a introducirlo manualmente. Si persiste, abre un ticket de soporte.',
  },
  {
    q: '¿Cómo subo una canción?',
    a: 'Solicita el perfil de artista desde Perfil → Conviértete en Artista. Una vez aprobado, podrás subir canciones desde el panel de artista.',
  },
  {
    q: '¿Cómo reclamo una colaboración?',
    a: 'En modo artista, ve a Colaboraciones. Verás las canciones donde apareces como colaborador no reclamado y podrás enviar tu reclamación al equipo.',
  },
  {
    q: '¿Cómo cancelo mi suscripción?',
    a: 'Desde Perfil → Suscripción puedes gestionar o cancelar tu plan. Mantendrás los beneficios hasta el final del periodo facturado.',
  },
];
