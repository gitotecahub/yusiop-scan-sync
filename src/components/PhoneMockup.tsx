import { ReactNode } from 'react';

interface PhoneMockupProps {
  children: ReactNode;
}

const PhoneMockup = ({ children }: PhoneMockupProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      {/* iPhone 14 Pro Max Frame */}
      <div className="relative">
        {/* Phone Shadow */}
        <div className="absolute inset-0 bg-black/20 blur-xl translate-y-4 scale-105 rounded-[3rem]"></div>
        
        {/* Phone Body */}
        <div className="relative bg-black rounded-[3rem] p-2 shadow-2xl">
          {/* Screen Container */}
          <div className="bg-black rounded-[2.5rem] overflow-hidden relative">
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-black w-32 h-8 rounded-full"></div>
            
            {/* Screen Content */}
            <div className="w-[430px] h-[932px] bg-background text-foreground overflow-hidden rounded-[2.5rem] relative">
              {/* App Content */}
              <div className="w-full h-full overflow-auto">
                {children}
              </div>
              
              {/* Home Indicator */}
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-36 h-1 bg-white/30 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneMockup;