import { useEffect, useState } from 'react';
import yusiopLogo from '@/assets/yusiop-splash.png';

const SplashScreen = () => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), 2000);
    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden grain transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Ambient blobs — match Layout */}
      <div
        className="vapor-orb animate-blob-float"
        style={{ width: 320, height: 320, top: '-80px', right: '-100px', background: 'var(--gradient-vapor)' }}
      />
      <div
        className="vapor-orb animate-blob-float"
        style={{ width: 280, height: 280, bottom: '20%', left: '-120px', background: 'var(--gradient-sunset)', animationDelay: '4s' }}
      />

      <img
        src={yusiopLogo}
        alt="Yusiop"
        className="relative z-10 w-[280px] h-auto animate-scale-in"
      />
    </div>
  );
};

export default SplashScreen;
