import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Crown } from 'lucide-react';
import { useStaffAreas } from '@/hooks/useStaffAreas';
import {
  CeoPeriod, ceoApi, periodToDays,
} from '@/lib/ceoCenter';
import { CeoPeriodSelector } from '@/components/admin/ceo/CeoPeriodSelector';
import { PlatformHealthCard } from '@/components/admin/ceo/PlatformHealthCard';
import { StrategicKpiGrid } from '@/components/admin/ceo/StrategicKpiGrid';
import { RevenueEnginesCard } from '@/components/admin/ceo/RevenueEnginesCard';
import { StrategicTopSongs } from '@/components/admin/ceo/StrategicTopSongs';
import { StrategicTopArtists } from '@/components/admin/ceo/StrategicTopArtists';
import { AiAlertsPanel } from '@/components/admin/ceo/AiAlertsPanel';
import { FraudRiskPanel } from '@/components/admin/ceo/FraudRiskPanel';
import { SalesForecastCard } from '@/components/admin/ceo/SalesForecastCard';
import { StrategicRecommendations } from '@/components/admin/ceo/StrategicRecommendations';

export default function CeoCenter() {
  const { isSuperAdmin, loading } = useStaffAreas();
  const [period, setPeriod] = useState<CeoPeriod>('30d');
  const days = periodToDays(period);

  const health = useQuery({ queryKey: ['ceo', 'health', days], queryFn: () => ceoApi.health(days), enabled: isSuperAdmin });
  const kpis = useQuery({ queryKey: ['ceo', 'kpis', days], queryFn: () => ceoApi.kpis(days), enabled: isSuperAdmin });
  const revenue = useQuery({ queryKey: ['ceo', 'revenue', days], queryFn: () => ceoApi.revenue(days), enabled: isSuperAdmin });
  const topSongs = useQuery({ queryKey: ['ceo', 'topSongs', days], queryFn: () => ceoApi.topSongs(days), enabled: isSuperAdmin });
  const topArtists = useQuery({ queryKey: ['ceo', 'topArtists', days], queryFn: () => ceoApi.topArtists(days), enabled: isSuperAdmin });
  const alerts = useQuery({ queryKey: ['ceo', 'alerts', days], queryFn: () => ceoApi.alerts(days), enabled: isSuperAdmin });
  const fraud = useQuery({ queryKey: ['ceo', 'fraud', days], queryFn: () => ceoApi.fraud(days), enabled: isSuperAdmin });
  const forecast = useQuery({ queryKey: ['ceo', 'forecast', days], queryFn: () => ceoApi.forecast(days), enabled: isSuperAdmin });
  const recs = useQuery({ queryKey: ['ceo', 'recs', days], queryFn: () => ceoApi.recommendations(days), enabled: isSuperAdmin });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="relative min-h-screen">
      {/* Premium ambient gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-600/10 via-fuchsia-500/5 to-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/20">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                CEO Center
              </h1>
              <p className="text-xs text-muted-foreground">Visión estratégica de YUSIOP</p>
            </div>
          </div>
          <CeoPeriodSelector value={period} onChange={setPeriod} />
        </header>

        {/* 1. Health */}
        <PlatformHealthCard data={health.data} isLoading={health.isLoading} />

        {/* 2. KPIs */}
        <StrategicKpiGrid data={kpis.data} isLoading={kpis.isLoading} />

        {/* 3 + 4. Revenue + Recommendations */}
        <div className="grid gap-4 lg:grid-cols-2">
          <RevenueEnginesCard data={revenue.data} isLoading={revenue.isLoading} />
          <StrategicRecommendations data={recs.data} isLoading={recs.isLoading} />
        </div>

        {/* 5 + 6. Top songs + artists */}
        <div className="grid gap-4 lg:grid-cols-2">
          <StrategicTopSongs data={topSongs.data} isLoading={topSongs.isLoading} />
          <StrategicTopArtists data={topArtists.data} isLoading={topArtists.isLoading} />
        </div>

        {/* 7 + 8. Alerts + Fraud */}
        <div className="grid gap-4 lg:grid-cols-2">
          <AiAlertsPanel data={alerts.data} isLoading={alerts.isLoading} />
          <FraudRiskPanel data={fraud.data} isLoading={fraud.isLoading} />
        </div>

        {/* 9. Forecast */}
        <SalesForecastCard data={forecast.data} isLoading={forecast.isLoading} />
      </div>
    </div>
  );
}
