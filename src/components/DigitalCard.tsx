import { QRCodeSVG } from 'qrcode.react';
import { Lock, Download, Smartphone, Music, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface DigitalCardProps {
  code: string;
  cardType: 'standard' | 'premium';
  downloadCredits: number;
  isGift?: boolean;
  /** Texto del QR. Si no se pasa, se usa el code. */
  qrValue?: string;
  /** Compacto para listados; por defecto a tamaño cartel */
  compact?: boolean;
  /** Activa explosiones de confeti (celebración) — útil tras canjear o comprar */
  celebrate?: boolean;
}

const PALETTES = {
  standard: {
    label: 'ESTÁNDAR',
    sub: 'PARA DESCUBRIR',
    // Cyan / azul (idéntico a la tarjeta física)
    bgFrom: '#0a1d4a',
    bgVia: '#1a4a8a',
    bgTo: '#2dd4d4',
    accent: '#5eead4',
    accentSoft: '#67e8f9',
    accentText: '#a5f3fc',
    border: 'rgba(94, 234, 212, 0.55)',
    glow: 'rgba(45, 212, 212, 0.45)',
    badgeText: '#0a1d4a',
    confetti: ['#5eead4', '#67e8f9', '#a5f3fc', '#22d3ee', '#ffffff'],
  },
  premium: {
    label: 'PREMIUM',
    sub: 'PARA FANÁTICOS',
    // Violeta / morado
    bgFrom: '#1a0a3e',
    bgVia: '#4c1d95',
    bgTo: '#a78bfa',
    accent: '#c4b5fd',
    accentSoft: '#a78bfa',
    accentText: '#ddd6fe',
    border: 'rgba(196, 181, 253, 0.55)',
    glow: 'rgba(167, 139, 250, 0.5)',
    badgeText: '#1a0a3e',
    confetti: ['#c4b5fd', '#a78bfa', '#ddd6fe', '#8b5cf6', '#ffffff'],
  },
} as const;

/** Pequeña pieza de confeti animada vía CSS inline */
const ConfettiPiece = ({
  color,
  angle,
  distance,
  delay,
  size,
  rotate,
  shape,
}: {
  color: string;
  angle: number;
  distance: number;
  delay: number;
  size: number;
  rotate: number;
  shape: 'rect' | 'circle' | 'tri';
}) => {
  const tx = Math.cos((angle * Math.PI) / 180) * distance;
  const ty = Math.sin((angle * Math.PI) / 180) * distance;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: size,
    height: shape === 'rect' ? size * 0.45 : size,
    backgroundColor: shape === 'tri' ? 'transparent' : color,
    borderRadius: shape === 'circle' ? '50%' : shape === 'rect' ? 1 : 0,
    transform: 'translate(-50%, -50%)',
    // @ts-expect-error custom CSS vars
    '--tx': `${tx}px`,
    '--ty': `${ty}px`,
    '--rot': `${rotate}deg`,
    animation: `yusiop-confetti 1100ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms forwards`,
    opacity: 0,
    pointerEvents: 'none',
    boxShadow: shape !== 'tri' ? `0 0 6px ${color}` : undefined,
    borderLeft: shape === 'tri' ? `${size / 2}px solid transparent` : undefined,
    borderRight: shape === 'tri' ? `${size / 2}px solid transparent` : undefined,
    borderBottom: shape === 'tri' ? `${size}px solid ${color}` : undefined,
  };
  return <span style={style} />;
};

const buildBurst = (
  originAngleDeg: number,
  spreadDeg: number,
  count: number,
  colors: readonly string[],
  baseDelay: number,
) => {
  const pieces: Array<{
    color: string;
    angle: number;
    distance: number;
    delay: number;
    size: number;
    rotate: number;
    shape: 'rect' | 'circle' | 'tri';
  }> = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angle = originAngleDeg - spreadDeg / 2 + spreadDeg * t + (Math.random() - 0.5) * 8;
    const distance = 70 + Math.random() * 90;
    const size = 4 + Math.random() * 6;
    const rotate = (Math.random() - 0.5) * 540;
    const delay = baseDelay + Math.random() * 120;
    const shapes: Array<'rect' | 'circle' | 'tri'> = ['rect', 'circle', 'tri'];
    const shape = shapes[i % 3];
    pieces.push({
      color: colors[i % colors.length],
      angle,
      distance,
      delay,
      size,
      rotate,
      shape,
    });
  }
  return pieces;
};

const DigitalCard = ({
  code,
  cardType,
  downloadCredits,
  isGift = false,
  qrValue,
  compact = false,
  celebrate = false,
}: DigitalCardProps) => {
  const p = PALETTES[cardType];
  const Icon = cardType === 'premium' ? Star : Music;
  const manualCode =
    code.split('-').pop()?.slice(0, 6).toUpperCase() ?? code.slice(0, 6).toUpperCase();
  const qr = qrValue ?? code;

  const isDepleted = downloadCredits <= 0;

  // Reproduce la celebración (se puede re-disparar cambiando la prop)
  const [burstKey, setBurstKey] = useState(0);
  useEffect(() => {
    if (celebrate) setBurstKey((k) => k + 1);
  }, [celebrate]);

  // Dos explosiones en ángulos contrarios (esquina sup-izq y sup-der hacia fuera)
  const bursts = useMemo(() => {
    if (!celebrate) return [];
    return [
      ...buildBurst(225, 90, 22, p.confetti, 0), // hacia arriba-izquierda
      ...buildBurst(315, 90, 22, p.confetti, 80), // hacia arriba-derecha
    ];
  }, [celebrate, p.confetti, burstKey]);

  return (
    <div
      className={`relative w-full rounded-[28px] overflow-hidden border shadow-2xl transition-all ${
        compact ? 'aspect-[1.4/1]' : 'aspect-[1.586/1]'
      }`}
      style={{
        background: `linear-gradient(135deg, ${p.bgFrom} 0%, ${p.bgVia} 55%, ${p.bgTo} 100%)`,
        borderColor: p.border,
        boxShadow: isDepleted
          ? `0 8px 24px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset`
          : `0 24px 70px -22px ${p.glow}, 0 0 0 1px ${p.border} inset, 0 0 60px -20px ${p.glow}`,
        filter: isDepleted ? 'grayscale(0.85) brightness(0.55) contrast(0.95)' : undefined,
        opacity: isDepleted ? 0.78 : 1,
      }}
    >
      {/* Brillo diagonal sutil (vidrio) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.08) 100%)',
        }}
      />

      {/* Patrón de ondas decorativas (igual a la física) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
        viewBox="0 0 400 250"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={`waves-${cardType}`}
            x="0"
            y="0"
            width="80"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0,20 Q20,4 40,20 T80,20"
              stroke={p.accent}
              strokeWidth="0.6"
              fill="none"
              opacity="0.55"
            />
            <path
              d="M0,32 Q20,16 40,32 T80,32"
              stroke={p.accentSoft}
              strokeWidth="0.4"
              fill="none"
              opacity="0.35"
            />
          </pattern>
        </defs>
        <rect width="400" height="250" fill={`url(#waves-${cardType})`} />
      </svg>

      {/* Puntos decorativos esquina inferior izquierda (matriz de bullets) */}
      <div className="absolute bottom-3 left-3 grid grid-cols-5 gap-[3px] opacity-60 pointer-events-none">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full"
            style={{
              backgroundColor: p.accent,
              opacity: 0.25 + ((i * 37) % 7) * 0.1,
            }}
          />
        ))}
      </div>

      {/* Icono grande de fondo (nota o estrella) — como la física */}
      <Icon
        className={`absolute text-white/15 pointer-events-none ${
          compact ? 'h-16 w-16 right-3 top-10' : 'h-32 w-32 right-6 top-14 sm:h-40 sm:w-40'
        }`}
        strokeWidth={1}
        style={{ color: 'rgba(255,255,255,0.18)' }}
      />

      {/* Contenido */}
      <div className={`relative h-full flex flex-col ${compact ? 'p-2.5' : 'p-4 sm:p-5'}`}>
        {/* Top: marca + badge tipo */}
        <div className="flex items-start justify-between">
          <div>
            <p
              className={`font-display font-black tracking-tight leading-none text-white ${
                compact ? 'text-base' : 'text-2xl sm:text-3xl'
              }`}
            >
              <span style={{ color: p.accent }}>Y</span>USIOP
            </p>
            <p
              className={`tracking-[0.28em] text-white/65 mt-1 font-semibold ${
                compact ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'
              }`}
            >
              SCAN · SYNC · PLAY
            </p>
          </div>
          <div
            className={`rounded-full font-black tracking-widest shadow-lg ${
              compact ? 'px-2.5 py-0.5 text-[8px]' : 'px-4 py-1.5 text-[11px]'
            }`}
            style={{
              background: `linear-gradient(135deg, ${p.accent}, ${p.accentSoft})`,
              color: p.badgeText,
              boxShadow: `0 4px 14px -2px ${p.glow}`,
            }}
          >
            {isGift ? 'REGALO' : p.label}
          </div>
        </div>

        {/* Centro: TARJETA + tipo + descargas */}
        <div className={`flex-1 flex flex-col justify-center ${compact ? 'my-1' : 'my-2'}`}>
          <p
            className={`font-display font-black text-white leading-[0.9] ${
              compact ? 'text-lg' : 'text-3xl sm:text-4xl'
            }`}
          >
            TARJETA
          </p>
          <p
            className={`font-display font-black leading-[0.9] mt-1 ${
              compact ? 'text-xl' : 'text-4xl sm:text-5xl'
            }`}
            style={{
              color: p.accent,
              textShadow: `0 0 24px ${p.glow}`,
            }}
          >
            {p.label}
          </p>

          {/* Barrita + subtítulo */}
          <div className={`flex items-center gap-2 ${compact ? 'mt-1.5' : 'mt-3'}`}>
            <span
              className="block h-px flex-1"
              style={{ background: `linear-gradient(90deg, ${p.accent}, transparent)` }}
            />
          </div>
          <p
            className={`tracking-[0.25em] text-white/70 mt-1 font-bold ${
              compact ? 'text-[7px]' : 'text-[10px] sm:text-[11px]'
            }`}
          >
            {p.sub}
          </p>

          <div className={`flex items-end gap-3 ${compact ? 'mt-1' : 'mt-3'}`}>
            <span
              className={`font-display font-black text-white leading-none tabular-nums ${
                compact ? 'text-2xl' : 'text-5xl sm:text-6xl'
              }`}
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
            >
              {String(downloadCredits).padStart(2, '0')}
            </span>
            <div className={`pb-1 ${compact ? 'text-[7px]' : 'text-[10px] sm:text-[11px]'}`}>
              <p className="font-black tracking-[0.2em]" style={{ color: p.accentText }}>
                DESCARGAS
              </p>
              <p className="font-black tracking-[0.2em]" style={{ color: p.accentText }}>
                INCLUIDAS
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: QR + código manual */}
        <div className={`flex items-end ${compact ? 'gap-2' : 'gap-3'}`}>
          <div
            className={`bg-white rounded-xl shrink-0 flex items-center justify-center shadow-lg ${
              compact ? 'p-1.5' : 'p-2.5'
            }`}
            style={{ boxShadow: `0 6px 18px -6px ${p.glow}` }}
          >
            <QRCodeSVG
              value={qr}
              size={compact ? 44 : 72}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`tracking-[0.25em] mb-1 font-bold ${compact ? 'text-[7px]' : 'text-[10px]'}`}
              style={{ color: p.accentText }}
            >
              CÓDIGO MANUAL
            </p>
            <div
              className={`rounded-xl border-2 bg-black/35 backdrop-blur-sm flex items-center justify-center ${
                compact ? 'h-8 px-2' : 'h-11 px-3'
              }`}
              style={{
                borderColor: p.border,
                boxShadow: `inset 0 0 12px ${p.glow}`,
              }}
            >
              <span
                className={`font-mono font-black text-white tracking-[0.3em] tabular-nums ${
                  compact ? 'text-xs' : 'text-lg'
                }`}
                style={{ textShadow: `0 0 10px ${p.accent}` }}
              >
                {manualCode}
              </span>
            </div>
          </div>
        </div>

        {/* Footer micro: features (igual física) */}
        {!compact && (
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/15">
            <div className="flex items-center gap-1.5 text-white/75">
              <Lock className="h-3 w-3" style={{ color: p.accent }} />
              <div className="leading-tight">
                <p className="text-[7.5px] tracking-widest font-black">USO ÚNICO</p>
                <p className="text-[7px] tracking-widest text-white/55">NO COMPARTIR</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-white/75">
              <Download className="h-3 w-3" style={{ color: p.accent }} />
              <div className="leading-tight">
                <p className="text-[7.5px] tracking-widest font-black">DESCARGA</p>
                <p className="text-[7px] tracking-widest text-white/55">TUS CANCIONES</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-white/75">
              <Smartphone className="h-3 w-3" style={{ color: p.accent }} />
              <div className="leading-tight">
                <p className="text-[7.5px] tracking-widest font-black">EN TODOS</p>
                <p className="text-[7px] tracking-widest text-white/55">TUS DISPOSITIVOS</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sello AGOTADA cuando no quedan créditos */}
      {isDepleted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="px-4 py-1.5 rounded-md border-2 bg-black/40 backdrop-blur-sm"
            style={{
              borderColor: 'rgba(255,255,255,0.7)',
              transform: 'rotate(-12deg)',
            }}
          >
            <span
              className={`font-display font-black tracking-[0.3em] text-white/90 ${
                compact ? 'text-xs' : 'text-lg'
              }`}
            >
              AGOTADA
            </span>
          </div>
        </div>
      )}

      {/* Confeti — dos explosiones en ángulos contrarios */}
      {celebrate && !isDepleted && (
        <div
          key={burstKey}
          className="absolute inset-0 pointer-events-none overflow-visible"
          aria-hidden
        >
          {/* Flash radial */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${p.accent}55 0%, transparent 55%)`,
              animation: 'yusiop-flash 700ms ease-out forwards',
            }}
          />
          {bursts.map((b, i) => (
            <ConfettiPiece key={`${burstKey}-${i}`} {...b} />
          ))}
        </div>
      )}

      {/* Keyframes inline para el confeti (no requiere tocar Tailwind) */}
      <style>{`
        @keyframes yusiop-confetti {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(0.6);
          }
          15% { opacity: 1; }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(1);
          }
        }
        @keyframes yusiop-flash {
          0% { opacity: 0; }
          25% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default DigitalCard;
