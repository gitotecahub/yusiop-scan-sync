import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

/**
 * Marca de agua disuasoria. Se superpone sobre toda la app con baja
 * opacidad y `pointer-events-none` para no interferir con la UI.
 * Identifica al usuario (email) en cualquier captura o grabación.
 *
 * Sólo se muestra si hay sesión activa.
 */
const WatermarkOverlay = () => {
  const user = useAuthStore((s) => s.user);
  const [stamp, setStamp] = useState(() => new Date().toLocaleString('es-ES'));

  // Refrescar la hora cada minuto para que cada captura tenga un timestamp
  // diferente — desincentiva republicar grabaciones antiguas.
  useEffect(() => {
    const id = window.setInterval(() => {
      setStamp(new Date().toLocaleString('es-ES'));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!user?.email) return null;

  const label = `${user.email} · ${stamp}`;
  // Patrón SVG repetido en diagonal. Texto en blanco con muy baja opacidad
  // para ser visible tanto en fondos claros como oscuros sin molestar.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="520" height="320">
  <g transform="rotate(-28 260 160)" fill="rgba(255,255,255,0.085)" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="14" font-weight="600">
    <text x="20" y="80">${escapeXml(label)}</text>
    <text x="20" y="200">${escapeXml(label)}</text>
    <text x="280" y="140">YUSIOP</text>
    <text x="280" y="260">YUSIOP</text>
  </g>
</svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9998] select-none"
      style={{
        backgroundImage: url,
        backgroundRepeat: 'repeat',
        mixBlendMode: 'overlay',
      }}
    />
  );
};

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!),
  );

export default WatermarkOverlay;
