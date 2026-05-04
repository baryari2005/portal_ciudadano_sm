"use client";

import { WelcomeBanner } from "@/features/dashboard/components/WelcomeBanner";
import { QuoteBannerSmart } from "@/features/dashboard/components/QuoteBannerSmart";
import { useDashboardStats } from "../../features/dashboard/hooks/useDashboardStats";
import { getDisplayName } from "../../features/dashboard/utils/dashboardFormat";
import { StatsPanel } from "@/features/dashboard/components/stats-panel/StatsPanel";
import { useAuth } from "@/stores/auth";

export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = getDisplayName(user);
  const { stats } = useDashboardStats();

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 items-stretch lg:grid-cols-2">
        <WelcomeBanner
          name={displayName}
          showClock
          dynamicClockByHour
          timeZone="America/Argentina/Buenos_Aires"
          withSeconds
          size="lg"
          height="normal"
          artImgClassName="h-50 md:h-40"
          artWrapperClassName=""
        />

        <QuoteBannerSmart
          className="h-full"
          size="lg"
          height="normal"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatsPanel stats={stats} density="compact" />
      </div>
    </div>
  );
}