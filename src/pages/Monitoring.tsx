import { Factory, Gauge, Layers3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSimpleMonitoringDashboard } from "@/features/monitoring/hooks/useMonitoringDashboardSimple";
import { StatusPanel } from "@/features/monitoring/components/StatusPanel";
import { HourlyOutputChart } from "@/features/monitoring/components/HourlyOutputChart";
import { OEESPanel } from "@/features/monitoring/components/OEESPanel";
import { SkillsPanel } from "@/features/monitoring/components/SkillsPanel";
import { MonitoringErrorBoundary } from "@/components/error/MonitoringErrorBoundary";

type DashboardPanel = "status" | "oee" | "skill";

const panels: { id: DashboardPanel; label: string; icon: typeof Factory }[] = [
  { id: "status", label: "Panel 1 · Status Line", icon: Factory },
  { id: "oee", label: "Panel 2 · OEE & Quality", icon: Gauge },
  { id: "skill", label: "Panel 3 · Skill Matrix", icon: Layers3 },
];

export default function MonitoringPage() {
  return (
    <MonitoringErrorBoundary component="MonitoringPage">
      <MonitoringDashboardContent />
    </MonitoringErrorBoundary>
  );
}

function MonitoringDashboardContent() {
  const dashboard = useSimpleMonitoringDashboard();

  return (
    <div className="space-y-5 fade-in">
      {/* Status Panel - Always visible */}
      <StatusPanel 
        density={dashboard.ui.density} 
        onDensityChange={dashboard.setDensity}
        isDarkMode={dashboard.ui.isDarkMode}
        onDarkModeToggle={dashboard.setDarkMode}
        onRefresh={dashboard.refreshDashboard}
      />

      {/* Hourly Output Chart - Part of Status Panel */}
      <HourlyOutputChart density={dashboard.ui.density} />

      {/* Panel Navigation */}
      <Tabs value={dashboard.ui.activePanel} onValueChange={(value) => dashboard.setActivePanel(value as DashboardPanel)}>
        <TabsList className="w-full justify-start overflow-x-auto rounded-2xl bg-card p-1 h-auto shadow-card border">
          {panels.map((panel) => {
            const Icon = panel.icon;
            return (
              <TabsTrigger key={panel.id} value={panel.id} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{panel.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Dynamic Panel Content */}
      {dashboard.ui.activePanel === "oee" && (
        <MonitoringErrorBoundary component="OEE Panel">
          <OEESPanel density={dashboard.ui.density} />
        </MonitoringErrorBoundary>
      )}
      
      {dashboard.ui.activePanel === "skill" && (
        <MonitoringErrorBoundary component="Skills Panel">
          <SkillsPanel density={dashboard.ui.density} />
        </MonitoringErrorBoundary>
      )}
    </div>
  );
}
