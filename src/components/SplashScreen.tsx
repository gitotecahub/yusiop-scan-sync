import { useEffect, useState } from 'react';

const SplashScreen = () => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2000);

    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Vapor orbs */}
      <div className="vapor-orb w-80 h-80 bg-vapor top-1/4 left-1/4 animate-float-slow" />
      <div className="vapor-orb w-96 h-96 bg-vapor bottom-1/4 right-1/4 animate-float-slower" />

      <div className="relative z-10 text-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full vapor-gradient opacity-30 blur-2xl animate-pulse" />
        </div>

        <div className="relative animate-scale-in">
          <h1 className="font-display text-9xl font-bold vapor-text drop-shadow-2xl">
            Y
          </h1>
        </div>

        <div className="mt-4 opacity-0 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
          <h2 className="font-display text-2xl font-semibold tracking-wide vapor-text">
            Yusiop
          </h2>
          <p className="text-xs text-muted-foreground mt-2 tracking-[0.3em] uppercase">scan · sync · play</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
