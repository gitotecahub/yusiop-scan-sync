import { ReactNode } from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="yusiop-container">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;