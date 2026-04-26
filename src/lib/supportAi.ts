// IA lógica de soporte basada en reglas (sin OpenAI todavía).
// Detecta intenciones por palabras clave y devuelve respuestas estructuradas.

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

export interface SupportReply {
  intent: SupportIntent;
  text: string;
  /** Si true, la UI debe ofrecer escalar a soporte humano */
  suggestEscalation?: boolean;
  /** Categoría sugerida para el ticket si se escala */
  suggestedCategory?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

interface IntentRule {
  intent: SupportIntent;
  keywords: string[];
  reply: SupportReply;
}

const RULES: IntentRule[] = [
  {
    intent: 'human',
    keywords: ['humano', 'agente', 'persona real', 'no me ayudas', 'no me ayuda', 'hablar con soporte', 'hablar con alguien', 'soporte humano'],
    reply: {
      intent: 'human',
      text: 'Entiendo. Voy a preparar tu caso para soporte humano. Por favor, completa el formulario para que el equipo de YUSIOP pueda revisarlo.',
      suggestEscalation: true,
      suggestedCategory: 'other',
    },
  },
  {
    intent: 'qr',
    keywords: ['qr', 'codigo', 'código', 'escanear', 'escaner', 'escáner', 'tarjeta no funciona', 'no escanea'],
    reply: {
      intent: 'qr',
      text:
        'Si tu QR no funciona, prueba esto:\n\n' +
        '1. Comprueba los permisos de cámara en tu navegador o sistema.\n' +
        '2. Verifica que el código no haya sido usado o canjeado antes.\n' +
        '3. Introduce el código manualmente desde la pantalla de escaneo.\n' +
        '4. Si sigue fallando, escala a soporte y te ayudaremos.',
      suggestEscalation: true,
      suggestedCategory: 'qr',
    },
  },
  {
    intent: 'downloads',
    keywords: ['descargar', 'descarga', 'no descarga', 'biblioteca', 'creditos', 'créditos', 'bajar cancion', 'bajar canción'],
    reply: {
      intent: 'downloads',
      text:
        'Para problemas con descargas:\n\n' +
        '1. Comprueba si tienes créditos disponibles en Mis Tarjetas.\n' +
        '2. Revisa tu conexión a internet.\n' +
        '3. Confirma que la canción no está ya descargada en tu Biblioteca.\n' +
        '4. Si tienes una suscripción activa, verifica que no hayas agotado tus descargas mensuales.',
      suggestEscalation: true,
      suggestedCategory: 'downloads',
    },
  },
  {
    intent: 'payments',
    keywords: ['pago', 'stripe', 'compra', 'tarjeta bancaria', 'cobro', 'cobrado', 'factura', 'reembolso'],
    reply: {
      intent: 'payments',
      text:
        'Sobre tu pago:\n\n' +
        '1. Confirma si has recibido el email de confirmación.\n' +
        '2. Revisa el estado de tu compra en Perfil → Mis Tarjetas.\n' +
        '3. Si el pago aparece como pendiente, espera unos minutos.\n' +
        '4. Si se cobró pero no ves la tarjeta o la suscripción, escala a soporte y revisaremos tu caso.',
      suggestEscalation: true,
      suggestedCategory: 'payments',
    },
  },
  {
    intent: 'cards',
    keywords: ['tarjeta', 'tarjetas', 'activar tarjeta', 'mis tarjetas', 'regalar tarjeta', 'regalo'],
    reply: {
      intent: 'cards',
      text:
        'Sobre las tarjetas YUSIOP:\n\n' +
        '• Tarjetas estándar y premium dan créditos para descargar canciones.\n' +
        '• Para activarlas, escanea el QR o introduce el código manualmente.\n' +
        '• Puedes ver tus tarjetas activas en Perfil → Mis Tarjetas.\n' +
        '• Las tarjetas digitales se pueden regalar mediante un enlace de canje.',
      suggestEscalation: true,
      suggestedCategory: 'cards',
    },
  },
  {
    intent: 'subscriptions',
    keywords: ['suscripcion', 'suscripción', 'subscripcion', 'plus', 'pro', 'elite', 'cancelar', 'mensualidad'],
    reply: {
      intent: 'subscriptions',
      text:
        'Sobre suscripciones (Plus, Pro, Elite):\n\n' +
        '• Cada plan otorga un número de descargas mensuales que se renuevan al inicio de cada periodo.\n' +
        '• Puedes gestionar o cancelar tu suscripción desde Perfil → Suscripción.\n' +
        '• Si cancelas, mantendrás los beneficios hasta el final del periodo en curso.\n' +
        '• Las descargas no usadas no se acumulan al siguiente mes.',
      suggestEscalation: true,
      suggestedCategory: 'subscriptions',
    },
  },
  {
    intent: 'artist',
    keywords: ['artista', 'subir cancion', 'subir canción', 'revision', 'revisión', 'aprobacion', 'aprobación', 'rechazo', 'mi cancion', 'mi canción', 'modo artista', 'express', 'copyright'],
    reply: {
      intent: 'artist',
      text:
        'Modo Artista YUSIOP:\n\n' +
        '1. Solicita tu perfil de artista desde Perfil → Conviértete en Artista.\n' +
        '2. Una vez aprobado, podrás subir canciones desde el panel de artista.\n' +
        '3. Cada envío pasa por un análisis de copyright y revisión por el equipo.\n' +
        '4. Estados posibles: pending (en revisión), approved (publicada), rejected (rechazada).\n' +
        '5. Si necesitas publicación urgente, existe la opción Express (24h, 48h, 72h).',
      suggestEscalation: true,
      suggestedCategory: 'artist',
    },
  },
  {
    intent: 'collaborations',
    keywords: ['colaborador', 'colaboracion', 'colaboración', 'featuring', 'feat', 'productor', 'reclamar', 'reclamacion', 'reclamación', 'porcentaje', 'split'],
    reply: {
      intent: 'collaborations',
      text:
        'Sistema de colaboraciones:\n\n' +
        '• Cuando se sube una canción, se pueden añadir colaboradores (featuring, productor, etc.) con un porcentaje de participación.\n' +
        '• Si apareces como colaborador en una canción y aún no la has reclamado, podrás verla en tu modo artista → Colaboraciones.\n' +
        '• Las reclamaciones son revisadas por el equipo administrador antes de aprobarse.',
      suggestEscalation: true,
      suggestedCategory: 'collaborations',
    },
  },
  {
    intent: 'greeting',
    keywords: ['hola', 'buenas', 'buenos dias', 'buenos días', 'buenas tardes', 'hey', 'saludos'],
    reply: {
      intent: 'greeting',
      text: '¡Hola! 👋 Soy el asistente de YUSIOP. Puedo ayudarte con tarjetas QR, descargas, pagos, suscripciones o el modo artista. ¿En qué te ayudo?',
    },
  },
];

export function detectIntent(message: string): SupportReply {
  const text = norm(message);
  if (!text) {
    return {
      intent: 'unknown',
      text: 'Cuéntame con un poco más de detalle qué problema tienes y te ayudo.',
    };
  }

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => text.includes(norm(kw)))) {
      return rule.reply;
    }
  }

  return {
    intent: 'unknown',
    text:
      'No estoy seguro de haberte entendido bien. Puedo ayudarte con:\n\n' +
      '• Tarjetas QR y activación\n' +
      '• Descargas y créditos\n' +
      '• Pagos y compras\n' +
      '• Suscripciones (Plus, Pro, Elite)\n' +
      '• Modo Artista y subida de canciones\n' +
      '• Colaboraciones\n\n' +
      'O si lo prefieres, puedo abrir un ticket para que un humano te ayude.',
    suggestEscalation: true,
    suggestedCategory: 'other',
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
