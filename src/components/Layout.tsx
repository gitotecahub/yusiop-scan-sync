import { ReactNode } from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden grain">
      {/* Ambient blobs */}
      <div className="vapor-orb animate-blob-float" style={{ width: 320, height: 320, top: '-80px', right: '-100px', background: 'var(--gradient-vapor)' }} />
      <div className="vapor-orb animate-blob-float" style={{ width: 280, height: 280, bottom: '20%', left: '-120px', background: 'var(--gradient-sunset)', animationDelay: '4s' }} />

      <TopBar />
      <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-5 pt-[68px] pb-32 no-scrollbar">
        <div className="max-w-md mx-auto animate-fade-in">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
