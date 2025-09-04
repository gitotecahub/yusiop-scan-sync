import { ReactNode } from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="h-full flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 overflow-auto px-4 py-2">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;