import { useEffect, useState } from 'react';
import yusiopLogo from '@/assets/yusiop-logo.svg';

const SplashScreen = () => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), 2000);
    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src={yusiopLogo}
        alt="Yusiop"
        className="w-[280px] h-auto animate-scale-in"
      />
    </div>
  );
};

export default SplashScreen;
