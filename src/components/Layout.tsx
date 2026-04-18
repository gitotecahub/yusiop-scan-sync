import { ReactNode } from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden grain">
      <TopBar />
      <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-5 pt-[68px] pb-28 no-scrollbar">
        <div className="max-w-md mx-auto animate-fade-in">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
