import { QRCodeSVG } from 'qrcode.react';
import { Lock, Download, Smartphone, Music, Star, Gift } from 'lucide-react';

interface DigitalCardProps {
  code: string;
  cardType: 'standard' | 'premium';
  downloadCredits: number;
  isGift?: boolean;
  /** Texto del QR. Si no se pasa, se usa el code. */
  qrValue?: string;
  /** Compacto para listados; por defecto a tamaño cartel */
  compact?: boolean;
}

const PALETTES = {
  standard: {
    label: 'ESTÁNDAR',
    sub: 'PARA DESCUBRIR',
    // Cyan / azul
    bg: 'linear-gradient(135deg, #0a2540 0%, #0d4a7a 35%, #1a7fa8 70%, #2dd4d4 100%)',
    accent: '#5eead4',
    accentSoft: 'rgba(94, 234, 212, 0.85)',
    accentText: '#a5f3fc',
    border: 'rgba(94, 234, 212, 0.45)',
    glow: 'rgba(45, 212, 212, 0.35)',
  },
  premium: {
    label: 'PREMIUM',
    sub: 'PARA FANÁTICOS',
    // Violeta / morado
    bg: 'linear-gradient(135deg, #1a0a3e 0%, #3b1d75 35%, #6b2bb8 70%, #b794f6 100%)',
    accent: '#c4b5fd',
    accentSoft: 'rgba(196, 181, 253, 0.9)',
    accentText: '#ddd6fe',
    border: 'rgba(196, 181, 253, 0.5)',
    glow: 'rgba(167, 139, 250, 0.4)',
  },
} as const;

const DigitalCard = ({
  code,
  cardType,
  downloadCredits,
  isGift = false,
  qrValue,
  compact = false,
}: DigitalCardProps) => {
  const p = PALETTES[cardType];
  const Icon = cardType === 'premium' ? Star : Music;
  // Código manual corto (6 chars) tomado del propio code
  const manualCode = code.split('-').pop()?.slice(0, 6).toUpperCase() ?? code.slice(0, 6).toUpperCase();
  const qr = qrValue ?? code;

  return (
    <div
      className="relative w-full aspect-[1.586/1] rounded-3xl overflow-hidden border shadow-2xl"
      style={{
        background: p.bg,
        borderColor: p.border,
        boxShadow: `0 20px 60px -20px ${p.glow}, 0 0 0 1px ${p.border} inset`,
      }}
    >
      {/* Patrón de ondas decorativas */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        viewBox="0 0 400 250"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id={`waves-${cardType}`} x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M0,30 Q15,10 30,30 T60,30"
              stroke={p.accent}
              strokeWidth="0.5"
              fill="none"
              opacity="0.4"
            />
          </pattern>
        </defs>
        <rect width="400" height="250" fill={`url(#waves-${cardType})`} />
      </svg>

      {/* Puntos decorativos esquina inferior izquierda */}
      <div className="absolute bottom-3 left-3 grid grid-cols-4 gap-1 opacity-50 pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: p.accent, opacity: 0.3 + (i % 4) * 0.2 }}
          />
        ))}
      </div>

      {/* Contenido */}
      <div className={`relative h-full flex flex-col ${compact ? 'p-3' : 'p-4 sm:p-5'}`}>
        {/* Top: marca + badge tipo */}
        <div className="flex items-start justify-between">
          <div>
            <p
              className={`font-display font-black tracking-tight leading-none text-white ${
                compact ? 'text-base' : 'text-xl sm:text-2xl'
              }`}
            >
              <span style={{ color: p.accent }}>Y</span>USIOP
            </p>
            <p
              className={`tracking-[0.25em] text-white/60 mt-0.5 ${compact ? 'text-[7px]' : 'text-[8px] sm:text-[9px]'}`}
            >
              SCAN · SYNC · PLAY
            </p>
          </div>
          <div
            className={`rounded-full font-bold tracking-wider ${
              compact ? 'px-2 py-0.5 text-[8px]' : 'px-3 py-1 text-[10px]'
            }`}
            style={{
              background: `linear-gradient(135deg, ${p.accent}, ${p.accentSoft})`,
              color: cardType === 'premium' ? '#1a0a3e' : '#0a2540',
            }}
          >
            {isGift ? 'REGALO' : p.label}
          </div>
        </div>

        {/* Centro: tipo + descargas */}
        <div className={`flex-1 flex flex-col justify-center ${compact ? 'my-1' : 'my-2'}`}>
          <p
            className={`font-display font-black text-white leading-[0.9] ${
              compact ? 'text-lg' : 'text-2xl sm:text-3xl'
            }`}
          >
            TARJETA
          </p>
          <p
            className={`font-display font-black leading-[0.9] ${compact ? 'text-xl' : 'text-3xl sm:text-4xl'}`}
            style={{ color: p.accent }}
          >
            {p.label}
          </p>
          <p
            className={`tracking-[0.2em] text-white/50 mt-1 ${compact ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}
          >
            {p.sub}
          </p>

          <div className={`flex items-end gap-2 ${compact ? 'mt-1' : 'mt-2'}`}>
            <span
              className={`font-display font-black text-white leading-none tabular-nums ${
                compact ? 'text-2xl' : 'text-4xl sm:text-5xl'
              }`}
            >
              {String(downloadCredits).padStart(2, '0')}
            </span>
            <div className={`pb-0.5 ${compact ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}>
              <p className="font-bold tracking-widest" style={{ color: p.accentText }}>
                DESCARGAS
              </p>
              <p className="font-bold tracking-widest" style={{ color: p.accentText }}>
                INCLUIDAS
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: QR + código manual */}
        <div className={`flex items-end gap-2 ${compact ? 'gap-2' : 'gap-3'}`}>
          <div
            className={`bg-white rounded-lg shrink-0 flex items-center justify-center ${
              compact ? 'p-1.5' : 'p-2'
            }`}
          >
            <QRCodeSVG
              value={qr}
              size={compact ? 44 : 64}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`tracking-[0.2em] mb-1 ${compact ? 'text-[7px]' : 'text-[9px]'}`}
              style={{ color: p.accentText }}
            >
              CÓDIGO MANUAL
            </p>
            <div
              className={`rounded-lg border-2 bg-black/30 flex items-center justify-center ${
                compact ? 'h-7 px-2' : 'h-9 px-3'
              }`}
              style={{ borderColor: p.border }}
            >
              <span
                className={`font-mono font-bold text-white tracking-[0.25em] tabular-nums ${
                  compact ? 'text-xs' : 'text-base'
                }`}
              >
                {manualCode}
              </span>
            </div>
          </div>
          <Icon
            className={`text-white/30 shrink-0 ${compact ? 'h-6 w-6' : 'h-10 w-10'}`}
            strokeWidth={1.2}
          />
        </div>

        {/* Footer micro: features */}
        {!compact && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1 text-white/60">
              <Lock className="h-2.5 w-2.5" />
              <span className="text-[7px] tracking-wider font-bold">USO ÚNICO</span>
            </div>
            <div className="flex items-center gap-1 text-white/60">
              <Download className="h-2.5 w-2.5" />
              <span className="text-[7px] tracking-wider font-bold">TUS CANCIONES</span>
            </div>
            <div className="flex items-center gap-1 text-white/60">
              <Smartphone className="h-2.5 w-2.5" />
              <span className="text-[7px] tracking-wider font-bold">TODOS DISPOSITIVOS</span>
            </div>
          </div>
        )}

        {/* Badge regalo flotante */}
        {isGift && (
          <div
            className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm border"
            style={{ borderColor: p.border, transform: 'translateY(28px)' }}
          >
            <Gift className="h-2.5 w-2.5" style={{ color: p.accent }} />
            <span className="text-[8px] font-bold tracking-wider" style={{ color: p.accentText }}>
              REGALO
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalCard;
