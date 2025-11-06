import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from 'react';

// Pages
import Index from "./pages/Index";
import QRScanner from '@/pages/QRScanner';
import Catalog from '@/pages/Catalog';
import Library from '@/pages/Library';
import Profile from '@/pages/Profile';
import Auth from '@/pages/Auth';
import Install from './pages/Install';
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminLayout from '@/pages/admin/AdminLayout';
import Dashboard from '@/pages/admin/Dashboard';
import Users from '@/pages/admin/Users';
import Songs from '@/pages/admin/Songs';
import Albums from '@/pages/admin/Albums';
import QRCards from '@/pages/admin/QRCards';
import Downloads from '@/pages/admin/Downloads';
import Settings from '@/pages/admin/Settings';

// Layout
import Layout from '@/components/Layout';
import PhoneMockup from '@/components/PhoneMockup';
import AudioPlayer from '@/components/AudioPlayer';
import SplashScreen from '@/components/SplashScreen';

// Hooks and Providers
import { useAuthStore } from '@/stores/authStore';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

const queryClient = new QueryClient();

const AppContent = () => {
  const { session, loading, initialize } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Garantizar que el splash se muestre por al menos 2.5 segundos
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Mostrar splash mientras carga o durante el tiempo mínimo
  if (loading || showSplash) {
    return (
      <PhoneMockup>
        <SplashScreen />
      </PhoneMockup>
    );
  }

  return (
    <Routes>
      {/* Admin Routes - Outside PhoneMockup for desktop view */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="songs" element={<Songs />} />
        <Route path="albums" element={<Albums />} />
        <Route path="qr-cards" element={<QRCards />} />
        <Route path="downloads" element={<Downloads />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Mobile App Routes - Inside PhoneMockup */}
      <Route path="/auth" element={
        <PhoneMockup>
          <Auth />
        </PhoneMockup>
      } />
      
      <Route path="/install" element={<Install />} />
      
      <Route path="/*" element={
        <PhoneMockup>
          <div className="min-h-screen bg-background text-foreground">
            {!session ? (
              <Auth />
            ) : (
              <Layout>
                <AudioPlayer />
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
        </PhoneMockup>
      } />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
