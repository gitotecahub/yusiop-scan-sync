import { ReactNode, useEffect, useState } from 'react';

interface PhoneMockupProps {
  children: ReactNode;
}

const PhoneMockup = ({ children }: PhoneMockupProps) => {
  const [isRealMobile, setIsRealMobile] = useState(false);

  useEffect(() => {
    // Detectar si es un dispositivo móvil real (táctil y viewport pequeño)
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isSmallScreen = window.innerWidth <= 768;
    setIsRealMobile(isTouchDevice && isSmallScreen);
  }, []);

  // Si es un dispositivo móvil real, renderizar solo el contenido sin el mockup
  if (isRealMobile) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        {children}
      </div>
    );
  }

  // Si es desktop, mostrar el mockup del teléfono
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-1 overflow-hidden">
      {/* iPhone 14 Pro Max Frame */}
      <div className="relative scale-[0.6] sm:scale-[0.7] lg:scale-[0.8] xl:scale-90">
        {/* Phone Shadow */}
        <div className="absolute inset-0 bg-black/20 blur-xl translate-y-4 scale-105 rounded-[3.5rem]"></div>
        
        {/* Phone Body - Outer Frame */}
        <div className="relative bg-black rounded-[3.5rem] p-2 shadow-2xl overflow-hidden">
          {/* Screen Container */}
          <div className="bg-black rounded-[3rem] overflow-hidden relative">
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-black w-28 h-7 rounded-full"></div>
            
            {/* Screen Content */}
            <div className="w-[390px] h-[844px] bg-background text-foreground overflow-hidden rounded-[3rem] relative pt-5">
              {/* App Content */}
              <div className="w-full h-full flex flex-col rounded-[3rem] overflow-hidden">
                {children}
              </div>
              
              {/* Home Indicator */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-36 h-1 bg-white/30 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneMockup;