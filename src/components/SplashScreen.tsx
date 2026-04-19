import { useEffect, useState } from 'react';
import yusiopLogo from '@/assets/yusiop-logo.png';

const SplashScreen = () => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), 2000);
    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden transition-opacity duration-500 ${
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
        <img
          src={yusiopLogo}
          alt="Yusiop"
          className="w-[260px] h-auto drop-shadow-[0_20px_60px_hsl(var(--primary)/0.45)]"
        />
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 eyebrow text-muted-foreground">
        scan · sync · play
      </div>
    </div>
  );
};

export default SplashScreen;
