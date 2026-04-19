import { useEffect, useState } from 'react';

const SplashScreen = () => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), 2000);
    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Ambient blobs */}
      <div
        className="vapor-orb animate-blob-float"
        style={{ width: 380, height: 380, top: '-10%', left: '-15%', background: 'var(--gradient-vapor)', opacity: 0.45 }}
      />
      <div
        className="vapor-orb animate-blob-float"
        style={{ width: 320, height: 320, bottom: '-10%', right: '-15%', background: 'var(--gradient-sunset)', animationDelay: '3s', opacity: 0.4 }}
      />

      <div className="relative flex flex-col items-center animate-scale-in">
        {/* Logo icon — squircle with play + QR + sparkles + curve */}
        <div className="relative">
          <svg
            width="180"
            height="180"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_20px_60px_hsl(var(--primary)/0.45)]"
          >
            <defs>
              <linearGradient id="vaporSquircle" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(232 90% 75%)" />
                <stop offset="50%" stopColor="hsl(250 95% 75%)" />
                <stop offset="100%" stopColor="hsl(280 85% 75%)" />
              </linearGradient>
              <linearGradient id="vaporCurve" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(250 95% 75%)" />
                <stop offset="100%" stopColor="hsl(188 85% 67%)" />
              </linearGradient>
            </defs>

            {/* Squircle background */}
            <rect x="20" y="20" width="160" height="160" rx="42" fill="url(#vaporSquircle)" />

            {/* Inner highlight */}
            <rect x="28" y="28" width="144" height="80" rx="34" fill="white" opacity="0.12" />

            {/* Play triangle */}
            <path d="M72 70 L72 130 L120 100 Z" fill="white" />

            {/* QR mini block (bottom-right corner) */}
            <g transform="translate(108 104)">
              <rect width="56" height="56" rx="6" fill="white" />
              <g fill="hsl(250 95% 60%)">
                <rect x="6" y="6" width="14" height="14" rx="2" />
                <rect x="36" y="6" width="14" height="14" rx="2" />
                <rect x="6" y="36" width="14" height="14" rx="2" />
                <rect x="10" y="10" width="6" height="6" fill="white" />
                <rect x="40" y="10" width="6" height="6" fill="white" />
                <rect x="10" y="40" width="6" height="6" fill="white" />
                <rect x="26" y="26" width="4" height="4" />
                <rect x="34" y="30" width="4" height="4" />
                <rect x="42" y="26" width="4" height="4" />
                <rect x="30" y="38" width="4" height="4" />
                <rect x="38" y="42" width="4" height="4" />
                <rect x="46" y="38" width="4" height="4" />
              </g>
            </g>

            {/* Sparkles */}
            <g fill="hsl(250 95% 80%)">
              <path d="M158 50 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" />
              <path d="M178 78 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" opacity="0.8" />
            </g>

            {/* Bottom curve sweep */}
            <path
              d="M30 168 Q 100 200 170 168"
              stroke="url(#vaporCurve)"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
          </svg>
        </div>

        {/* Wordmark */}
        <div className="mt-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
          <h2 className="font-display text-4xl font-bold tracking-[0.2em] vapor-text text-center">
            YUSIOP
          </h2>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 eyebrow text-muted-foreground">
        scan · sync · play
      </div>
    </div>
  );
};

export default SplashScreen;
