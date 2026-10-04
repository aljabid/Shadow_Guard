/**
 * TopBar — AFM Intelligence Dashboard header
 * Matches the reference design: title left, SYSTEM ONLINE + UTC + icons right
 */
import { useAuth } from "@/hooks/useAuth";
import { useAlertsStore, useModulesStore, useUIStore } from "@/store";
import { Bell, Settings, HelpCircle, ChevronLeft, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const MODULE_LABEL: Record<string, string> = {
  kolkhoz: "KOLKHOZ", droper: "DROPER", piramida: "PIRAMIDA",
  shadowbet: "SHADOWBET", tengraf: "TENGRAF", contraband: "CONTRABAND",
};
const MODULE_ACCENT: Record<string, string> = {
  kolkhoz: "#ef4444", droper: "#f97316", piramida: "#eab308",
  shadowbet: "#a855f7", tengraf: "#3b82f6", contraband: "#10b981",
};

export default function TopBar() {
  const { user, logout } = useAuth();
  const { unreadCount, isConnected } = useAlertsStore();
  const { activeModuleId, setActiveModule } = useModulesStore();
  const { toggleAlertFeed } = useUIStore();
  const location = useLocation();
  const [utcTime, setUtcTime] = useState("");

  useEffect(() => {
    const tick = () => setUtcTime(new Date().toUTCString().slice(17, 25));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isDashboard = location.pathname === "/dashboard";
  const isEntities = location.pathname === "/entities";
  const isReports = location.pathname === "/reports";

  let pageTitle = "AFM INTELLIGENCE DASHBOARD";
  let pageSubtitle = "Real-time Overview";
  if (activeModuleId && isDashboard) {
    pageTitle = MODULE_LABEL[activeModuleId] || activeModuleId.toUpperCase();
    pageSubtitle = "Intelligence Module";
  } else if (isEntities) {
    pageTitle = "ENTITY HUB";
    pageSubtitle = "Cross-Module Correlation & Investigation";
  } else if (isReports) {
    pageTitle = "REPORTS & EVIDENCE";
    pageSubtitle = "Evidence Packages & Intelligence Reports";
  } else if (location.pathname === "/settings") {
    pageTitle = "SETTINGS";
    pageSubtitle = "System Configuration";
  }

  const accent = activeModuleId ? MODULE_ACCENT[activeModuleId] : undefined;

  return (
    <header
      className="flex items-center justify-between px-5"
      style={{
        background: "var(--soc-bg)",
        borderBottom: "1px solid var(--soc-border)",
        height: 52,
        flexShrink: 0,
        transition: "background-color 0.25s ease",
      }}
    >
      {/* Left: back (if module active) + page title */}
      <div className="flex items-center gap-3">
        {activeModuleId && isDashboard && (
          <button
            onClick={() => setActiveModule(null)}
            className="flex items-center gap-1 mr-1"
            style={{ color: "#4b5563" }}
          >
            <ChevronLeft size={14} />
          </button>
        )}
        <div>
          <p className="font-black leading-none"
            style={{ color: accent || "#e5e7eb", fontSize: 13, letterSpacing: "0.06em" }}>
            {pageTitle}
          </p>
          <p className="leading-none mt-0.5" style={{ color: "var(--soc-muted)", fontSize: 10 }}>
            {pageSubtitle}
          </p>
        </div>
      </div>

      {/* Right: system status + time + icons + avatar */}
      <div className="flex items-center gap-4">
        {/* System status */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: isConnected ? "#10b981" : "#ef4444" }} />
          <span className="font-semibold" style={{ color: isConnected ? "#10b981" : "#ef4444", fontSize: 10 }}>
            {isConnected ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
          </span>
        </div>

        {/* UTC time */}
        <span className="font-mono font-semibold" style={{ color: "#9ca3af", fontSize: 12 }}>
          {utcTime} UTC
        </span>

        {/* Bell */}
        <button onClick={toggleAlertFeed} className="relative" style={{ color: "#6b7280" }}>
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
              style={{ width: 14, height: 14, fontSize: 8, background: "#ef4444" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Settings */}
        <button style={{ color: "#6b7280" }}>
          <Settings size={16} />
        </button>

        {/* Help */}
        <button style={{ color: "#6b7280" }}>
          <HelpCircle size={16} />
        </button>

        {/* User avatar */}
        <button onClick={logout}
          className="w-8 h-8 rounded-full flex items-center justify-center font-black"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)", color: "#fff", fontSize: 11 }}>
          {String(user?.username || "U").slice(0, 2).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
