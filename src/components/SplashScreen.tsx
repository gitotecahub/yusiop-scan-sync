import { useEffect, useState } from 'react';

const SplashScreen = () => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), 2000);
    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute top-8 left-1/2 -translate-x-1/2 eyebrow">Yusiop · ed.01</div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 eyebrow text-muted-foreground">scan · sync · play</div>

      <div className="relative text-center">
        <div className="editorial-rule mx-auto mb-8 opacity-0 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }} />

        <div className="animate-scale-in">
          <h1 className="display-xl text-[14rem] leading-none">
            <span className="gold-text">Y</span>
          </h1>
        </div>

        <div className="mt-2 opacity-0 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
          <h2 className="font-display text-2xl font-bold tracking-tight">YUSIOP</h2>
          <p className="eyebrow mt-3">An editorial sound experience</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
