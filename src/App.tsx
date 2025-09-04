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

  // Temporalmente desactivar autenticación para pruebas
  // Si no hay sesión, mostrar Auth
  // if (!session) {
  //   return <Auth />;
  // }

  // Simular sesión para pruebas
  const mockSession = !session;

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      {mockSession ? (
        // Mostrar botón para acceder temporalmente
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-4xl font-bold yusiop-gradient bg-clip-text text-transparent">
              YUSIOP
            </h1>
            <p className="text-muted-foreground">
              Modo demostración activado
            </p>
            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/catalog'}
                className="w-full yusiop-button-primary px-6 py-3 rounded-xl font-medium"
              >
                🎵 Entrar al Catálogo
              </button>
              <Auth />
            </div>
          </div>
        </div>
      ) : (
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
      )}
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
