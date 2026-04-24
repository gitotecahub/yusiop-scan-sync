export type Language = 'es' | 'en' | 'fr' | 'pt';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

export type TranslationKey =
  // Navegación
  | 'nav.home' | 'nav.qr' | 'nav.catalog' | 'nav.library' | 'nav.profile'
  // Home / Index
  | 'home.hero.title' | 'home.hero.subtitle' | 'home.hero.scan' | 'home.hero.explore'
  | 'home.section.recent' | 'home.section.trending' | 'home.section.cards' | 'home.section.activity'
  | 'home.section.foryou' | 'home.footer.cta'
  // Catálogo
  | 'catalog.title' | 'catalog.search' | 'catalog.filter.all' | 'catalog.empty'
  // Biblioteca
  | 'library.title' | 'library.empty' | 'library.downloads' | 'library.favorites'
  // Perfil
  | 'profile.title' | 'profile.cards' | 'profile.history' | 'profile.settings'
  | 'profile.logout' | 'profile.artistMode'
  // QR / Tarjetas
  | 'qr.scan.title' | 'qr.scan.instruction' | 'qr.manual.title' | 'qr.manual.placeholder'
  | 'qr.activate' | 'qr.success' | 'qr.error'
  // Tarjetas
  | 'card.standard' | 'card.premium' | 'card.downloads' | 'card.redeem'
  | 'card.copy' | 'card.copied' | 'card.gift'
  // Tienda
  | 'store.title' | 'store.buy' | 'store.gift' | 'store.price'
  // Configuración
  | 'settings.title' | 'settings.language' | 'settings.languageLabel'
  | 'settings.notifications' | 'settings.theme' | 'settings.save'
  // Notificaciones
  | 'notif.newSong' | 'notif.gift' | 'notif.approved'
  // Acciones
  | 'action.play' | 'action.download' | 'action.share' | 'action.gift'
  | 'action.cancel' | 'action.confirm' | 'action.close' | 'action.save'
  | 'action.copy' | 'action.scan' | 'action.redeem'
  // Estados
  | 'state.loading' | 'state.error' | 'state.empty' | 'state.success'
  // Misc
  | 'app.tagline' | 'app.copyright' | 'app.madeForSound';

export const translations: Record<Language, Record<TranslationKey, string>> = {
  es: {
    // Navegación
    'nav.home': 'Inicio',
    'nav.qr': 'QR',
    'nav.catalog': 'Catálogo',
    'nav.library': 'Biblioteca',
    'nav.profile': 'Perfil',
    // Home
    'home.hero.title': 'Tu música,\nen alta fidelidad',
    'home.hero.subtitle': 'Escanea, descubre y colecciona. Una experiencia sonora pensada para ti.',
    'home.hero.scan': 'Escanear tarjeta',
    'home.hero.explore': 'Explorar música',
    'home.section.recent': 'Lanzamientos destacados',
    'home.section.trending': 'Trending',
    'home.section.cards': 'Tarjetas destacadas',
    'home.section.activity': 'Actividad en la comunidad',
    'home.section.foryou': 'Para ti',
    'home.footer.cta': 'Tu sonido te espera',
    // Catálogo
    'catalog.title': 'Catálogo',
    'catalog.search': 'Buscar canciones...',
    'catalog.filter.all': 'Todos',
    'catalog.empty': 'No se encontraron canciones',
    // Biblioteca
    'library.title': 'Mi Biblioteca',
    'library.empty': 'Aún no tienes canciones',
    'library.downloads': 'Descargas',
    'library.favorites': 'Favoritos',
    // Perfil
    'profile.title': 'Mi Perfil',
    'profile.cards': 'Mis Tarjetas',
    'profile.history': 'Historial',
    'profile.settings': 'Configuración',
    'profile.logout': 'Cerrar sesión',
    'profile.artistMode': 'Modo Artista',
    // QR
    'qr.scan.title': 'Escanear QR',
    'qr.scan.instruction': 'Centra el código QR en el marco',
    'qr.manual.title': 'Código manual',
    'qr.manual.placeholder': 'Ingresa el código de tu tarjeta',
    'qr.activate': 'Activar',
    'qr.success': '¡Tarjeta activada con éxito!',
    'qr.error': 'Error al activar la tarjeta',
    // Tarjetas
    'card.standard': 'Estándar',
    'card.premium': 'Premium',
    'card.downloads': 'descargas',
    'card.redeem': 'Canjear',
    'card.copy': 'Copiar',
    'card.copied': '¡Copiado!',
    'card.gift': 'Regalar',
    // Tienda
    'store.title': 'Tienda',
    'store.buy': 'Comprar',
    'store.gift': 'Regalar',
    'store.price': 'Precio',
    // Configuración
    'settings.title': 'Configuración',
    'settings.language': 'Idioma',
    'settings.languageLabel': 'Selecciona tu idioma',
    'settings.notifications': 'Notificaciones',
    'settings.theme': 'Tema',
    'settings.save': 'Guardar',
    // Notificaciones
    'notif.newSong': 'Nueva canción disponible',
    'notif.gift': '¡Te han regalado una tarjeta!',
    'notif.approved': 'Tu canción fue aprobada',
    // Acciones
    'action.play': 'Reproducir',
    'action.download': 'Descargar',
    'action.share': 'Compartir',
    'action.gift': 'Regalar',
    'action.cancel': 'Cancelar',
    'action.confirm': 'Confirmar',
    'action.close': 'Cerrar',
    'action.save': 'Guardar',
    'action.copy': 'Copiar',
    'action.scan': 'Escanear',
    'action.redeem': 'Canjear',
    // Estados
    'state.loading': 'Cargando...',
    'state.error': 'Algo salió mal',
    'state.empty': 'No hay contenido',
    'state.success': '¡Éxito!',
    // Misc
    'app.tagline': 'Cada canción cuenta una historia',
    'app.copyright': '© Yusiop 2026',
    'app.madeForSound': 'Made for sound',
  },
  en: {
    // Navegación
    'nav.home': 'Home',
    'nav.qr': 'QR',
    'nav.catalog': 'Catalog',
    'nav.library': 'Library',
    'nav.profile': 'Profile',
    // Home
    'home.hero.title': 'Your music,\nin high fidelity',
    'home.hero.subtitle': 'Scan, discover and collect. A sound experience designed for you.',
    'home.hero.scan': 'Scan card',
    'home.hero.explore': 'Explore music',
    'home.section.recent': 'Featured releases',
    'home.section.trending': 'Trending',
    'home.section.cards': 'Featured cards',
    'home.section.activity': 'Community activity',
    'home.section.foryou': 'For you',
    'home.footer.cta': 'Your sound awaits',
    // Catálogo
    'catalog.title': 'Catalog',
    'catalog.search': 'Search songs...',
    'catalog.filter.all': 'All',
    'catalog.empty': 'No songs found',
    // Biblioteca
    'library.title': 'My Library',
    'library.empty': 'You have no songs yet',
    'library.downloads': 'Downloads',
    'library.favorites': 'Favorites',
    // Perfil
    'profile.title': 'My Profile',
    'profile.cards': 'My Cards',
    'profile.history': 'History',
    'profile.settings': 'Settings',
    'profile.logout': 'Logout',
    'profile.artistMode': 'Artist Mode',
    // QR
    'qr.scan.title': 'Scan QR',
    'qr.scan.instruction': 'Center the QR code in the frame',
    'qr.manual.title': 'Manual code',
    'qr.manual.placeholder': 'Enter your card code',
    'qr.activate': 'Activate',
    'qr.success': 'Card activated successfully!',
    'qr.error': 'Error activating card',
    // Tarjetas
    'card.standard': 'Standard',
    'card.premium': 'Premium',
    'card.downloads': 'downloads',
    'card.redeem': 'Redeem',
    'card.copy': 'Copy',
    'card.copied': 'Copied!',
    'card.gift': 'Gift',
    // Tienda
    'store.title': 'Store',
    'store.buy': 'Buy',
    'store.gift': 'Gift',
    'store.price': 'Price',
    // Configuración
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.languageLabel': 'Select your language',
    'settings.notifications': 'Notifications',
    'settings.theme': 'Theme',
    'settings.save': 'Save',
    // Notificaciones
    'notif.newSong': 'New song available',
    'notif.gift': 'You received a gift card!',
    'notif.approved': 'Your song was approved',
    // Acciones
    'action.play': 'Play',
    'action.download': 'Download',
    'action.share': 'Share',
    'action.gift': 'Gift',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    'action.close': 'Close',
    'action.save': 'Save',
    'action.copy': 'Copy',
    'action.scan': 'Scan',
    'action.redeem': 'Redeem',
    // Estados
    'state.loading': 'Loading...',
    'state.error': 'Something went wrong',
    'state.empty': 'No content',
    'state.success': 'Success!',
    // Misc
    'app.tagline': 'Every song tells a story',
    'app.copyright': '© Yusiop 2026',
    'app.madeForSound': 'Made for sound',
  },
  fr: {
    // Navegación
    'nav.home': 'Accueil',
    'nav.qr': 'QR',
    'nav.catalog': 'Catalogue',
    'nav.library': 'Bibliothèque',
    'nav.profile': 'Profil',
    // Home
    'home.hero.title': 'Votre musique,\nen haute fidélité',
    'home.hero.subtitle': 'Scannez, découvrez et collectionnez. Une expérience sonore pensée pour vous.',
    'home.hero.scan': 'Scanner carte',
    'home.hero.explore': 'Explorer',
    'home.section.recent': 'Sorties récentes',
    'home.section.trending': 'Tendances',
    'home.section.cards': 'Cartes en vedette',
    'home.section.activity': 'Activité communautaire',
    'home.section.foryou': 'Pour vous',
    'home.footer.cta': 'Votre son vous attend',
    // Catálogo
    'catalog.title': 'Catalogue',
    'catalog.search': 'Rechercher...',
    'catalog.filter.all': 'Tout',
    'catalog.empty': 'Aucune chanson trouvée',
    // Biblioteca
    'library.title': 'Ma Bibliothèque',
    'library.empty': "Vous n'avez pas encore de chansons",
    'library.downloads': 'Téléchargements',
    'library.favorites': 'Favoris',
    // Perfil
    'profile.title': 'Mon Profil',
    'profile.cards': 'Mes Cartes',
    'profile.history': 'Historique',
    'profile.settings': 'Paramètres',
    'profile.logout': 'Déconnexion',
    'profile.artistMode': 'Mode Artiste',
    // QR
    'qr.scan.title': 'Scanner QR',
    'qr.scan.instruction': 'Centrez le code QR dans le cadre',
    'qr.manual.title': 'Code manuel',
    'qr.manual.placeholder': 'Entrez le code de votre carte',
    'qr.activate': 'Activer',
    'qr.success': 'Carte activée avec succès !',
    'qr.error': "Erreur lors de l'activation",
    // Tarjetas
    'card.standard': 'Standard',
    'card.premium': 'Premium',
    'card.downloads': 'téléchargements',
    'card.redeem': 'Utiliser',
    'card.copy': 'Copier',
    'card.copied': 'Copié !',
    'card.gift': 'Offrir',
    // Tienda
    'store.title': 'Boutique',
    'store.buy': 'Acheter',
    'store.gift': 'Offrir',
    'store.price': 'Prix',
    // Configuración
    'settings.title': 'Paramètres',
    'settings.language': 'Langue',
    'settings.languageLabel': 'Sélectionnez votre langue',
    'settings.notifications': 'Notifications',
    'settings.theme': 'Thème',
    'settings.save': 'Enregistrer',
    // Notificaciones
    'notif.newSong': 'Nouvelle chanson disponible',
    'notif.gift': 'Vous avez reçu une carte cadeau !',
    'notif.approved': 'Votre chanson a été approuvée',
    // Acciones
    'action.play': 'Lecture',
    'action.download': 'Télécharger',
    'action.share': 'Partager',
    'action.gift': 'Offrir',
    'action.cancel': 'Annuler',
    'action.confirm': 'Confirmer',
    'action.close': 'Fermer',
    'action.save': 'Enregistrer',
    'action.copy': 'Copier',
    'action.scan': 'Scanner',
    'action.redeem': 'Utiliser',
    // Estados
    'state.loading': 'Chargement...',
    'state.error': "Une erreur s'est produite",
    'state.empty': 'Aucun contenu',
    'state.success': 'Succès !',
    // Misc
    'app.tagline': 'Chaque chanson raconte une histoire',
    'app.copyright': '© Yusiop 2026',
    'app.madeForSound': 'Made for sound',
  },
  pt: {
    // Navegación
    'nav.home': 'Início',
    'nav.qr': 'QR',
    'nav.catalog': 'Catálogo',
    'nav.library': 'Biblioteca',
    'nav.profile': 'Perfil',
    // Home
    'home.hero.title': 'Sua música,\nem alta fidelidade',
    'home.hero.subtitle': 'Escaneie, descubra e colecione. Uma experiência sonora pensada para você.',
    'home.hero.scan': 'Escanear cartão',
    'home.hero.explore': 'Explorar música',
    'home.section.recent': 'Lançamentos em destaque',
    'home.section.trending': 'Em alta',
    'home.section.cards': 'Cartões em destaque',
    'home.section.activity': 'Atividade da comunidade',
    'home.section.foryou': 'Para você',
    'home.footer.cta': 'Seu som espera por você',
    // Catálogo
    'catalog.title': 'Catálogo',
    'catalog.search': 'Buscar músicas...',
    'catalog.filter.all': 'Tudo',
    'catalog.empty': 'Nenhuma música encontrada',
    // Biblioteca
    'library.title': 'Minha Biblioteca',
    'library.empty': 'Você ainda não tem músicas',
    'library.downloads': 'Downloads',
    'library.favorites': 'Favoritos',
    // Perfil
    'profile.title': 'Meu Perfil',
    'profile.cards': 'Meus Cartões',
    'profile.history': 'Histórico',
    'profile.settings': 'Configurações',
    'profile.logout': 'Sair',
    'profile.artistMode': 'Modo Artista',
    // QR
    'qr.scan.title': 'Escanear QR',
    'qr.scan.instruction': 'Centralize o código QR no quadro',
    'qr.manual.title': 'Código manual',
    'qr.manual.placeholder': 'Digite o código do seu cartão',
    'qr.activate': 'Ativar',
    'qr.success': 'Cartão ativado com sucesso!',
    'qr.error': 'Erro ao ativar cartão',
    // Tarjetas
    'card.standard': 'Padrão',
    'card.premium': 'Premium',
    'card.downloads': 'downloads',
    'card.redeem': 'Resgatar',
    'card.copy': 'Copiar',
    'card.copied': 'Copiado!',
    'card.gift': 'Presentear',
    // Tienda
    'store.title': 'Loja',
    'store.buy': 'Comprar',
    'store.gift': 'Presentear',
    'store.price': 'Preço',
    // Configuración
    'settings.title': 'Configurações',
    'settings.language': 'Idioma',
    'settings.languageLabel': 'Selecione seu idioma',
    'settings.notifications': 'Notificações',
    'settings.theme': 'Tema',
    'settings.save': 'Salvar',
    // Notificaciones
    'notif.newSong': 'Nova música disponível',
    'notif.gift': 'Você recebeu um cartão de presente!',
    'notif.approved': 'Sua música foi aprovada',
    // Acciones
    'action.play': 'Reproduzir',
    'action.download': 'Download',
    'action.share': 'Compartilhar',
    'action.gift': 'Presentear',
    'action.cancel': 'Cancelar',
    'action.confirm': 'Confirmar',
    'action.close': 'Fechar',
    'action.save': 'Salvar',
    'action.copy': 'Copiar',
    'action.scan': 'Escanear',
    'action.redeem': 'Resgatar',
    // Estados
    'state.loading': 'Carregando...',
    'state.error': 'Algo deu errado',
    'state.empty': 'Sem conteúdo',
    'state.success': 'Sucesso!',
    // Misc
    'app.tagline': 'Cada música conta uma história',
    'app.copyright': '© Yusiop 2026',
    'app.madeForSound': 'Made for sound',
  },
};
