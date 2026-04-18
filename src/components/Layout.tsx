import { ReactNode } from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* Animated vapor orbs */}
      <div className="vapor-orb w-72 h-72 bg-vapor top-[-80px] left-[-80px] animate-float-slow" />
      <div className="vapor-orb w-96 h-96 bg-vapor bottom-[-120px] right-[-120px] animate-float-slower opacity-40" />

      <TopBar />
      <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-[68px] pb-28 no-scrollbar">
        <div className="max-w-md mx-auto animate-fade-in">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
