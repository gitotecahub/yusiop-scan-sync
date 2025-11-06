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
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      <div className="relative">
        {/* Círculo de fondo con pulso */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-primary/20 animate-ping" />
        </div>
        
        {/* Logo Y con animación */}
        <div className="relative z-10 animate-scale-in">
          <h1 className="text-8xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-pulse">
            Y
          </h1>
        </div>

        {/* Nombre completo con fade in retrasado */}
        <div className="mt-6 text-center opacity-0 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Yusiop
          </h2>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
