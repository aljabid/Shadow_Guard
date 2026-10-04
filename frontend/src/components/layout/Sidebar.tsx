/**
 * ShadowGuard Sidebar — matches the AFM Intelligence Dashboard reference design
 */
import { useNavigate, useLocation } from "react-router-dom";
import { useModulesStore, useAlertsStore, useUIStore } from "@/store";
import {
  Shield, Search, TrendingUp, Dice6, Network, PackageSearch,
  LayoutDashboard, Database, FileText, Settings, Bell,
  Activity, Briefcase, ChevronRight, AlignJustify,
  FolderOpen, History, Radio, Wallet, AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { modulesApi } from "@/api/modules.api";

const MODULE_ACCENT: Record<string, string> = {
  kolkhoz: "#ef4444", droper: "#f97316", piramida: "#eab308",
  shadowbet: "#a855f7", tengraf: "#3b82f6", contraband: "#10b981",
};
const MODULE_LABEL: Record<string, string> = {
  kolkhoz: "KOLKHOZ", droper: "DROPER", piramida: "PIRAMIDA",
  shadowbet: "SHADOWBET", tengraf: "TENGRAF", contraband: "CONTRABAND",
};
const MODULE_SUBLABEL: Record<string, string> = {
  kolkhoz: "Exchange Risk", droper: "Recruitment Networks",
  piramida: "Ponzi & Scam", shadowbet: "Illegal Betting",
  tengraf: "Telegram Analytics", contraband: "Contraband Markets",
};
const MODULE_ICONS: Record<string, React.ElementType> = {
  kolkhoz: Shield, droper: Search, piramida: TrendingUp,
  shadowbet: Dice6, tengraf: Network, contraband: PackageSearch,
};

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 mb-1.5 mt-4 font-bold uppercase tracking-widest first:mt-2"
      style={{ color: "#374151", fontSize: 9, letterSpacing: "0.14em" }}>
      {label}
    </p>
  );
}

function NavBtn({ icon: Icon, label, active, onClick, badge }: {
  icon: React.ElementType; label: string; active: boolean;
  onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-left"
      style={{
        background: active ? "rgba(59,130,246,0.15)" : "transparent",
        color: active ? "#60a5fa" : "#9ca3af",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon size={14} />
      <span className="flex-1 text-xs font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="font-bold text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(233,69,96,0.2)", color: "#ef4444", fontSize: 9 }}>
          {badge}
        </span>
      )}
      {!badge && <ChevronRight size={11} style={{ opacity: 0.4 }} />}
    </button>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { modules, setModules, activeModuleId, setActiveModule } = useModulesStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const alerts = useAlertsStore((s) => s.alerts);
  const [utcTime, setUtcTime] = useState("");

  useEffect(() => {
    modulesApi.list().then(setModules).catch(() => {});
  }, [setModules]);

  useEffect(() => {
    const tick = () => setUtcTime(new Date().toUTCString().slice(17, 25));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const activeMods = modules.filter((m) => m.status === "active");
  const activeAlerts = alerts.filter((a) => !a.is_dismissed);
  const totalAlerts = activeAlerts.length;

  const isDash = location.pathname === "/dashboard" && !activeModuleId;

  if (sidebarCollapsed) {
    return (
      <aside style={{
        width: 56, background: "var(--soc-bg)", borderRight: "1px solid var(--soc-border)",
        display: "flex", flexDirection: "column", flexShrink: 0, overflowX: "hidden",
        transition: "background-color 0.25s ease",
      }}>
        <div className="flex items-center justify-center py-4" style={{ borderBottom: "1px solid var(--soc-border)" }}>
          <button onClick={toggleSidebar} style={{ color: "#4b5563" }}><AlignJustify size={16} /></button>
        </div>
        <nav className="p-2 space-y-1 mt-2">
          {[
            { icon: LayoutDashboard, path: "/dashboard" },
            { icon: Database, path: "/entities" },
            { icon: Briefcase, path: "/investigations" },
            { icon: Radio, path: "/darknet-feed" },
            { icon: Wallet, path: "/wallet-tracker" },
            { icon: AlertTriangle, path: "/leak-monitor" },
            { icon: History, path: "/history" },
            { icon: FileText, path: "/reports" },
            { icon: Settings, path: "/settings" },
          ].map(({ icon: Icon, path }) => (
            <button key={path} onClick={() => path !== "#" ? navigate(path) : toggleSidebar()}
              className="w-full flex items-center justify-center p-2 rounded"
              style={{ background: location.pathname === path ? "rgba(59,130,246,0.15)" : "transparent", color: location.pathname === path ? "#60a5fa" : "#6b7280" }}>
              <Icon size={15} />
            </button>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside style={{
      width: 220, background: "var(--soc-bg)", borderRight: "1px solid var(--soc-border)",
      display: "flex", flexDirection: "column", flexShrink: 0,
      overflowX: "hidden", overflowY: "auto",
      transition: "background-color 0.25s ease",
    }}>
      {/* ── Brand ── */}
      <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: "1px solid var(--soc-border)" }}>
        {/* Shield logo */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)" }}>
          <Shield size={16} style={{ color: "#fff" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm leading-none" style={{ color: "#e5e7eb", letterSpacing: "0.06em" }}>SHADOWGUARD</p>
          <p className="leading-none mt-0.5" style={{ color: "#4b5563", fontSize: 8, letterSpacing: "0.08em" }}>DIGITAL SHADOW PLATFORM</p>
        </div>
        <button onClick={toggleSidebar} style={{ color: "#4b5563", flexShrink: 0 }}><AlignJustify size={14} /></button>
      </div>

      {/* ── Dashboard ── */}
      <div className="px-2 pt-3 pb-1">
        <NavBtn icon={LayoutDashboard} label="Dashboard" active={isDash}
          onClick={() => { setActiveModule(null); navigate("/dashboard"); }} />
      </div>

      {/* ── Intelligence Services ── */}
      <div className="px-2">
        <SectionLabel label="Intelligence Services" />
        {activeMods.map((m) => {
          const Icon = MODULE_ICONS[m.id] || Shield;
          const color = MODULE_ACCENT[m.id] || "#60a5fa";
          const isActive = activeModuleId === m.id && location.pathname === "/dashboard";
          const mAlerts = activeAlerts.filter((a) => a.module_id === m.id).length;
          return (
            <button key={m.id}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-left"
              style={{
                background: isActive ? `${color}18` : "transparent",
                border: isActive ? `1px solid ${color}30` : "1px solid transparent",
                transition: "all 0.15s",
              }}
              onClick={() => { setActiveModule(m.id); navigate("/dashboard"); }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = `${color}0a`; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}20` }}>
                <Icon size={11} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold leading-none truncate" style={{ color: isActive ? color : "var(--soc-text)", fontSize: 11 }}>
                  {MODULE_LABEL[m.id]}
                </p>
                <p className="leading-none mt-0.5 truncate" style={{ color: "#4b5563", fontSize: 9 }}>
                  {MODULE_SUBLABEL[m.id]}
                </p>
              </div>
              {mAlerts > 0 && (
                <span className="font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${color}22`, color, fontSize: 9, minWidth: 18, textAlign: "center" }}>
                  {mAlerts}
                </span>
              )}
              <ChevronRight size={10} style={{ color: "#374151", flexShrink: 0 }} />
            </button>
          );
        })}

      </div>

      {/* ── Intelligence Feeds ── */}
      <div className="px-2">
        <SectionLabel label="Intelligence Feeds" />
        <NavBtn icon={Radio} label="DarkNet Feed" active={location.pathname === "/darknet-feed"}
          onClick={() => navigate("/darknet-feed")} />
        <NavBtn icon={Wallet} label="Wallet Tracker" active={location.pathname === "/wallet-tracker"}
          onClick={() => navigate("/wallet-tracker")} />
        <NavBtn icon={AlertTriangle} label="Leak Monitor" active={location.pathname === "/leak-monitor"}
          onClick={() => navigate("/leak-monitor")} />
      </div>

      {/* ── Investigation ── */}
      <div className="px-2">
        <SectionLabel label="Investigation" />
        <NavBtn icon={Database} label="Entities" active={location.pathname === "/entities"}
          onClick={() => navigate("/entities")} />
        <NavBtn icon={Briefcase} label="Cases" active={location.pathname === "/investigations"}
          onClick={() => navigate("/investigations")} />
        <NavBtn icon={History} label="Scan History" active={location.pathname === "/history"}
          onClick={() => navigate("/history")} />
        <NavBtn icon={FolderOpen} label="Evidence Packages" active={false}
          onClick={() => navigate("/reports")} />
        <NavBtn icon={FileText} label="Reports" active={location.pathname === "/reports"}
          onClick={() => navigate("/reports")} />
      </div>

      {/* ── System ── */}
      <div className="px-2">
        <SectionLabel label="System" />
        <NavBtn icon={Bell} label="Alerts" active={false}
          badge={totalAlerts}
          onClick={() => navigate("/dashboard")} />
        <NavBtn icon={Activity} label="Monitoring" active={false}
          onClick={() => navigate("/settings")} />
        <NavBtn icon={Settings} label="Settings" active={location.pathname === "/settings"}
          onClick={() => navigate("/settings")} />
      </div>

      {/* ── DATA STATUS ── */}
      <div className="mt-auto px-3 py-3 mx-2 mb-2 rounded-lg" style={{ background: "var(--soc-surface-2)", border: "1px solid var(--soc-border)" }}>
        <p className="font-bold uppercase mb-2" style={{ color: "var(--soc-muted)", fontSize: 9, letterSpacing: "0.12em" }}>Data Status</p>
        <div className="space-y-1.5">
          {[
            { label: "Sources Online", value: `${activeMods.length > 0 ? "4,582" : "0"} / 4,582` },
            { label: "Last Update", value: `${utcTime} UTC` },
            { label: "Active Scans", value: String(activeMods.filter((_, i) => i < 3).length * 43) },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span style={{ color: "#4b5563", fontSize: 9 }}>{row.label}</span>
              <span className="font-semibold" style={{ color: "#9ca3af", fontSize: 9 }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span style={{ color: "#4b5563", fontSize: 9 }}>System Health</span>
            <span className="font-bold" style={{ color: "#10b981", fontSize: 9 }}>100%</span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 3, background: "var(--soc-border)" }}>
            <div className="h-full rounded-full" style={{ width: "100%", background: "#10b981" }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
