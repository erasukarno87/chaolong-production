import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import {
  ClipboardList, Settings, Activity, LogOut, Menu,
  Factory, ChevronLeft, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Activity;
  roles: AppRole[];
}

const NAV: NavItem[] = [
  { to: "/monitoring",   label: "Monitoring",    icon: Activity,      roles: ["super_admin", "leader", "supervisor", "manager"] },
  { to: "/shift",        label: "Input Laporan", icon: ClipboardList, roles: ["super_admin", "leader"] },
  { to: "/traceability", label: "Traceability",  icon: Search,        roles: ["super_admin", "leader", "supervisor", "manager"] },
  { to: "/admin",        label: "Admin",         icon: Settings,      roles: ["super_admin"] },
];

const roleLabel: Record<AppRole, string> = {
  super_admin: "Super Admin",
  leader:      "Leader",
  supervisor:  "Supervisor",
  manager:     "Manager",
};
const roleChip: Record<AppRole, string> = {
  super_admin: "chip chip-info",
  leader:      "chip chip-success",
  supervisor:  "chip chip-warning",
  manager:     "chip",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { effectiveRole, profile, signOut, user } = useAuth();
  const loc = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(false);
  const [now, setNow]                 = useState(new Date());

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [loc.pathname]);

  const visible = NAV.filter(n => effectiveRole && n.roles.includes(effectiveRole));

  const time = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false});
  const date = now.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

  // Display name: prefer profile display_name, fall back to auth email
  const displayName  = profile?.display_name ?? user?.email ?? "—";
  const displayRole  = effectiveRole ?? "manager";
  const displayColor = "hsl(var(--primary))";
  const displayInit  = (profile?.display_name ?? user?.email ?? "?").slice(0, 2).toUpperCase();

  const SidebarContent = (
    <div className="flex flex-col h-full">

      {/* ── Logo / collapse trigger ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`group border-b flex items-center gap-3 w-full transition-colors hover:bg-accent/50 ${
          collapsed ? "justify-center px-0 py-4" : "px-4 py-4"
        }`}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="h-9 w-9 rounded-lg gradient-primary grid place-items-center shrink-0">
          <Factory className="h-4.5 w-4.5 text-white" />
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-bold leading-tight truncate">Production</div>
              <div className="text-[10px] text-muted-foreground font-mono truncate">PT. Chao Long</div>
            </div>
            <ChevronLeft className="h-4 w-4 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        )}
      </button>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              } ${collapsed ? "justify-center" : ""}`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── User info + logout ── */}
      <div className="border-t p-3 space-y-2">
        {!collapsed && (
          <div className="rounded-lg bg-surface-2 p-2.5 flex items-center gap-2 min-w-0">
            <div
              className="h-8 w-8 rounded-md grid place-items-center text-white text-xs font-bold shrink-0"
              style={{ background: displayColor }}
            >
              {displayInit}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{displayName}</div>
              <span className={roleChip[displayRole]}>{roleLabel[displayRole]}</span>
            </div>
          </div>
        )}
        <Button
          size="sm"
          variant="ghost"
          className={`w-full ${collapsed ? "px-0" : ""}`}
          onClick={signOut}
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar — sticky full-height */}
      <aside
        className={`hidden md:flex flex-col bg-card border-r shrink-0 transition-all duration-200 sticky top-0 h-screen ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-card border-r flex flex-col">{SidebarContent}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-14 sm:h-16 border-b bg-card px-3 sm:px-5 flex items-center gap-3 sticky top-0 z-30">
          <button className="md:hidden p-2 -ml-2" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">
              {visible.find(n => loc.pathname.startsWith(n.to))?.label ?? "Production"}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono hidden sm:block">
              {date}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="font-mono text-sm tabular-nums">{time}</span>
          </div>
          {/* User chip in header */}
          <div
            className="h-8 w-8 rounded-md grid place-items-center text-white text-xs font-bold shrink-0"
            style={{ background: displayColor }}
            title={displayName}
          >
            {displayInit}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 pb-20 md:pb-6 overflow-x-hidden">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-30">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${Math.max(visible.length, 1)}, minmax(0, 1fr))` }}
          >
            {visible.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `min-w-0 flex flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-medium ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="max-w-full truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
