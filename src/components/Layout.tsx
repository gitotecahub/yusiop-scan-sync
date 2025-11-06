import { ReactNode } from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-1.5 pt-[60px] pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;