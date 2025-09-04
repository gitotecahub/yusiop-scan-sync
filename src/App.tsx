import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from 'react';

// Pages
import Index from "./pages/Index";
import QRScanner from '@/pages/QRScanner';
import Catalog from '@/pages/Catalog';
import Library from '@/pages/Library';
import Profile from '@/pages/Profile';
import Auth from '@/pages/Auth';
import NotFound from "./pages/NotFound";

// Layout
import Layout from '@/components/Layout';

// Hooks
import { useAuthStore } from '@/stores/authStore';

const queryClient = new QueryClient();

const AppContent = () => {
  const { session, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Si no hay sesión, mostrar Auth
  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/qr" element={<QRScanner />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/library" element={<Library />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
