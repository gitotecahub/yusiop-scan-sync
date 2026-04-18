import { useEffect, useState } from 'react';

const SplashScreen = () => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), 2000);
    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Animated blobs */}
      <div className="vapor-orb animate-blob-float" style={{ width: 380, height: 380, top: '-10%', left: '-15%', background: 'var(--gradient-vapor)', opacity: 0.55 }} />
      <div className="vapor-orb animate-blob-float" style={{ width: 320, height: 320, bottom: '-10%', right: '-15%', background: 'var(--gradient-sunset)', animationDelay: '3s', opacity: 0.5 }} />
      <div className="vapor-orb animate-blob-float" style={{ width: 240, height: 240, top: '40%', right: '20%', background: 'var(--gradient-aurora)', animationDelay: '6s', opacity: 0.4 }} />

      <div className="absolute top-8 left-1/2 -translate-x-1/2 eyebrow">Yusiop</div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 eyebrow text-muted-foreground">scan · sync · play</div>

      <div className="relative text-center">
        <div className="animate-scale-in">
          <h1 className="display-xl text-[12rem] leading-none">
            <span className="vapor-text">Y</span>
          </h1>
        </div>

        <div className="mt-2 opacity-0 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
          <h2 className="font-display text-3xl font-bold tracking-tight">YUSIOP</h2>
          <p className="eyebrow mt-3">Sound, reimagined</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
