import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from 'react';

// Pages
import Index from "./pages/Index";
import QRScanner from '@/pages/QRScanner';
import Catalog from '@/pages/Catalog';
import Library from '@/pages/Library';
import Profile from '@/pages/Profile';
import Auth from '@/pages/Auth';
import Install from './pages/Install';
import Store from '@/pages/Store';
import Redeem from '@/pages/Redeem';
import Wallet from '@/pages/Wallet';
import Unsubscribe from '@/pages/Unsubscribe';
import NotFound from "./pages/NotFound";
import ProfileSelection from '@/pages/ProfileSelection';
import ArtistRequest from '@/pages/ArtistRequest';
import ArtistDashboard from '@/pages/artist/ArtistDashboard';
import MySubmissions from '@/pages/artist/MySubmissions';
import ArtistStats from '@/pages/artist/ArtistStats';
import Collaborations from '@/pages/artist/Collaborations';
import ArtistWallet from '@/pages/artist/ArtistWallet';
import PaymentMethods from '@/pages/artist/PaymentMethods';
import SongSubmissions from '@/pages/admin/SongSubmissions';
import CollaborationClaims from '@/pages/admin/CollaborationClaims';
import { RequireStaffArea } from '@/components/admin/RequireStaffArea';

// Admin Pages
import AdminLayout from '@/pages/admin/AdminLayout';
import Dashboard from '@/pages/admin/Dashboard';
import CeoCenter from '@/pages/admin/CeoCenter';
import Users from '@/pages/admin/Users';
import UserDetail from '@/pages/admin/UserDetail';
import Songs from '@/pages/admin/Songs';
import Albums from '@/pages/admin/Albums';
import QRCards from '@/pages/admin/QRCards';
import RechargeCards from '@/pages/admin/RechargeCards';
import Downloads from '@/pages/admin/Downloads';
import Monetization from '@/pages/admin/Monetization';
import SalesSimulator from '@/pages/admin/SalesSimulator';
import Settings from '@/pages/admin/Settings';
import ArtistRequests from '@/pages/admin/ArtistRequests';
import AdminSubscriptions from '@/pages/admin/Subscriptions';
import Subscriptions from '@/pages/Subscriptions';
import Popular from '@/pages/Popular';
import Support from '@/pages/Support';
import AdminSupport from '@/pages/admin/Support';
import AdminWithdrawals from '@/pages/admin/Withdrawals';
import PaymentMethodsAdmin from '@/pages/admin/PaymentMethodsAdmin';
import Advertising from '@/pages/admin/Advertising';
import AuditLog from '@/pages/admin/AuditLog';

// Layout
import Layout from '@/components/Layout';
import AudioPlayer from '@/components/AudioPlayer';
import SplashScreen from '@/components/SplashScreen';

// Hooks and Providers
import { useAuthStore } from '@/stores/authStore';
import { useModeStore } from '@/stores/modeStore';
import { AuthProvider } from '@/hooks/useAuth';

const queryClient = new QueryClient();

const AppContent = () => {
  const { session, user, initialize } = useAuthStore();
  const { loadForUser, profileChoiceMade, mode, loading: modeLoading, reset } = useModeStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Cargar modo del usuario cuando hay sesión, resetear cuando se cierra
  useEffect(() => {
    if (user?.id) {
      loadForUser(user.id);
    } else {
      reset();
    }
  }, [user?.id, loadForUser, reset]);

  if (showSplash) return <SplashScreen />;

  return (
    <Routes>
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="ceo-center" element={<CeoCenter />} />
        <Route path="users" element={<RequireStaffArea area="users"><Users /></RequireStaffArea>} />
        <Route path="users/:userId" element={<RequireStaffArea area="users"><UserDetail /></RequireStaffArea>} />
        <Route path="songs" element={<RequireStaffArea area="catalog"><Songs /></RequireStaffArea>} />
        <Route path="albums" element={<RequireStaffArea area="catalog"><Albums /></RequireStaffArea>} />
        <Route path="qr-cards" element={<RequireStaffArea area="qr_cards"><QRCards /></RequireStaffArea>} />
        <Route path="recharge-cards" element={<RequireStaffArea area="qr_cards"><RechargeCards /></RequireStaffArea>} />
        <Route path="downloads" element={<RequireStaffArea area="monetization"><Downloads /></RequireStaffArea>} />
        <Route path="monetization" element={<RequireStaffArea area="monetization"><Monetization /></RequireStaffArea>} />
        <Route path="simulator" element={<RequireStaffArea area="monetization"><SalesSimulator /></RequireStaffArea>} />
        <Route path="settings" element={<RequireStaffArea area="settings"><Settings /></RequireStaffArea>} />
        <Route path="artist-requests" element={<RequireStaffArea area="artist_requests"><ArtistRequests /></RequireStaffArea>} />
        <Route path="song-submissions" element={<RequireStaffArea area="catalog"><SongSubmissions /></RequireStaffArea>} />
        <Route path="collab-claims" element={<RequireStaffArea area="catalog"><CollaborationClaims /></RequireStaffArea>} />
        <Route path="subscriptions" element={<RequireStaffArea area="monetization"><AdminSubscriptions /></RequireStaffArea>} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="withdrawals" element={<RequireStaffArea area="monetization"><AdminWithdrawals /></RequireStaffArea>} />
        <Route path="payment-methods" element={<RequireStaffArea area="monetization"><PaymentMethodsAdmin /></RequireStaffArea>} />
        <Route path="advertising" element={<Advertising />} />
        <Route path="audit-log" element={<AuditLog />} />
      </Route>

      <Route path="/auth" element={<Auth />} />
      <Route path="/install" element={<Install />} />
      <Route path="/redeem/:token" element={<Redeem />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />

      <Route path="/*" element={
        !session ? (
          <Auth />
        ) : modeLoading ? (
          <div className="min-h-screen bg-background" />
        ) : !profileChoiceMade ? (
          // Tras registro: pantalla de elección de perfil
          <Routes>
            <Route path="/artist/request" element={<ArtistRequest />} />
            <Route path="*" element={<ProfileSelection />} />
          </Routes>
        ) : mode === 'artist' ? (
          // Modo artista
          <Routes>
            <Route path="/artist" element={<ArtistDashboard />} />
            <Route path="/artist/submissions" element={<MySubmissions />} />
            <Route path="/artist/stats" element={<ArtistStats />} />
            <Route path="/artist/collaborations" element={<Collaborations />} />
            <Route path="/artist/wallet" element={<ArtistWallet />} />
            <Route path="/artist/payment-methods" element={<PaymentMethods />} />
            <Route path="/artist/request" element={<ArtistRequest />} />
            <Route path="/support" element={<Support />} />
            <Route path="/profile" element={
              <Layout>
                <AudioPlayer />
                <Profile />
              </Layout>
            } />
            <Route path="*" element={<Navigate to="/artist" replace />} />
          </Routes>
        ) : (
          // Modo usuario (por defecto)
          <Layout>
            <AudioPlayer />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/qr" element={<QRScanner />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/library" element={<Library />} />
              <Route path="/store" element={<Store />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/popular" element={<Popular />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/support" element={<Support />} />
              <Route path="/artist/request" element={<ArtistRequest />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        )
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
