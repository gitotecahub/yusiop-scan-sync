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
  | 'catalog.upcoming' | 'catalog.releaseIn' | 'catalog.popular' | 'catalog.allSongs'
  | 'catalog.noResults' | 'catalog.loading'
  // Biblioteca
  | 'library.title' | 'library.empty' | 'library.downloads' | 'library.favorites'
  | 'library.tab.all' | 'library.tab.cards' | 'library.tab.recent' | 'library.tab.favorites'
  | 'library.discoverMusic' | 'library.goCatalog' | 'library.goStore' | 'library.delete'
  | 'library.share' | 'library.confirmDelete' | 'library.confirmDeleteDesc'
  | 'library.shareTitle' | 'library.shareDesc' | 'library.recipientUser' | 'library.send'
  | 'library.bulkDelete' | 'library.bulkShare' | 'library.selectAll' | 'library.cancelSelection'
  | 'library.itemsSelected' | 'library.deleted' | 'library.shared'
  // Perfil
  | 'profile.title' | 'profile.cards' | 'profile.history' | 'profile.settings'
  | 'profile.logout' | 'profile.artistMode' | 'profile.account' | 'profile.personalInfo'
  | 'profile.username' | 'profile.fullName' | 'profile.email' | 'profile.birthYear'
  | 'profile.gender' | 'profile.male' | 'profile.female' | 'profile.other'
  | 'profile.preferNotSay' | 'profile.edit' | 'profile.save' | 'profile.cancel'
  | 'profile.changePhoto' | 'profile.uploading' | 'profile.activatedCards'
  | 'profile.totalDownloads' | 'profile.remainingDownloads' | 'profile.preferences'
  | 'profile.theme.light' | 'profile.theme.dark' | 'profile.theme.system'
  | 'profile.wifiOnly' | 'profile.wifiOnlyDesc' | 'profile.notifEnable' | 'profile.notifDesc'
  | 'profile.adminPanel' | 'profile.staffPanel' | 'profile.accessPanel'
  | 'profile.logoutConfirm' | 'profile.logoutSuccess' | 'profile.scannedHistory'
  | 'profile.noScannedCards' | 'profile.scanFirst' | 'profile.creditsLeft'
  | 'profile.expires' | 'profile.cardExpired' | 'profile.cardActive'
  // QR / Tarjetas
  | 'qr.scan.title' | 'qr.scan.instruction' | 'qr.manual.title' | 'qr.manual.placeholder'
  | 'qr.activate' | 'qr.success' | 'qr.error'
  | 'qr.startCamera' | 'qr.stopCamera' | 'qr.cameraError' | 'qr.activating'
  | 'qr.invalidCode' | 'qr.mustLogin' | 'qr.creditsAvailable'
  // Tarjetas
  | 'card.standard' | 'card.premium' | 'card.downloads' | 'card.redeem'
  | 'card.copy' | 'card.copied' | 'card.gift' | 'card.delete'
  | 'card.myCards' | 'card.noCards' | 'card.buyFirst' | 'card.code'
  | 'card.giftTo' | 'card.giftMessage' | 'card.confirmGift' | 'card.giftSent'
  | 'card.confirmDelete' | 'card.confirmDeleteDesc' | 'card.deleted'
  | 'card.activated' | 'card.notActivated'
  // Tienda
  | 'store.title' | 'store.buy' | 'store.gift' | 'store.price'
  | 'store.giftToggle' | 'store.giftRecipient' | 'store.giftMessage'
  | 'store.checkout' | 'store.processing' | 'store.confirming'
  | 'store.purchaseSuccess' | 'store.purchaseGiftSuccess' | 'store.purchaseCancelled'
  | 'store.perks.downloads' | 'store.perks.maxQuality' | 'store.perks.noExpiry'
  | 'store.perks.priorityAccess' | 'store.tagline'
  // Configuración / Settings (admin general)
  | 'settings.title' | 'settings.language' | 'settings.languageLabel'
  | 'settings.notifications' | 'settings.theme' | 'settings.save'
  | 'settings.general' | 'settings.appearance'
  // Notificaciones
  | 'notif.newSong' | 'notif.gift' | 'notif.approved'
  | 'notif.title' | 'notif.empty' | 'notif.markAllRead' | 'notif.viewAll'
  // Acciones
  | 'action.play' | 'action.download' | 'action.share' | 'action.gift'
  | 'action.cancel' | 'action.confirm' | 'action.close' | 'action.save'
  | 'action.copy' | 'action.scan' | 'action.redeem'
  | 'action.delete' | 'action.edit' | 'action.continue' | 'action.back'
  | 'action.send' | 'action.search' | 'action.upload' | 'action.retry'
  // Estados
  | 'state.loading' | 'state.error' | 'state.empty' | 'state.success'
  // Auth
  | 'auth.signin' | 'auth.signup' | 'auth.email' | 'auth.password'
  | 'auth.confirmPassword' | 'auth.username' | 'auth.signinBtn' | 'auth.signupBtn'
  | 'auth.signingIn' | 'auth.signingUp' | 'auth.welcome' | 'auth.signinError'
  | 'auth.signupError' | 'auth.passwordsDontMatch' | 'auth.emailRegistered'
  | 'auth.accountCreated' | 'auth.tagline'
  // Modo (Mode Switcher)
  | 'mode.user' | 'mode.artist' | 'mode.switch' | 'mode.becomeArtist'
  | 'mode.requestPending' | 'mode.requestRejected'
  // Artist
  | 'artist.dashboard' | 'artist.stats' | 'artist.submissions' | 'artist.collaborations'
  | 'artist.uploadSong' | 'artist.mySongs' | 'artist.totalPlays' | 'artist.totalDownloads'
  | 'artist.totalEarnings' | 'artist.pending' | 'artist.approved' | 'artist.rejected'
  | 'artist.published' | 'artist.title' | 'artist.songTitle' | 'artist.artistName'
  | 'artist.album' | 'artist.genre' | 'artist.duration' | 'artist.coverImage'
  | 'artist.audioFile' | 'artist.releaseDate' | 'artist.submit' | 'artist.submitting'
  | 'artist.submitted' | 'artist.welcome' | 'artist.becomeArtistTitle'
  | 'artist.becomeArtistDesc' | 'artist.requestArtist'
  // Admin
  | 'admin.dashboard' | 'admin.users' | 'admin.songs' | 'admin.albums'
  | 'admin.qrCards' | 'admin.monetization' | 'admin.settings' | 'admin.salesSimulator'
  | 'admin.artistRequests' | 'admin.songSubmissions' | 'admin.downloads'
  | 'admin.collaborationClaims' | 'admin.panel' | 'admin.totalUsers' | 'admin.totalSongs'
  | 'admin.totalCards' | 'admin.totalRevenue' | 'admin.recentActivity'
  | 'admin.approve' | 'admin.reject' | 'admin.review' | 'admin.create'
  | 'admin.update' | 'admin.actions' | 'admin.status' | 'admin.created'
  // Misc
  | 'app.tagline' | 'app.copyright' | 'app.madeForSound'
  | 'common.yes' | 'common.no' | 'common.all' | 'common.none'
  | 'common.from' | 'common.to' | 'common.date' | 'common.time'
  | 'common.optional' | 'common.required'
  // Extras Index
  | 'home.heroHighlight' | 'home.viewAll' | 'home.new' | 'home.mostPlayed'
  | 'home.collection' | 'home.recommended' | 'home.shareMusic' | 'home.shareMusicDesc'
  | 'home.anytime' | 'home.topDownloaded' | 'home.discoverRanking' | 'home.live'
  | 'home.receiveGifts' | 'home.receiveGiftsDesc' | 'home.free' | 'home.upcomingReleases'
  | 'home.recsSoon' | 'home.releasesSoon' | 'home.noTrending'
  // Catalog extras
  | 'catalog.searchPlaceholder' | 'catalog.balance' | 'catalog.downloadsCardLabel'
  | 'catalog.noCredits' | 'catalog.buyCard' | 'catalog.upcomingTitle' | 'catalog.comingSoonBadge'
  | 'catalog.purchaseSuccess' | 'catalog.noResultsFor' | 'catalog.subtitle' | 'catalog.errorNoCredits'
  | 'catalog.errorMustLogin' | 'catalog.errorDownload' | 'catalog.downloadOk'
  // Store extras
  | 'store.subtitle' | 'store.giftBuy' | 'store.recipientPlaceholder'
  | 'store.messagePlaceholder' | 'store.payButton' | 'store.payAsGift'
  | 'store.simulate' | 'store.simulateNote' | 'store.standardLabel' | 'store.premiumLabel'
  | 'store.confirmingTitle' | 'store.confirmingDesc' | 'store.invalidEmail'
  | 'store.errorStartPay' | 'store.errorSimulate' | 'store.giftLinkCopied'
  // MyCards extras
  | 'cards.viewDetails' | 'cards.depleted' | 'cards.deleteDepleted'
  | 'cards.giftCardTitle' | 'cards.giftCardDesc' | 'cards.recipientUsername'
  | 'cards.giftPlaceholder' | 'cards.giftThis' | 'cards.cardLabel'
  | 'cards.downloadsLabel' | 'cards.activatedLabel' | 'cards.digital' | 'cards.physical'
  | 'cards.giftBadge' | 'cards.codeCopied' | 'cards.copyError' | 'cards.removedFromLibrary'
  | 'cards.enterUsername' | 'cards.giftError' | 'cards.giftSuccess' | 'cards.sending'
  | 'cards.confirmGift' | 'cards.cardActivatedDate' | 'cards.downloadsRemaining'
  | 'cards.tapRedeem'
  // Notifications extras
  | 'notif.markRead' | 'notif.empty2'
  // Player extras
  | 'player.nowPlaying' | 'player.playing' | 'player.minimize' | 'player.share'
  | 'player.cast' | 'player.castConnected' | 'player.castAvailable' | 'player.castConnecting'
  | 'player.castSearch' | 'player.shuffle' | 'player.previous' | 'player.next' | 'player.repeat'
  | 'player.play' | 'player.pause' | 'player.fav' | 'player.unfav'
  | 'player.linkCopied' | 'player.shareError' | 'player.castNoDevices' | 'player.castOpenError'
  | 'player.disconnectedFrom' | 'player.localRestored' | 'player.shareText'
  | 'player.favAdded' | 'player.favRemoved' | 'player.favError' | 'player.loginToFav'
  | 'player.errorPlayback' | 'player.noAudio' | 'player.errorStart' | 'player.errorPause'
  // Artist extras
  | 'artist.userMode' | 'artist.welcomeEyebrow' | 'artist.dashboardSubtitle'
  | 'artist.uploadMusic' | 'artist.viewSubmissions' | 'artist.inReview'
  | 'artist.songsCardDesc' | 'artist.albumsTitle' | 'artist.albumsDesc'
  | 'artist.statsCardTitle' | 'artist.statsCardDesc' | 'artist.collabsCardDesc'
  | 'artist.noAccess' | 'artist.requestProfile'
  | 'artist.panelLabel' | 'artist.statsLabel' | 'artist.audienceEyebrow'
  | 'artist.audienceSubtitle' | 'artist.totalDownloadsLabel' | 'artist.uniqueListeners'
  | 'artist.estIncome' | 'artist.real' | 'artist.realDesc' | 'artist.promo' | 'artist.promoDesc'
  | 'artist.suspicious' | 'artist.suspiciousDesc' | 'artist.poolPending' | 'artist.poolDesc'
  | 'artist.poolGoClaim' | 'artist.last30Days' | 'artist.noDownloads30'
  | 'artist.topSongs' | 'artist.noDownloadsYet' | 'artist.countries' | 'artist.top'
  | 'artist.noGeo' | 'artist.geoNote' | 'artist.age' | 'artist.gender' | 'artist.noData'
  | 'artist.profileNotFound'
  | 'artist.collabsTitle' | 'artist.collabsEyebrow' | 'artist.collabsSubtitle'
  | 'artist.totalEstPending' | 'artist.noPendingCollabs' | 'artist.claimed' | 'artist.claim'
  | 'artist.mySubmissionsRequests' | 'artist.as' | 'artist.downloadsWord'
  | 'artist.estimated' | 'artist.errorLoadingPool'
  | 'artist.subsTitle' | 'artist.subsEyebrow' | 'artist.subsSubtitle' | 'artist.loading'
  | 'artist.noSongsSent' | 'artist.inReviewBadge' | 'artist.scheduledBadge'
  | 'artist.publishedBadge' | 'artist.rejectedBadge' | 'artist.removedBadge'
  | 'artist.editAndResend' | 'artist.rejectionReasonsTitle' | 'artist.removedTitle'
  | 'artist.removedDesc' | 'artist.scheduledTitle' | 'artist.scheduledDesc'
  // Admin sidebar extras
  | 'admin.management' | 'admin.backToApp' | 'admin.signOut'
  | 'admin.signOutLabel'
  // BottomNav already covered

type Dict = Record<TranslationKey, string>;

const es: Dict = {
  // Navegación
  'nav.home': 'Inicio', 'nav.qr': 'QR', 'nav.catalog': 'Catálogo', 'nav.library': 'Biblioteca', 'nav.profile': 'Perfil',
  // Home
  'home.hero.title': 'Tu música,\nen alta fidelidad',
  'home.hero.subtitle': 'Escanea, descubre y colecciona. Una experiencia sonora pensada para ti.',
  'home.hero.scan': 'Escanear tarjeta', 'home.hero.explore': 'Explorar música',
  'home.section.recent': 'Lanzamientos destacados', 'home.section.trending': 'Trending',
  'home.section.cards': 'Tarjetas destacadas', 'home.section.activity': 'Actividad en la comunidad',
  'home.section.foryou': 'Para ti', 'home.footer.cta': 'Tu sonido te espera',
  // Catálogo
  'catalog.title': 'Catálogo', 'catalog.search': 'Buscar canciones...',
  'catalog.filter.all': 'Todos', 'catalog.empty': 'No se encontraron canciones',
  'catalog.upcoming': 'Próximamente', 'catalog.releaseIn': 'Disponible en',
  'catalog.popular': 'Populares', 'catalog.allSongs': 'Todas las canciones',
  'catalog.noResults': 'Sin resultados', 'catalog.loading': 'Cargando catálogo...',
  // Biblioteca
  'library.title': 'Mi Biblioteca', 'library.empty': 'Aún no tienes canciones',
  'library.downloads': 'Descargas', 'library.favorites': 'Favoritos',
  'library.tab.all': 'Todas', 'library.tab.cards': 'Tarjetas',
  'library.tab.recent': 'Recientes', 'library.tab.favorites': 'Favoritos',
  'library.discoverMusic': 'Descubre música nueva en el catálogo',
  'library.goCatalog': 'Ir al catálogo', 'library.goStore': 'Ir a la tienda',
  'library.delete': 'Eliminar', 'library.share': 'Compartir',
  'library.confirmDelete': '¿Eliminar canción?', 'library.confirmDeleteDesc': 'Esta acción no se puede deshacer.',
  'library.shareTitle': 'Regalar canción', 'library.shareDesc': 'Envía esta canción a otro usuario.',
  'library.recipientUser': 'Usuario destinatario', 'library.send': 'Enviar',
  'library.bulkDelete': 'Eliminar seleccionadas', 'library.bulkShare': 'Compartir seleccionadas',
  'library.selectAll': 'Seleccionar todo', 'library.cancelSelection': 'Cancelar',
  'library.itemsSelected': 'seleccionadas', 'library.deleted': 'Canción eliminada',
  'library.shared': 'Canción compartida',
  // Perfil
  'profile.title': 'Mi Perfil', 'profile.cards': 'Mis Tarjetas',
  'profile.history': 'Historial', 'profile.settings': 'Configuración',
  'profile.logout': 'Cerrar sesión', 'profile.artistMode': 'Modo Artista',
  'profile.account': 'Cuenta', 'profile.personalInfo': 'Información personal',
  'profile.username': 'Usuario', 'profile.fullName': 'Nombre completo',
  'profile.email': 'Correo', 'profile.birthYear': 'Año de nacimiento',
  'profile.gender': 'Género', 'profile.male': 'Masculino',
  'profile.female': 'Femenino', 'profile.other': 'Otro',
  'profile.preferNotSay': 'Prefiero no decir', 'profile.edit': 'Editar',
  'profile.save': 'Guardar', 'profile.cancel': 'Cancelar',
  'profile.changePhoto': 'Cambiar foto', 'profile.uploading': 'Subiendo...',
  'profile.activatedCards': 'Tarjetas activadas', 'profile.totalDownloads': 'Descargas totales',
  'profile.remainingDownloads': 'Descargas restantes', 'profile.preferences': 'Preferencias',
  'profile.theme.light': 'Claro', 'profile.theme.dark': 'Oscuro', 'profile.theme.system': 'Sistema',
  'profile.wifiOnly': 'Solo Wi-Fi', 'profile.wifiOnlyDesc': 'Descargas solo cuando hay Wi-Fi',
  'profile.notifEnable': 'Notificaciones', 'profile.notifDesc': 'Recibir alertas de la app',
  'profile.adminPanel': 'Panel de Admin', 'profile.staffPanel': 'Panel de Staff',
  'profile.accessPanel': 'Acceder al panel',
  'profile.logoutConfirm': '¿Cerrar sesión?', 'profile.logoutSuccess': 'Sesión cerrada',
  'profile.scannedHistory': 'Historial de tarjetas', 'profile.noScannedCards': 'No hay tarjetas escaneadas',
  'profile.scanFirst': 'Escanea tu primera tarjeta', 'profile.creditsLeft': 'créditos restantes',
  'profile.expires': 'Caduca', 'profile.cardExpired': 'Caducada', 'profile.cardActive': 'Activa',
  // QR
  'qr.scan.title': 'Escanear QR', 'qr.scan.instruction': 'Centra el código QR en el marco',
  'qr.manual.title': 'Código manual', 'qr.manual.placeholder': 'Ingresa el código de tu tarjeta',
  'qr.activate': 'Activar', 'qr.success': '¡Tarjeta activada con éxito!',
  'qr.error': 'Error al activar la tarjeta',
  'qr.startCamera': 'Iniciar cámara', 'qr.stopCamera': 'Detener cámara',
  'qr.cameraError': 'No se pudo acceder a la cámara',
  'qr.activating': 'Activando...', 'qr.invalidCode': 'Código inválido',
  'qr.mustLogin': 'Debes iniciar sesión para activar una tarjeta',
  'qr.creditsAvailable': 'créditos disponibles',
  // Tarjetas
  'card.standard': 'Estándar', 'card.premium': 'Premium', 'card.downloads': 'descargas',
  'card.redeem': 'Canjear', 'card.copy': 'Copiar', 'card.copied': '¡Copiado!',
  'card.gift': 'Regalar', 'card.delete': 'Eliminar',
  'card.myCards': 'Mis tarjetas', 'card.noCards': 'No tienes tarjetas todavía',
  'card.buyFirst': 'Compra tu primera tarjeta', 'card.code': 'Código',
  'card.giftTo': 'Regalar a', 'card.giftMessage': 'Mensaje (opcional)',
  'card.confirmGift': 'Confirmar regalo', 'card.giftSent': 'Tarjeta enviada',
  'card.confirmDelete': '¿Eliminar tarjeta?', 'card.confirmDeleteDesc': 'No podrás recuperarla.',
  'card.deleted': 'Tarjeta eliminada', 'card.activated': 'Activada', 'card.notActivated': 'Sin activar',
  // Tienda
  'store.title': 'Tienda', 'store.buy': 'Comprar', 'store.gift': 'Regalar', 'store.price': 'Precio',
  'store.giftToggle': 'Regalar a otra persona', 'store.giftRecipient': 'Email del destinatario',
  'store.giftMessage': 'Mensaje personalizado (opcional)',
  'store.checkout': 'Ir al pago', 'store.processing': 'Procesando...',
  'store.confirming': 'Confirmando compra...',
  'store.purchaseSuccess': '¡Compra completada! Activa tu tarjeta para empezar.',
  'store.purchaseGiftSuccess': '¡Regalo enviado con éxito!',
  'store.purchaseCancelled': 'Compra cancelada',
  'store.perks.downloads': 'descargas', 'store.perks.maxQuality': 'Calidad máxima',
  'store.perks.noExpiry': 'Sin caducidad', 'store.perks.priorityAccess': 'Acceso prioritario',
  'store.tagline': 'Elige tu tarjeta y empieza a coleccionar',
  // Configuración
  'settings.title': 'Configuración', 'settings.language': 'Idioma',
  'settings.languageLabel': 'Selecciona tu idioma', 'settings.notifications': 'Notificaciones',
  'settings.theme': 'Tema', 'settings.save': 'Guardar',
  'settings.general': 'General', 'settings.appearance': 'Apariencia',
  // Notificaciones
  'notif.newSong': 'Nueva canción disponible', 'notif.gift': '¡Te han regalado una tarjeta!',
  'notif.approved': 'Tu canción fue aprobada',
  'notif.title': 'Notificaciones', 'notif.empty': 'No tienes notificaciones',
  'notif.markAllRead': 'Marcar todas como leídas', 'notif.viewAll': 'Ver todas',
  // Acciones
  'action.play': 'Reproducir', 'action.download': 'Descargar', 'action.share': 'Compartir',
  'action.gift': 'Regalar', 'action.cancel': 'Cancelar', 'action.confirm': 'Confirmar',
  'action.close': 'Cerrar', 'action.save': 'Guardar', 'action.copy': 'Copiar',
  'action.scan': 'Escanear', 'action.redeem': 'Canjear',
  'action.delete': 'Eliminar', 'action.edit': 'Editar', 'action.continue': 'Continuar',
  'action.back': 'Volver', 'action.send': 'Enviar', 'action.search': 'Buscar',
  'action.upload': 'Subir', 'action.retry': 'Reintentar',
  // Estados
  'state.loading': 'Cargando...', 'state.error': 'Algo salió mal',
  'state.empty': 'No hay contenido', 'state.success': '¡Éxito!',
  // Auth
  'auth.signin': 'Iniciar', 'auth.signup': 'Crear cuenta',
  'auth.email': 'Email', 'auth.password': 'Contraseña',
  'auth.confirmPassword': 'Repetir', 'auth.username': 'Usuario',
  'auth.signinBtn': 'Entrar', 'auth.signupBtn': 'Crear cuenta',
  'auth.signingIn': 'Iniciando…', 'auth.signingUp': 'Creando…',
  'auth.welcome': '¡Bienvenido!', 'auth.signinError': 'Error al iniciar sesión',
  'auth.signupError': 'Error al registrarse', 'auth.passwordsDontMatch': 'Las contraseñas no coinciden',
  'auth.emailRegistered': 'Este email ya está registrado. Inicia sesión.',
  'auth.accountCreated': '¡Cuenta creada! Te enviamos un email para confirmar tu cuenta.',
  'auth.tagline': 'Scan · Sync · Play',
  // Mode
  'mode.user': 'Usuario', 'mode.artist': 'Artista',
  'mode.switch': 'Cambiar modo', 'mode.becomeArtist': 'Convertirme en artista',
  'mode.requestPending': 'Solicitud pendiente', 'mode.requestRejected': 'Solicitud rechazada',
  // Artist
  'artist.dashboard': 'Panel del artista', 'artist.stats': 'Estadísticas',
  'artist.submissions': 'Mis envíos', 'artist.collaborations': 'Colaboraciones',
  'artist.uploadSong': 'Subir canción', 'artist.mySongs': 'Mis canciones',
  'artist.totalPlays': 'Reproducciones totales', 'artist.totalDownloads': 'Descargas totales',
  'artist.totalEarnings': 'Ganancias totales',
  'artist.pending': 'Pendiente', 'artist.approved': 'Aprobada', 'artist.rejected': 'Rechazada',
  'artist.published': 'Publicada', 'artist.title': 'Título',
  'artist.songTitle': 'Título de la canción', 'artist.artistName': 'Nombre artístico',
  'artist.album': 'Álbum', 'artist.genre': 'Género', 'artist.duration': 'Duración',
  'artist.coverImage': 'Portada', 'artist.audioFile': 'Archivo de audio',
  'artist.releaseDate': 'Fecha de lanzamiento',
  'artist.submit': 'Enviar', 'artist.submitting': 'Enviando...',
  'artist.submitted': 'Canción enviada para revisión',
  'artist.welcome': 'Bienvenido al panel de artista',
  'artist.becomeArtistTitle': 'Conviértete en artista',
  'artist.becomeArtistDesc': 'Sube tu música y compártela con la comunidad.',
  'artist.requestArtist': 'Solicitar acceso de artista',
  // Admin
  'admin.dashboard': 'Dashboard', 'admin.users': 'Usuarios', 'admin.songs': 'Canciones',
  'admin.albums': 'Álbumes', 'admin.qrCards': 'Tarjetas QR', 'admin.monetization': 'Monetización',
  'admin.settings': 'Ajustes', 'admin.salesSimulator': 'Simulador de ventas',
  'admin.artistRequests': 'Solicitudes de artistas', 'admin.songSubmissions': 'Envíos de canciones',
  'admin.downloads': 'Descargas', 'admin.collaborationClaims': 'Reclamos de colaboración',
  'admin.panel': 'Panel admin', 'admin.totalUsers': 'Usuarios totales',
  'admin.totalSongs': 'Canciones totales', 'admin.totalCards': 'Tarjetas totales',
  'admin.totalRevenue': 'Ingresos totales', 'admin.recentActivity': 'Actividad reciente',
  'admin.approve': 'Aprobar', 'admin.reject': 'Rechazar', 'admin.review': 'Revisar',
  'admin.create': 'Crear', 'admin.update': 'Actualizar',
  'admin.actions': 'Acciones', 'admin.status': 'Estado', 'admin.created': 'Creado',
  // Misc
  'app.tagline': 'Cada canción cuenta una historia',
  'app.copyright': '© Yusiop 2026', 'app.madeForSound': 'Made for sound',
  'common.yes': 'Sí', 'common.no': 'No', 'common.all': 'Todos', 'common.none': 'Ninguno',
  'common.from': 'Desde', 'common.to': 'Hasta', 'common.date': 'Fecha', 'common.time': 'Hora',
  'common.optional': 'opcional', 'common.required': 'requerido',
  // Index extras
  'home.heroHighlight': 'en alta fidelidad', 'home.viewAll': 'Ver todo →',
  'home.new': 'NUEVO', 'home.mostPlayed': 'Lo más sonado',
  'home.collection': 'Colección', 'home.recommended': 'Recomendado',
  'home.shareMusic': 'Comparte música', 'home.shareMusicDesc': 'Regala canciones a tus amigos',
  'home.anytime': 'Cualquier momento', 'home.topDownloaded': 'Top descargada',
  'home.discoverRanking': 'Descubre el ranking', 'home.live': 'En vivo',
  'home.receiveGifts': 'Recibe regalos', 'home.receiveGiftsDesc': 'Canjea códigos de tus amigos',
  'home.free': 'Gratis', 'home.upcomingReleases': 'Pronto habrá lanzamientos',
  'home.recsSoon': 'Pronto verás recomendaciones', 'home.releasesSoon': 'Pronto habrá lanzamientos',
  'home.noTrending': 'Aún sin trending',
  // Catalog extras
  'catalog.searchPlaceholder': 'Buscar título, artista o álbum…',
  'catalog.balance': 'Tu balance', 'catalog.downloadsCardLabel': 'descargas · tarjeta',
  'catalog.noCredits': 'Sin créditos disponibles', 'catalog.buyCard': 'Comprar tarjeta',
  'catalog.upcomingTitle': 'Próximos lanzamientos', 'catalog.comingSoonBadge': 'Próximamente',
  'catalog.purchaseSuccess': '🎉 ¡Felicidades por tu compra! Tu tarjeta estará disponible en unos segundos.',
  'catalog.noResultsFor': 'Sin resultados para',
  'catalog.subtitle': 'Descubre y descarga tu música favorita.',
  'catalog.errorNoCredits': 'No tienes créditos disponibles. Escanea una tarjeta QR para obtener más.',
  'catalog.errorMustLogin': 'Debes iniciar sesión para descargar canciones',
  'catalog.errorDownload': 'Error al descargar la canción',
  'catalog.downloadOk': 'se descargó correctamente',
  // Store extras
  'store.subtitle': 'Compra tarjetas digitales para descargar tu música',
  'store.giftBuy': 'Comprar como regalo',
  'store.recipientPlaceholder': 'amigo@ejemplo.com',
  'store.messagePlaceholder': '¡Disfruta de la música!',
  'store.payButton': 'Pagar', 'store.payAsGift': 'como regalo',
  'store.simulate': 'Simular compra (sin pago)',
  'store.simulateNote': 'Pago seguro con Stripe · La simulación crea la tarjeta al instante',
  'store.standardLabel': 'YUSIOP Estándar', 'store.premiumLabel': 'YUSIOP Premium',
  'store.confirmingTitle': 'Confirmando tu compra…',
  'store.confirmingDesc': 'Estamos activando tu tarjeta. Esto puede tardar unos segundos.',
  'store.invalidEmail': 'Introduce un email válido para el destinatario.',
  'store.errorStartPay': 'Error iniciando el pago',
  'store.errorSimulate': 'Error simulando la compra',
  'store.giftLinkCopied': '🎁 Regalo creado. Link de canje copiado al portapapeles.',
  // MyCards extras
  'cards.viewDetails': 'Ver detalles de tarjeta',
  'cards.depleted': 'Eliminar tarjeta agotada', 'cards.deleteDepleted': 'Eliminar tarjeta agotada',
  'cards.giftCardTitle': 'Regalar tarjeta',
  'cards.giftCardDesc': 'La tarjeta pasará a la biblioteca del destinatario y dejará de estar en la tuya. Esta acción no se puede deshacer.',
  'cards.recipientUsername': 'Username del destinatario',
  'cards.giftPlaceholder': '¡Para que disfrutes la música!',
  'cards.giftThis': 'Regalar esta tarjeta',
  'cards.cardLabel': 'Tarjeta', 'cards.downloadsLabel': 'Descargas',
  'cards.activatedLabel': 'Activada', 'cards.digital': 'Digital', 'cards.physical': 'Física',
  'cards.giftBadge': 'Regalo', 'cards.codeCopied': 'Código copiado al portapapeles',
  'cards.copyError': 'No se pudo copiar el código',
  'cards.removedFromLibrary': 'Tarjeta eliminada de tu biblioteca',
  'cards.enterUsername': 'Introduce el username del destinatario',
  'cards.giftError': 'No se pudo regalar la tarjeta',
  'cards.giftSuccess': 'Tarjeta regalada',
  'cards.sending': 'Enviando...', 'cards.confirmGift': 'Confirmar regalo',
  'cards.cardActivatedDate': 'Activada el',
  'cards.downloadsRemaining': 'Descargas restantes',
  'cards.tapRedeem': 'Pulsa "Canjear" para activar la tarjeta en el escáner',
  // Notifications extras
  'notif.markRead': 'Marcar leídas', 'notif.empty2': 'No tienes notificaciones',
  // Player extras
  'player.nowPlaying': 'Now playing', 'player.playing': 'Reproduciendo',
  'player.minimize': 'Minimizar', 'player.share': 'Compartir',
  'player.cast': 'Enviar a TV o dispositivo',
  'player.castConnected': 'Conectado a', 'player.castAvailable': 'Dispositivos disponibles',
  'player.castConnecting': 'Conectando…', 'player.castSearch': 'Buscar dispositivos',
  'player.shuffle': 'Aleatorio', 'player.previous': 'Anterior', 'player.next': 'Siguiente',
  'player.repeat': 'Repetir', 'player.play': 'Reproducir', 'player.pause': 'Pausar',
  'player.fav': 'Añadir a favoritos', 'player.unfav': 'Quitar de favoritos',
  'player.linkCopied': 'Enlace copiado al portapapeles',
  'player.shareError': 'No se pudo compartir',
  'player.castNoDevices': 'No se han detectado dispositivos. Asegúrate de estar en la misma red Wi-Fi que tu TV o Chromecast.',
  'player.castOpenError': 'No se pudo abrir el selector de dispositivos',
  'player.disconnectedFrom': 'Desconectado de',
  'player.localRestored': 'Reproducción local restaurada',
  'player.shareText': '🎵 Escucha',
  'player.favAdded': 'Añadido a favoritos', 'player.favRemoved': 'Eliminado de favoritos',
  'player.favError': 'No se pudo actualizar el favorito',
  'player.loginToFav': 'Inicia sesión para guardar favoritos',
  'player.errorPlayback': 'No se pudo reproducir el audio',
  'player.noAudio': 'Esta canción no tiene archivo de audio',
  'player.errorStart': 'No se pudo iniciar la reproducción',
  'player.errorPause': 'No se pudo pausar el audio',
  // Artist extras
  'artist.userMode': 'Modo Usuario', 'artist.welcomeEyebrow': 'Bienvenido',
  'artist.dashboardSubtitle': 'Gestiona tu catálogo, sube música y revisa estadísticas.',
  'artist.uploadMusic': 'Subir música', 'artist.viewSubmissions': 'Mis envíos',
  'artist.inReview': 'en revisión',
  'artist.songsCardDesc': 'Sube nuevas canciones y consulta el estado de tus envíos.',
  'artist.albumsTitle': 'Mis álbumes', 'artist.albumsDesc': 'Crear álbumes y EPs. Próximamente.',
  'artist.statsCardTitle': 'Estadísticas',
  'artist.statsCardDesc': 'Descargas, ingresos, países y demografía de tu audiencia.',
  'artist.collabsCardDesc': 'Reclama tu parte de monetización en canciones donde apareces como colaborador.',
  'artist.noAccess': 'No tienes acceso al panel de artista.',
  'artist.requestProfile': 'Solicitar perfil de artista',
  'artist.panelLabel': 'Panel de artista', 'artist.statsLabel': 'Estadísticas',
  'artist.audienceEyebrow': 'Tu audiencia',
  'artist.audienceSubtitle': 'Descargas, ingresos estimados y desde dónde te escuchan.',
  'artist.totalDownloadsLabel': 'Descargas totales',
  'artist.uniqueListeners': 'Oyentes únicos',
  'artist.estIncome': 'Ingresos estimados (tu parte)',
  'artist.real': 'Reales', 'artist.realDesc': 'Generan ingresos',
  'artist.promo': 'Promocionales', 'artist.promoDesc': 'Tu propia música',
  'artist.suspicious': 'Sospechosas', 'artist.suspiciousDesc': 'Excluidas de ingresos',
  'artist.poolPending': 'Pendiente en pozo común (sin reclamar)',
  'artist.poolDesc': 'descargas afectadas',
  'artist.poolGoClaim': 'Ir a reclamar',
  'artist.last30Days': 'Últimos 30 días',
  'artist.noDownloads30': 'Sin descargas en los últimos 30 días.',
  'artist.topSongs': 'Top canciones',
  'artist.noDownloadsYet': 'Aún no tienes descargas.',
  'artist.countries': 'Países', 'artist.top': 'Top',
  'artist.noGeo': 'Sin datos geográficos todavía.',
  'artist.geoNote': 'La ubicación se obtiene de la IP en el momento de la descarga (aproximada).',
  'artist.age': 'Edad', 'artist.gender': 'Género',
  'artist.noData': 'Sin datos.',
  'artist.profileNotFound': 'No se encontró tu perfil de artista aprobado.',
  'artist.collabsTitle': 'Pozo común de colaboraciones',
  'artist.collabsEyebrow': 'Reclama tus splits',
  'artist.collabsSubtitle': 'Aquí aparecen las canciones donde otro artista te ha incluido como colaborador. Reclama tu parte y un administrador la revisará.',
  'artist.totalEstPending': 'Total estimado pendiente de reclamar',
  'artist.noPendingCollabs': 'No hay colaboraciones pendientes a tu nombre artístico.',
  'artist.claimed': 'Reclamada', 'artist.claim': 'Reclamar',
  'artist.mySubmissionsRequests': 'Mis solicitudes',
  'artist.as': 'Como', 'artist.downloadsWord': 'descargas',
  'artist.estimated': 'estimado',
  'artist.errorLoadingPool': 'Error cargando pozo común',
  'artist.subsTitle': 'Canciones enviadas', 'artist.subsEyebrow': 'Mis envíos',
  'artist.subsSubtitle': 'Sigue el estado de revisión de tus envíos al catálogo.',
  'artist.loading': 'Cargando…',
  'artist.noSongsSent': 'Aún no has enviado ninguna canción. Pulsa "Subir música" para empezar.',
  'artist.inReviewBadge': 'En revisión', 'artist.scheduledBadge': 'Programada',
  'artist.publishedBadge': 'Publicada', 'artist.rejectedBadge': 'Rechazada',
  'artist.removedBadge': 'Eliminada',
  'artist.editAndResend': 'Editar y reenviar',
  'artist.rejectionReasonsTitle': 'Su lanzamiento no se puede llevar a cabo por los siguientes motivos:',
  'artist.removedTitle': 'Tu canción ha sido eliminada del catálogo de Yusiop',
  'artist.removedDesc': 'El equipo de administración ha retirado tu canción del catálogo. Si necesitas más información, ponte en contacto con soporte.',
  'artist.scheduledTitle': 'Lanzamiento programado',
  'artist.scheduledDesc': 'se publicará automáticamente el',
  // Admin sidebar extras
  'admin.management': 'Gestión', 'admin.backToApp': 'Volver a la app',
  'admin.signOut': 'Cerrar Sesión', 'admin.signOutLabel': 'Cerrar Sesión',
};

const en: Dict = {
  'nav.home': 'Home', 'nav.qr': 'QR', 'nav.catalog': 'Catalog', 'nav.library': 'Library', 'nav.profile': 'Profile',
  'home.hero.title': 'Your music,\nin high fidelity',
  'home.hero.subtitle': 'Scan, discover and collect. A sound experience designed for you.',
  'home.hero.scan': 'Scan card', 'home.hero.explore': 'Explore music',
  'home.section.recent': 'Featured releases', 'home.section.trending': 'Trending',
  'home.section.cards': 'Featured cards', 'home.section.activity': 'Community activity',
  'home.section.foryou': 'For you', 'home.footer.cta': 'Your sound awaits',
  'catalog.title': 'Catalog', 'catalog.search': 'Search songs...',
  'catalog.filter.all': 'All', 'catalog.empty': 'No songs found',
  'catalog.upcoming': 'Coming soon', 'catalog.releaseIn': 'Available in',
  'catalog.popular': 'Popular', 'catalog.allSongs': 'All songs',
  'catalog.noResults': 'No results', 'catalog.loading': 'Loading catalog...',
  'library.title': 'My Library', 'library.empty': 'You have no songs yet',
  'library.downloads': 'Downloads', 'library.favorites': 'Favorites',
  'library.tab.all': 'All', 'library.tab.cards': 'Cards',
  'library.tab.recent': 'Recent', 'library.tab.favorites': 'Favorites',
  'library.discoverMusic': 'Discover new music in the catalog',
  'library.goCatalog': 'Go to catalog', 'library.goStore': 'Go to store',
  'library.delete': 'Delete', 'library.share': 'Share',
  'library.confirmDelete': 'Delete song?', 'library.confirmDeleteDesc': 'This action cannot be undone.',
  'library.shareTitle': 'Gift song', 'library.shareDesc': 'Send this song to another user.',
  'library.recipientUser': 'Recipient username', 'library.send': 'Send',
  'library.bulkDelete': 'Delete selected', 'library.bulkShare': 'Share selected',
  'library.selectAll': 'Select all', 'library.cancelSelection': 'Cancel',
  'library.itemsSelected': 'selected', 'library.deleted': 'Song deleted',
  'library.shared': 'Song shared',
  'profile.title': 'My Profile', 'profile.cards': 'My Cards',
  'profile.history': 'History', 'profile.settings': 'Settings',
  'profile.logout': 'Logout', 'profile.artistMode': 'Artist Mode',
  'profile.account': 'Account', 'profile.personalInfo': 'Personal info',
  'profile.username': 'Username', 'profile.fullName': 'Full name',
  'profile.email': 'Email', 'profile.birthYear': 'Birth year',
  'profile.gender': 'Gender', 'profile.male': 'Male',
  'profile.female': 'Female', 'profile.other': 'Other',
  'profile.preferNotSay': 'Prefer not to say', 'profile.edit': 'Edit',
  'profile.save': 'Save', 'profile.cancel': 'Cancel',
  'profile.changePhoto': 'Change photo', 'profile.uploading': 'Uploading...',
  'profile.activatedCards': 'Activated cards', 'profile.totalDownloads': 'Total downloads',
  'profile.remainingDownloads': 'Remaining downloads', 'profile.preferences': 'Preferences',
  'profile.theme.light': 'Light', 'profile.theme.dark': 'Dark', 'profile.theme.system': 'System',
  'profile.wifiOnly': 'Wi-Fi only', 'profile.wifiOnlyDesc': 'Download only on Wi-Fi',
  'profile.notifEnable': 'Notifications', 'profile.notifDesc': 'Receive app alerts',
  'profile.adminPanel': 'Admin Panel', 'profile.staffPanel': 'Staff Panel',
  'profile.accessPanel': 'Open panel',
  'profile.logoutConfirm': 'Log out?', 'profile.logoutSuccess': 'Logged out',
  'profile.scannedHistory': 'Card history', 'profile.noScannedCards': 'No scanned cards',
  'profile.scanFirst': 'Scan your first card', 'profile.creditsLeft': 'credits left',
  'profile.expires': 'Expires', 'profile.cardExpired': 'Expired', 'profile.cardActive': 'Active',
  'qr.scan.title': 'Scan QR', 'qr.scan.instruction': 'Center the QR code in the frame',
  'qr.manual.title': 'Manual code', 'qr.manual.placeholder': 'Enter your card code',
  'qr.activate': 'Activate', 'qr.success': 'Card activated successfully!',
  'qr.error': 'Error activating card',
  'qr.startCamera': 'Start camera', 'qr.stopCamera': 'Stop camera',
  'qr.cameraError': 'Could not access the camera',
  'qr.activating': 'Activating...', 'qr.invalidCode': 'Invalid code',
  'qr.mustLogin': 'You must log in to activate a card',
  'qr.creditsAvailable': 'credits available',
  'card.standard': 'Standard', 'card.premium': 'Premium', 'card.downloads': 'downloads',
  'card.redeem': 'Redeem', 'card.copy': 'Copy', 'card.copied': 'Copied!',
  'card.gift': 'Gift', 'card.delete': 'Delete',
  'card.myCards': 'My cards', 'card.noCards': 'You have no cards yet',
  'card.buyFirst': 'Buy your first card', 'card.code': 'Code',
  'card.giftTo': 'Gift to', 'card.giftMessage': 'Message (optional)',
  'card.confirmGift': 'Confirm gift', 'card.giftSent': 'Card sent',
  'card.confirmDelete': 'Delete card?', 'card.confirmDeleteDesc': 'You will not be able to recover it.',
  'card.deleted': 'Card deleted', 'card.activated': 'Activated', 'card.notActivated': 'Not activated',
  'store.title': 'Store', 'store.buy': 'Buy', 'store.gift': 'Gift', 'store.price': 'Price',
  'store.giftToggle': 'Gift to someone else', 'store.giftRecipient': 'Recipient email',
  'store.giftMessage': 'Personal message (optional)',
  'store.checkout': 'Checkout', 'store.processing': 'Processing...',
  'store.confirming': 'Confirming purchase...',
  'store.purchaseSuccess': 'Purchase complete! Activate your card to start.',
  'store.purchaseGiftSuccess': 'Gift sent successfully!',
  'store.purchaseCancelled': 'Purchase cancelled',
  'store.perks.downloads': 'downloads', 'store.perks.maxQuality': 'Maximum quality',
  'store.perks.noExpiry': 'No expiry', 'store.perks.priorityAccess': 'Priority access',
  'store.tagline': 'Choose your card and start collecting',
  'settings.title': 'Settings', 'settings.language': 'Language',
  'settings.languageLabel': 'Select your language', 'settings.notifications': 'Notifications',
  'settings.theme': 'Theme', 'settings.save': 'Save',
  'settings.general': 'General', 'settings.appearance': 'Appearance',
  'notif.newSong': 'New song available', 'notif.gift': 'You received a gift card!',
  'notif.approved': 'Your song was approved',
  'notif.title': 'Notifications', 'notif.empty': 'You have no notifications',
  'notif.markAllRead': 'Mark all as read', 'notif.viewAll': 'View all',
  'action.play': 'Play', 'action.download': 'Download', 'action.share': 'Share',
  'action.gift': 'Gift', 'action.cancel': 'Cancel', 'action.confirm': 'Confirm',
  'action.close': 'Close', 'action.save': 'Save', 'action.copy': 'Copy',
  'action.scan': 'Scan', 'action.redeem': 'Redeem',
  'action.delete': 'Delete', 'action.edit': 'Edit', 'action.continue': 'Continue',
  'action.back': 'Back', 'action.send': 'Send', 'action.search': 'Search',
  'action.upload': 'Upload', 'action.retry': 'Retry',
  'state.loading': 'Loading...', 'state.error': 'Something went wrong',
  'state.empty': 'No content', 'state.success': 'Success!',
  'auth.signin': 'Sign in', 'auth.signup': 'Sign up',
  'auth.email': 'Email', 'auth.password': 'Password',
  'auth.confirmPassword': 'Repeat', 'auth.username': 'Username',
  'auth.signinBtn': 'Enter', 'auth.signupBtn': 'Create account',
  'auth.signingIn': 'Signing in…', 'auth.signingUp': 'Creating…',
  'auth.welcome': 'Welcome!', 'auth.signinError': 'Sign-in error',
  'auth.signupError': 'Sign-up error', 'auth.passwordsDontMatch': 'Passwords do not match',
  'auth.emailRegistered': 'This email is already registered. Sign in instead.',
  'auth.accountCreated': 'Account created! We sent you an email to confirm.',
  'auth.tagline': 'Scan · Sync · Play',
  'mode.user': 'User', 'mode.artist': 'Artist',
  'mode.switch': 'Switch mode', 'mode.becomeArtist': 'Become an artist',
  'mode.requestPending': 'Request pending', 'mode.requestRejected': 'Request rejected',
  'artist.dashboard': 'Artist dashboard', 'artist.stats': 'Statistics',
  'artist.submissions': 'My submissions', 'artist.collaborations': 'Collaborations',
  'artist.uploadSong': 'Upload song', 'artist.mySongs': 'My songs',
  'artist.totalPlays': 'Total plays', 'artist.totalDownloads': 'Total downloads',
  'artist.totalEarnings': 'Total earnings',
  'artist.pending': 'Pending', 'artist.approved': 'Approved', 'artist.rejected': 'Rejected',
  'artist.published': 'Published', 'artist.title': 'Title',
  'artist.songTitle': 'Song title', 'artist.artistName': 'Artist name',
  'artist.album': 'Album', 'artist.genre': 'Genre', 'artist.duration': 'Duration',
  'artist.coverImage': 'Cover', 'artist.audioFile': 'Audio file',
  'artist.releaseDate': 'Release date',
  'artist.submit': 'Submit', 'artist.submitting': 'Submitting...',
  'artist.submitted': 'Song submitted for review',
  'artist.welcome': 'Welcome to the artist panel',
  'artist.becomeArtistTitle': 'Become an artist',
  'artist.becomeArtistDesc': 'Upload your music and share it with the community.',
  'artist.requestArtist': 'Request artist access',
  'admin.dashboard': 'Dashboard', 'admin.users': 'Users', 'admin.songs': 'Songs',
  'admin.albums': 'Albums', 'admin.qrCards': 'QR Cards', 'admin.monetization': 'Monetization',
  'admin.settings': 'Settings', 'admin.salesSimulator': 'Sales simulator',
  'admin.artistRequests': 'Artist requests', 'admin.songSubmissions': 'Song submissions',
  'admin.downloads': 'Downloads', 'admin.collaborationClaims': 'Collaboration claims',
  'admin.panel': 'Admin panel', 'admin.totalUsers': 'Total users',
  'admin.totalSongs': 'Total songs', 'admin.totalCards': 'Total cards',
  'admin.totalRevenue': 'Total revenue', 'admin.recentActivity': 'Recent activity',
  'admin.approve': 'Approve', 'admin.reject': 'Reject', 'admin.review': 'Review',
  'admin.create': 'Create', 'admin.update': 'Update',
  'admin.actions': 'Actions', 'admin.status': 'Status', 'admin.created': 'Created',
  'app.tagline': 'Every song tells a story',
  'app.copyright': '© Yusiop 2026', 'app.madeForSound': 'Made for sound',
  'common.yes': 'Yes', 'common.no': 'No', 'common.all': 'All', 'common.none': 'None',
  'common.from': 'From', 'common.to': 'To', 'common.date': 'Date', 'common.time': 'Time',
  'common.optional': 'optional', 'common.required': 'required',
  'home.heroHighlight': 'in high fidelity', 'home.viewAll': 'View all →',
  'home.new': 'NEW', 'home.mostPlayed': 'Most played',
  'home.collection': 'Collection', 'home.recommended': 'Recommended',
  'home.shareMusic': 'Share music', 'home.shareMusicDesc': 'Gift songs to your friends',
  'home.anytime': 'Anytime', 'home.topDownloaded': 'Top downloaded',
  'home.discoverRanking': 'Discover the ranking', 'home.live': 'Live',
  'home.receiveGifts': 'Receive gifts', 'home.receiveGiftsDesc': 'Redeem codes from friends',
  'home.free': 'Free', 'home.upcomingReleases': 'Releases coming soon',
  'home.recsSoon': 'Recommendations coming soon', 'home.releasesSoon': 'Releases coming soon',
  'home.noTrending': 'No trending yet',
  'catalog.searchPlaceholder': 'Search title, artist or album…',
  'catalog.balance': 'Your balance', 'catalog.downloadsCardLabel': 'downloads · card',
  'catalog.noCredits': 'No credits available', 'catalog.buyCard': 'Buy card',
  'catalog.upcomingTitle': 'Upcoming releases', 'catalog.comingSoonBadge': 'Coming soon',
  'catalog.purchaseSuccess': '🎉 Thanks for your purchase! Your card will be available in seconds.',
  'catalog.noResultsFor': 'No results for',
  'catalog.subtitle': 'Discover and download your favorite music.',
  'catalog.errorNoCredits': 'You have no credits. Scan a QR card to get more.',
  'catalog.errorMustLogin': 'You must sign in to download songs',
  'catalog.errorDownload': 'Error downloading the song',
  'catalog.downloadOk': 'downloaded successfully',
  'store.subtitle': 'Buy digital cards to download your music',
  'store.giftBuy': 'Buy as a gift',
  'store.recipientPlaceholder': 'friend@example.com',
  'store.messagePlaceholder': 'Enjoy the music!',
  'store.payButton': 'Pay', 'store.payAsGift': 'as a gift',
  'store.simulate': 'Simulate purchase (no payment)',
  'store.simulateNote': 'Secure payment with Stripe · Simulation creates the card instantly',
  'store.standardLabel': 'YUSIOP Standard', 'store.premiumLabel': 'YUSIOP Premium',
  'store.confirmingTitle': 'Confirming your purchase…',
  'store.confirmingDesc': 'We are activating your card. This may take a few seconds.',
  'store.invalidEmail': 'Enter a valid email for the recipient.',
  'store.errorStartPay': 'Error starting payment',
  'store.errorSimulate': 'Error simulating the purchase',
  'store.giftLinkCopied': '🎁 Gift created. Redemption link copied to clipboard.',
  'cards.viewDetails': 'View card details',
  'cards.depleted': 'Delete depleted card', 'cards.deleteDepleted': 'Delete depleted card',
  'cards.giftCardTitle': 'Gift card',
  'cards.giftCardDesc': "The card will move to the recipient's library and leave yours. This action cannot be undone.",
  'cards.recipientUsername': 'Recipient username',
  'cards.giftPlaceholder': 'Enjoy the music!',
  'cards.giftThis': 'Gift this card',
  'cards.cardLabel': 'Card', 'cards.downloadsLabel': 'Downloads',
  'cards.activatedLabel': 'Activated', 'cards.digital': 'Digital', 'cards.physical': 'Physical',
  'cards.giftBadge': 'Gift', 'cards.codeCopied': 'Code copied to clipboard',
  'cards.copyError': 'Could not copy the code',
  'cards.removedFromLibrary': 'Card removed from your library',
  'cards.enterUsername': 'Enter the recipient username',
  'cards.giftError': 'Could not gift the card',
  'cards.giftSuccess': 'Card gifted',
  'cards.sending': 'Sending...', 'cards.confirmGift': 'Confirm gift',
  'cards.cardActivatedDate': 'Activated on',
  'cards.downloadsRemaining': 'Downloads remaining',
  'cards.tapRedeem': 'Tap "Redeem" to activate the card in the scanner',
  'notif.markRead': 'Mark read', 'notif.empty2': 'You have no notifications',
  'player.nowPlaying': 'Now playing', 'player.playing': 'Playing',
  'player.minimize': 'Minimize', 'player.share': 'Share',
  'player.cast': 'Send to TV or device',
  'player.castConnected': 'Connected to', 'player.castAvailable': 'Devices available',
  'player.castConnecting': 'Connecting…', 'player.castSearch': 'Search devices',
  'player.shuffle': 'Shuffle', 'player.previous': 'Previous', 'player.next': 'Next',
  'player.repeat': 'Repeat', 'player.play': 'Play', 'player.pause': 'Pause',
  'player.fav': 'Add to favorites', 'player.unfav': 'Remove from favorites',
  'player.linkCopied': 'Link copied to clipboard',
  'player.shareError': 'Could not share',
  'player.castNoDevices': 'No devices found. Make sure you are on the same Wi-Fi as your TV or Chromecast.',
  'player.castOpenError': 'Could not open the device picker',
  'player.disconnectedFrom': 'Disconnected from',
  'player.localRestored': 'Local playback restored',
  'player.shareText': '🎵 Listen to',
  'player.favAdded': 'Added to favorites', 'player.favRemoved': 'Removed from favorites',
  'player.favError': 'Could not update favorite',
  'player.loginToFav': 'Sign in to save favorites',
  'player.errorPlayback': 'Could not play the audio',
  'player.noAudio': 'This song has no audio file',
  'player.errorStart': 'Could not start playback',
  'player.errorPause': 'Could not pause the audio',
  'artist.userMode': 'User Mode', 'artist.welcomeEyebrow': 'Welcome',
  'artist.dashboardSubtitle': 'Manage your catalog, upload music and review stats.',
  'artist.uploadMusic': 'Upload music', 'artist.viewSubmissions': 'My submissions',
  'artist.inReview': 'in review',
  'artist.songsCardDesc': 'Upload new songs and check the status of your submissions.',
  'artist.albumsTitle': 'My albums', 'artist.albumsDesc': 'Create albums and EPs. Coming soon.',
  'artist.statsCardTitle': 'Statistics',
  'artist.statsCardDesc': 'Downloads, revenue, countries and audience demographics.',
  'artist.collabsCardDesc': "Claim your share of monetization on songs where you appear as a collaborator.",
  'artist.noAccess': "You don't have access to the artist panel.",
  'artist.requestProfile': 'Request artist profile',
  'artist.panelLabel': 'Artist panel', 'artist.statsLabel': 'Statistics',
  'artist.audienceEyebrow': 'Your audience',
  'artist.audienceSubtitle': 'Downloads, estimated revenue and where they listen from.',
  'artist.totalDownloadsLabel': 'Total downloads',
  'artist.uniqueListeners': 'Unique listeners',
  'artist.estIncome': 'Estimated revenue (your share)',
  'artist.real': 'Real', 'artist.realDesc': 'Generate revenue',
  'artist.promo': 'Promotional', 'artist.promoDesc': 'Your own music',
  'artist.suspicious': 'Suspicious', 'artist.suspiciousDesc': 'Excluded from revenue',
  'artist.poolPending': 'Pending in shared pool (unclaimed)',
  'artist.poolDesc': 'downloads affected',
  'artist.poolGoClaim': 'Go claim',
  'artist.last30Days': 'Last 30 days',
  'artist.noDownloads30': 'No downloads in the last 30 days.',
  'artist.topSongs': 'Top songs',
  'artist.noDownloadsYet': 'No downloads yet.',
  'artist.countries': 'Countries', 'artist.top': 'Top',
  'artist.noGeo': 'No geographic data yet.',
  'artist.geoNote': 'Location is taken from the IP at the time of download (approximate).',
  'artist.age': 'Age', 'artist.gender': 'Gender',
  'artist.noData': 'No data.',
  'artist.profileNotFound': 'No approved artist profile found.',
  'artist.collabsTitle': 'Collaboration shared pool',
  'artist.collabsEyebrow': 'Claim your splits',
  'artist.collabsSubtitle': 'These are songs where another artist included you as a collaborator. Claim your share and an admin will review it.',
  'artist.totalEstPending': 'Total estimated pending',
  'artist.noPendingCollabs': 'No pending collaborations under your artist name.',
  'artist.claimed': 'Claimed', 'artist.claim': 'Claim',
  'artist.mySubmissionsRequests': 'My requests',
  'artist.as': 'As', 'artist.downloadsWord': 'downloads',
  'artist.estimated': 'estimated',
  'artist.errorLoadingPool': 'Error loading pool',
  'artist.subsTitle': 'Submitted songs', 'artist.subsEyebrow': 'My submissions',
  'artist.subsSubtitle': 'Track the review status of your catalog submissions.',
  'artist.loading': 'Loading…',
  'artist.noSongsSent': 'You have not submitted any song yet. Tap "Upload music" to start.',
  'artist.inReviewBadge': 'In review', 'artist.scheduledBadge': 'Scheduled',
  'artist.publishedBadge': 'Published', 'artist.rejectedBadge': 'Rejected',
  'artist.removedBadge': 'Removed',
  'artist.editAndResend': 'Edit and resubmit',
  'artist.rejectionReasonsTitle': 'Your release cannot proceed for the following reasons:',
  'artist.removedTitle': 'Your song has been removed from the Yusiop catalog',
  'artist.removedDesc': 'The admin team removed your song from the catalog. Contact support if you need more info.',
  'artist.scheduledTitle': 'Scheduled release',
  'artist.scheduledDesc': 'will be published automatically on',
  'admin.management': 'Management', 'admin.backToApp': 'Back to app',
  'admin.signOut': 'Sign Out', 'admin.signOutLabel': 'Sign Out',
};

const fr: Dict = {
  'nav.home': 'Accueil', 'nav.qr': 'QR', 'nav.catalog': 'Catalogue', 'nav.library': 'Bibliothèque', 'nav.profile': 'Profil',
  'home.hero.title': 'Votre musique,\nen haute fidélité',
  'home.hero.subtitle': 'Scannez, découvrez et collectionnez. Une expérience sonore pensée pour vous.',
  'home.hero.scan': 'Scanner carte', 'home.hero.explore': 'Explorer',
  'home.section.recent': 'Sorties récentes', 'home.section.trending': 'Tendances',
  'home.section.cards': 'Cartes en vedette', 'home.section.activity': 'Activité communautaire',
  'home.section.foryou': 'Pour vous', 'home.footer.cta': 'Votre son vous attend',
  'catalog.title': 'Catalogue', 'catalog.search': 'Rechercher...',
  'catalog.filter.all': 'Tout', 'catalog.empty': 'Aucune chanson trouvée',
  'catalog.upcoming': 'Prochainement', 'catalog.releaseIn': 'Disponible dans',
  'catalog.popular': 'Populaires', 'catalog.allSongs': 'Toutes les chansons',
  'catalog.noResults': 'Aucun résultat', 'catalog.loading': 'Chargement du catalogue...',
  'library.title': 'Ma Bibliothèque', 'library.empty': "Vous n'avez pas encore de chansons",
  'library.downloads': 'Téléchargements', 'library.favorites': 'Favoris',
  'library.tab.all': 'Toutes', 'library.tab.cards': 'Cartes',
  'library.tab.recent': 'Récentes', 'library.tab.favorites': 'Favoris',
  'library.discoverMusic': 'Découvrez de la nouvelle musique dans le catalogue',
  'library.goCatalog': 'Aller au catalogue', 'library.goStore': 'Aller à la boutique',
  'library.delete': 'Supprimer', 'library.share': 'Partager',
  'library.confirmDelete': 'Supprimer la chanson ?', 'library.confirmDeleteDesc': 'Cette action est irréversible.',
  'library.shareTitle': 'Offrir la chanson', 'library.shareDesc': 'Envoyez cette chanson à un autre utilisateur.',
  'library.recipientUser': "Nom d'utilisateur destinataire", 'library.send': 'Envoyer',
  'library.bulkDelete': 'Supprimer la sélection', 'library.bulkShare': 'Partager la sélection',
  'library.selectAll': 'Tout sélectionner', 'library.cancelSelection': 'Annuler',
  'library.itemsSelected': 'sélectionnées', 'library.deleted': 'Chanson supprimée',
  'library.shared': 'Chanson partagée',
  'profile.title': 'Mon Profil', 'profile.cards': 'Mes Cartes',
  'profile.history': 'Historique', 'profile.settings': 'Paramètres',
  'profile.logout': 'Déconnexion', 'profile.artistMode': 'Mode Artiste',
  'profile.account': 'Compte', 'profile.personalInfo': 'Infos personnelles',
  'profile.username': "Nom d'utilisateur", 'profile.fullName': 'Nom complet',
  'profile.email': 'Email', 'profile.birthYear': 'Année de naissance',
  'profile.gender': 'Genre', 'profile.male': 'Masculin',
  'profile.female': 'Féminin', 'profile.other': 'Autre',
  'profile.preferNotSay': 'Préfère ne pas dire', 'profile.edit': 'Modifier',
  'profile.save': 'Enregistrer', 'profile.cancel': 'Annuler',
  'profile.changePhoto': 'Changer la photo', 'profile.uploading': 'Envoi...',
  'profile.activatedCards': 'Cartes activées', 'profile.totalDownloads': 'Téléchargements totaux',
  'profile.remainingDownloads': 'Téléchargements restants', 'profile.preferences': 'Préférences',
  'profile.theme.light': 'Clair', 'profile.theme.dark': 'Sombre', 'profile.theme.system': 'Système',
  'profile.wifiOnly': 'Wi-Fi uniquement', 'profile.wifiOnlyDesc': 'Téléchargements en Wi-Fi seulement',
  'profile.notifEnable': 'Notifications', 'profile.notifDesc': "Recevoir les alertes de l'app",
  'profile.adminPanel': 'Panneau Admin', 'profile.staffPanel': 'Panneau Staff',
  'profile.accessPanel': 'Ouvrir le panneau',
  'profile.logoutConfirm': 'Se déconnecter ?', 'profile.logoutSuccess': 'Déconnecté',
  'profile.scannedHistory': 'Historique des cartes', 'profile.noScannedCards': 'Aucune carte scannée',
  'profile.scanFirst': 'Scannez votre première carte', 'profile.creditsLeft': 'crédits restants',
  'profile.expires': 'Expire', 'profile.cardExpired': 'Expirée', 'profile.cardActive': 'Active',
  'qr.scan.title': 'Scanner QR', 'qr.scan.instruction': 'Centrez le code QR dans le cadre',
  'qr.manual.title': 'Code manuel', 'qr.manual.placeholder': 'Entrez le code de votre carte',
  'qr.activate': 'Activer', 'qr.success': 'Carte activée avec succès !',
  'qr.error': "Erreur lors de l'activation",
  'qr.startCamera': 'Démarrer la caméra', 'qr.stopCamera': 'Arrêter la caméra',
  'qr.cameraError': "Impossible d'accéder à la caméra",
  'qr.activating': 'Activation...', 'qr.invalidCode': 'Code invalide',
  'qr.mustLogin': 'Vous devez vous connecter pour activer une carte',
  'qr.creditsAvailable': 'crédits disponibles',
  'card.standard': 'Standard', 'card.premium': 'Premium', 'card.downloads': 'téléchargements',
  'card.redeem': 'Utiliser', 'card.copy': 'Copier', 'card.copied': 'Copié !',
  'card.gift': 'Offrir', 'card.delete': 'Supprimer',
  'card.myCards': 'Mes cartes', 'card.noCards': "Vous n'avez pas encore de cartes",
  'card.buyFirst': 'Achetez votre première carte', 'card.code': 'Code',
  'card.giftTo': 'Offrir à', 'card.giftMessage': 'Message (optionnel)',
  'card.confirmGift': 'Confirmer le cadeau', 'card.giftSent': 'Carte envoyée',
  'card.confirmDelete': 'Supprimer la carte ?', 'card.confirmDeleteDesc': 'Vous ne pourrez pas la récupérer.',
  'card.deleted': 'Carte supprimée', 'card.activated': 'Activée', 'card.notActivated': 'Non activée',
  'store.title': 'Boutique', 'store.buy': 'Acheter', 'store.gift': 'Offrir', 'store.price': 'Prix',
  'store.giftToggle': "Offrir à quelqu'un", 'store.giftRecipient': 'Email du destinataire',
  'store.giftMessage': 'Message personnel (optionnel)',
  'store.checkout': 'Aller au paiement', 'store.processing': 'Traitement...',
  'store.confirming': "Confirmation de l'achat...",
  'store.purchaseSuccess': 'Achat terminé ! Activez votre carte pour commencer.',
  'store.purchaseGiftSuccess': 'Cadeau envoyé avec succès !',
  'store.purchaseCancelled': 'Achat annulé',
  'store.perks.downloads': 'téléchargements', 'store.perks.maxQuality': 'Qualité maximale',
  'store.perks.noExpiry': 'Sans expiration', 'store.perks.priorityAccess': 'Accès prioritaire',
  'store.tagline': 'Choisissez votre carte et commencez à collectionner',
  'settings.title': 'Paramètres', 'settings.language': 'Langue',
  'settings.languageLabel': 'Sélectionnez votre langue', 'settings.notifications': 'Notifications',
  'settings.theme': 'Thème', 'settings.save': 'Enregistrer',
  'settings.general': 'Général', 'settings.appearance': 'Apparence',
  'notif.newSong': 'Nouvelle chanson disponible', 'notif.gift': 'Vous avez reçu une carte cadeau !',
  'notif.approved': 'Votre chanson a été approuvée',
  'notif.title': 'Notifications', 'notif.empty': 'Aucune notification',
  'notif.markAllRead': 'Tout marquer comme lu', 'notif.viewAll': 'Voir tout',
  'action.play': 'Lecture', 'action.download': 'Télécharger', 'action.share': 'Partager',
  'action.gift': 'Offrir', 'action.cancel': 'Annuler', 'action.confirm': 'Confirmer',
  'action.close': 'Fermer', 'action.save': 'Enregistrer', 'action.copy': 'Copier',
  'action.scan': 'Scanner', 'action.redeem': 'Utiliser',
  'action.delete': 'Supprimer', 'action.edit': 'Modifier', 'action.continue': 'Continuer',
  'action.back': 'Retour', 'action.send': 'Envoyer', 'action.search': 'Rechercher',
  'action.upload': 'Téléverser', 'action.retry': 'Réessayer',
  'state.loading': 'Chargement...', 'state.error': "Une erreur s'est produite",
  'state.empty': 'Aucun contenu', 'state.success': 'Succès !',
  'auth.signin': 'Connexion', 'auth.signup': 'Inscription',
  'auth.email': 'Email', 'auth.password': 'Mot de passe',
  'auth.confirmPassword': 'Répéter', 'auth.username': "Nom d'utilisateur",
  'auth.signinBtn': 'Entrer', 'auth.signupBtn': 'Créer un compte',
  'auth.signingIn': 'Connexion…', 'auth.signingUp': 'Création…',
  'auth.welcome': 'Bienvenue !', 'auth.signinError': 'Erreur de connexion',
  'auth.signupError': "Erreur d'inscription", 'auth.passwordsDontMatch': 'Les mots de passe ne correspondent pas',
  'auth.emailRegistered': 'Cet email est déjà enregistré. Connectez-vous.',
  'auth.accountCreated': 'Compte créé ! Nous vous avons envoyé un email de confirmation.',
  'auth.tagline': 'Scan · Sync · Play',
  'mode.user': 'Utilisateur', 'mode.artist': 'Artiste',
  'mode.switch': 'Changer de mode', 'mode.becomeArtist': 'Devenir artiste',
  'mode.requestPending': 'Demande en attente', 'mode.requestRejected': 'Demande rejetée',
  'artist.dashboard': "Tableau de bord artiste", 'artist.stats': 'Statistiques',
  'artist.submissions': 'Mes envois', 'artist.collaborations': 'Collaborations',
  'artist.uploadSong': 'Téléverser une chanson', 'artist.mySongs': 'Mes chansons',
  'artist.totalPlays': 'Lectures totales', 'artist.totalDownloads': 'Téléchargements totaux',
  'artist.totalEarnings': 'Gains totaux',
  'artist.pending': 'En attente', 'artist.approved': 'Approuvée', 'artist.rejected': 'Rejetée',
  'artist.published': 'Publiée', 'artist.title': 'Titre',
  'artist.songTitle': 'Titre de la chanson', 'artist.artistName': "Nom d'artiste",
  'artist.album': 'Album', 'artist.genre': 'Genre', 'artist.duration': 'Durée',
  'artist.coverImage': 'Pochette', 'artist.audioFile': 'Fichier audio',
  'artist.releaseDate': 'Date de sortie',
  'artist.submit': 'Envoyer', 'artist.submitting': 'Envoi...',
  'artist.submitted': 'Chanson envoyée pour révision',
  'artist.welcome': 'Bienvenue sur le panneau artiste',
  'artist.becomeArtistTitle': 'Devenez artiste',
  'artist.becomeArtistDesc': 'Téléversez votre musique et partagez-la avec la communauté.',
  'artist.requestArtist': "Demander l'accès artiste",
  'admin.dashboard': 'Tableau de bord', 'admin.users': 'Utilisateurs', 'admin.songs': 'Chansons',
  'admin.albums': 'Albums', 'admin.qrCards': 'Cartes QR', 'admin.monetization': 'Monétisation',
  'admin.settings': 'Paramètres', 'admin.salesSimulator': 'Simulateur de ventes',
  'admin.artistRequests': 'Demandes des artistes', 'admin.songSubmissions': 'Envois de chansons',
  'admin.downloads': 'Téléchargements', 'admin.collaborationClaims': 'Réclamations de collaboration',
  'admin.panel': 'Panneau admin', 'admin.totalUsers': 'Utilisateurs totaux',
  'admin.totalSongs': 'Chansons totales', 'admin.totalCards': 'Cartes totales',
  'admin.totalRevenue': 'Revenus totaux', 'admin.recentActivity': 'Activité récente',
  'admin.approve': 'Approuver', 'admin.reject': 'Rejeter', 'admin.review': 'Réviser',
  'admin.create': 'Créer', 'admin.update': 'Mettre à jour',
  'admin.actions': 'Actions', 'admin.status': 'Statut', 'admin.created': 'Créé',
  'app.tagline': 'Chaque chanson raconte une histoire',
  'app.copyright': '© Yusiop 2026', 'app.madeForSound': 'Made for sound',
  'common.yes': 'Oui', 'common.no': 'Non', 'common.all': 'Tout', 'common.none': 'Aucun',
  'common.from': 'De', 'common.to': 'À', 'common.date': 'Date', 'common.time': 'Heure',
  'common.optional': 'optionnel', 'common.required': 'requis',
};

const pt: Dict = {
  'nav.home': 'Início', 'nav.qr': 'QR', 'nav.catalog': 'Catálogo', 'nav.library': 'Biblioteca', 'nav.profile': 'Perfil',
  'home.hero.title': 'Sua música,\nem alta fidelidade',
  'home.hero.subtitle': 'Escaneie, descubra e colecione. Uma experiência sonora pensada para você.',
  'home.hero.scan': 'Escanear cartão', 'home.hero.explore': 'Explorar música',
  'home.section.recent': 'Lançamentos em destaque', 'home.section.trending': 'Em alta',
  'home.section.cards': 'Cartões em destaque', 'home.section.activity': 'Atividade da comunidade',
  'home.section.foryou': 'Para você', 'home.footer.cta': 'Seu som espera por você',
  'catalog.title': 'Catálogo', 'catalog.search': 'Buscar músicas...',
  'catalog.filter.all': 'Tudo', 'catalog.empty': 'Nenhuma música encontrada',
  'catalog.upcoming': 'Em breve', 'catalog.releaseIn': 'Disponível em',
  'catalog.popular': 'Populares', 'catalog.allSongs': 'Todas as músicas',
  'catalog.noResults': 'Sem resultados', 'catalog.loading': 'Carregando catálogo...',
  'library.title': 'Minha Biblioteca', 'library.empty': 'Você ainda não tem músicas',
  'library.downloads': 'Downloads', 'library.favorites': 'Favoritos',
  'library.tab.all': 'Todas', 'library.tab.cards': 'Cartões',
  'library.tab.recent': 'Recentes', 'library.tab.favorites': 'Favoritos',
  'library.discoverMusic': 'Descubra novas músicas no catálogo',
  'library.goCatalog': 'Ir ao catálogo', 'library.goStore': 'Ir à loja',
  'library.delete': 'Excluir', 'library.share': 'Compartilhar',
  'library.confirmDelete': 'Excluir música?', 'library.confirmDeleteDesc': 'Esta ação não pode ser desfeita.',
  'library.shareTitle': 'Presentear música', 'library.shareDesc': 'Envie esta música para outro usuário.',
  'library.recipientUser': 'Usuário destinatário', 'library.send': 'Enviar',
  'library.bulkDelete': 'Excluir selecionadas', 'library.bulkShare': 'Compartilhar selecionadas',
  'library.selectAll': 'Selecionar tudo', 'library.cancelSelection': 'Cancelar',
  'library.itemsSelected': 'selecionadas', 'library.deleted': 'Música excluída',
  'library.shared': 'Música compartilhada',
  'profile.title': 'Meu Perfil', 'profile.cards': 'Meus Cartões',
  'profile.history': 'Histórico', 'profile.settings': 'Configurações',
  'profile.logout': 'Sair', 'profile.artistMode': 'Modo Artista',
  'profile.account': 'Conta', 'profile.personalInfo': 'Informações pessoais',
  'profile.username': 'Usuário', 'profile.fullName': 'Nome completo',
  'profile.email': 'Email', 'profile.birthYear': 'Ano de nascimento',
  'profile.gender': 'Gênero', 'profile.male': 'Masculino',
  'profile.female': 'Feminino', 'profile.other': 'Outro',
  'profile.preferNotSay': 'Prefiro não dizer', 'profile.edit': 'Editar',
  'profile.save': 'Salvar', 'profile.cancel': 'Cancelar',
  'profile.changePhoto': 'Mudar foto', 'profile.uploading': 'Enviando...',
  'profile.activatedCards': 'Cartões ativados', 'profile.totalDownloads': 'Downloads totais',
  'profile.remainingDownloads': 'Downloads restantes', 'profile.preferences': 'Preferências',
  'profile.theme.light': 'Claro', 'profile.theme.dark': 'Escuro', 'profile.theme.system': 'Sistema',
  'profile.wifiOnly': 'Apenas Wi-Fi', 'profile.wifiOnlyDesc': 'Downloads apenas com Wi-Fi',
  'profile.notifEnable': 'Notificações', 'profile.notifDesc': 'Receber alertas do app',
  'profile.adminPanel': 'Painel Admin', 'profile.staffPanel': 'Painel Staff',
  'profile.accessPanel': 'Abrir painel',
  'profile.logoutConfirm': 'Sair?', 'profile.logoutSuccess': 'Sessão encerrada',
  'profile.scannedHistory': 'Histórico de cartões', 'profile.noScannedCards': 'Sem cartões escaneados',
  'profile.scanFirst': 'Escaneie seu primeiro cartão', 'profile.creditsLeft': 'créditos restantes',
  'profile.expires': 'Expira', 'profile.cardExpired': 'Expirado', 'profile.cardActive': 'Ativo',
  'qr.scan.title': 'Escanear QR', 'qr.scan.instruction': 'Centralize o código QR no quadro',
  'qr.manual.title': 'Código manual', 'qr.manual.placeholder': 'Digite o código do seu cartão',
  'qr.activate': 'Ativar', 'qr.success': 'Cartão ativado com sucesso!',
  'qr.error': 'Erro ao ativar cartão',
  'qr.startCamera': 'Iniciar câmera', 'qr.stopCamera': 'Parar câmera',
  'qr.cameraError': 'Não foi possível acessar a câmera',
  'qr.activating': 'Ativando...', 'qr.invalidCode': 'Código inválido',
  'qr.mustLogin': 'Você precisa entrar para ativar um cartão',
  'qr.creditsAvailable': 'créditos disponíveis',
  'card.standard': 'Padrão', 'card.premium': 'Premium', 'card.downloads': 'downloads',
  'card.redeem': 'Resgatar', 'card.copy': 'Copiar', 'card.copied': 'Copiado!',
  'card.gift': 'Presentear', 'card.delete': 'Excluir',
  'card.myCards': 'Meus cartões', 'card.noCards': 'Você ainda não tem cartões',
  'card.buyFirst': 'Compre seu primeiro cartão', 'card.code': 'Código',
  'card.giftTo': 'Presentear a', 'card.giftMessage': 'Mensagem (opcional)',
  'card.confirmGift': 'Confirmar presente', 'card.giftSent': 'Cartão enviado',
  'card.confirmDelete': 'Excluir cartão?', 'card.confirmDeleteDesc': 'Você não poderá recuperá-lo.',
  'card.deleted': 'Cartão excluído', 'card.activated': 'Ativado', 'card.notActivated': 'Não ativado',
  'store.title': 'Loja', 'store.buy': 'Comprar', 'store.gift': 'Presentear', 'store.price': 'Preço',
  'store.giftToggle': 'Presentear outra pessoa', 'store.giftRecipient': 'Email do destinatário',
  'store.giftMessage': 'Mensagem personalizada (opcional)',
  'store.checkout': 'Ir ao pagamento', 'store.processing': 'Processando...',
  'store.confirming': 'Confirmando compra...',
  'store.purchaseSuccess': 'Compra concluída! Ative seu cartão para começar.',
  'store.purchaseGiftSuccess': 'Presente enviado com sucesso!',
  'store.purchaseCancelled': 'Compra cancelada',
  'store.perks.downloads': 'downloads', 'store.perks.maxQuality': 'Qualidade máxima',
  'store.perks.noExpiry': 'Sem validade', 'store.perks.priorityAccess': 'Acesso prioritário',
  'store.tagline': 'Escolha seu cartão e comece a colecionar',
  'settings.title': 'Configurações', 'settings.language': 'Idioma',
  'settings.languageLabel': 'Selecione seu idioma', 'settings.notifications': 'Notificações',
  'settings.theme': 'Tema', 'settings.save': 'Salvar',
  'settings.general': 'Geral', 'settings.appearance': 'Aparência',
  'notif.newSong': 'Nova música disponível', 'notif.gift': 'Você recebeu um cartão de presente!',
  'notif.approved': 'Sua música foi aprovada',
  'notif.title': 'Notificações', 'notif.empty': 'Sem notificações',
  'notif.markAllRead': 'Marcar todas como lidas', 'notif.viewAll': 'Ver todas',
  'action.play': 'Reproduzir', 'action.download': 'Download', 'action.share': 'Compartilhar',
  'action.gift': 'Presentear', 'action.cancel': 'Cancelar', 'action.confirm': 'Confirmar',
  'action.close': 'Fechar', 'action.save': 'Salvar', 'action.copy': 'Copiar',
  'action.scan': 'Escanear', 'action.redeem': 'Resgatar',
  'action.delete': 'Excluir', 'action.edit': 'Editar', 'action.continue': 'Continuar',
  'action.back': 'Voltar', 'action.send': 'Enviar', 'action.search': 'Buscar',
  'action.upload': 'Enviar', 'action.retry': 'Tentar novamente',
  'state.loading': 'Carregando...', 'state.error': 'Algo deu errado',
  'state.empty': 'Sem conteúdo', 'state.success': 'Sucesso!',
  'auth.signin': 'Entrar', 'auth.signup': 'Criar conta',
  'auth.email': 'Email', 'auth.password': 'Senha',
  'auth.confirmPassword': 'Repetir', 'auth.username': 'Usuário',
  'auth.signinBtn': 'Entrar', 'auth.signupBtn': 'Criar conta',
  'auth.signingIn': 'Entrando…', 'auth.signingUp': 'Criando…',
  'auth.welcome': 'Bem-vindo!', 'auth.signinError': 'Erro ao entrar',
  'auth.signupError': 'Erro ao registrar', 'auth.passwordsDontMatch': 'As senhas não coincidem',
  'auth.emailRegistered': 'Este email já está registrado. Entre.',
  'auth.accountCreated': 'Conta criada! Enviamos um email para confirmar.',
  'auth.tagline': 'Scan · Sync · Play',
  'mode.user': 'Usuário', 'mode.artist': 'Artista',
  'mode.switch': 'Alternar modo', 'mode.becomeArtist': 'Tornar-se artista',
  'mode.requestPending': 'Solicitação pendente', 'mode.requestRejected': 'Solicitação rejeitada',
  'artist.dashboard': 'Painel do artista', 'artist.stats': 'Estatísticas',
  'artist.submissions': 'Meus envios', 'artist.collaborations': 'Colaborações',
  'artist.uploadSong': 'Enviar música', 'artist.mySongs': 'Minhas músicas',
  'artist.totalPlays': 'Reproduções totais', 'artist.totalDownloads': 'Downloads totais',
  'artist.totalEarnings': 'Ganhos totais',
  'artist.pending': 'Pendente', 'artist.approved': 'Aprovada', 'artist.rejected': 'Rejeitada',
  'artist.published': 'Publicada', 'artist.title': 'Título',
  'artist.songTitle': 'Título da música', 'artist.artistName': 'Nome artístico',
  'artist.album': 'Álbum', 'artist.genre': 'Gênero', 'artist.duration': 'Duração',
  'artist.coverImage': 'Capa', 'artist.audioFile': 'Arquivo de áudio',
  'artist.releaseDate': 'Data de lançamento',
  'artist.submit': 'Enviar', 'artist.submitting': 'Enviando...',
  'artist.submitted': 'Música enviada para revisão',
  'artist.welcome': 'Bem-vindo ao painel do artista',
  'artist.becomeArtistTitle': 'Torne-se artista',
  'artist.becomeArtistDesc': 'Envie sua música e compartilhe com a comunidade.',
  'artist.requestArtist': 'Solicitar acesso de artista',
  'admin.dashboard': 'Painel', 'admin.users': 'Usuários', 'admin.songs': 'Músicas',
  'admin.albums': 'Álbuns', 'admin.qrCards': 'Cartões QR', 'admin.monetization': 'Monetização',
  'admin.settings': 'Ajustes', 'admin.salesSimulator': 'Simulador de vendas',
  'admin.artistRequests': 'Solicitações de artistas', 'admin.songSubmissions': 'Envios de músicas',
  'admin.downloads': 'Downloads', 'admin.collaborationClaims': 'Reivindicações de colaboração',
  'admin.panel': 'Painel admin', 'admin.totalUsers': 'Usuários totais',
  'admin.totalSongs': 'Músicas totais', 'admin.totalCards': 'Cartões totais',
  'admin.totalRevenue': 'Receita total', 'admin.recentActivity': 'Atividade recente',
  'admin.approve': 'Aprovar', 'admin.reject': 'Rejeitar', 'admin.review': 'Revisar',
  'admin.create': 'Criar', 'admin.update': 'Atualizar',
  'admin.actions': 'Ações', 'admin.status': 'Status', 'admin.created': 'Criado',
  'app.tagline': 'Cada música conta uma história',
  'app.copyright': '© Yusiop 2026', 'app.madeForSound': 'Made for sound',
  'common.yes': 'Sim', 'common.no': 'Não', 'common.all': 'Todos', 'common.none': 'Nenhum',
  'common.from': 'De', 'common.to': 'Até', 'common.date': 'Data', 'common.time': 'Hora',
  'common.optional': 'opcional', 'common.required': 'obrigatório',
};

export const translations: Record<Language, Dict> = { es, en, fr, pt };
