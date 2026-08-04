import { useModulesStore, useAlertsStore } from "@/store";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Search,
  TrendingUp,
  Dice6,
  Network,
  PackageSearch,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import RiskScoreBadge from "@/components/common/RiskScoreBadge";

const MODULE_ICONS: Record<string, React.ReactNode> = {
  kolkhoz:   <Shield size={22} />,
  droper:    <Search size={22} />,
  piramida:  <TrendingUp size={22} />,
  shadowbet: <Dice6 size={22} />,
  tengraf:   <Network size={22} />,
  contraband: <PackageSearch size={22} />,
};

const MODULE_TAGLINE: Record<string, string> = {
  kolkhoz:   "RAKS case: Alert fired 14 hrs before $9.7M freeze",
  droper:    "20,000+ drop card mule accounts frozen",
  piramida:  "24 pyramid schemes dismantled — 6 months early warning",
  shadowbet: "1,100+ illegal gambling sites identified",
  tengraf:   "DarkNet + open-web OSINT active intelligence",
  contraband: "Drug, vape, alcohol contraband network monitoring",
};

const MODULE_ACCENT: Record<string, string> = {
  kolkhoz:   "#60a5fa",
  droper:    "#ef4444",
  piramida:  "#a855f7",
  shadowbet: "#f97316",
  tengraf:   "#eab308",
  contraband: "#10b981",
};

export default function ModuleSelector() {
  const { modules, setActiveModule, getModuleResult, getModuleTask } = useModulesStore();
  const alerts = useAlertsStore((s) => s.alerts);
  const navigate = useNavigate();

  const activeModules = modules.filter((m) => m.status === "active");
  const futureModules = modules.filter((m) => m.status === "coming_soon");

  const totalAlerts = alerts.filter((a: any) => !a.is_dismissed).length;
  const criticalAlerts = alerts.filter(
    (a: any) => !a.is_dismissed && (a.severity === "critical" || a.risk_score >= 85)
  ).length;

  const handleSelect = (id: string) => {
    setActiveModule(id);
    navigate("/dashboard");
  };

  return (
    <div>
      {/* ── Platform Header ── */}
      <div
        className="mb-6 p-5 rounded"
        style={{
          background:
            "linear-gradient(135deg, rgba(233,69,96,0.1), rgba(10,14,26,0.8))",
          border: "1px solid rgba(233,69,96,0.2)",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "var(--soc-accent)" }}
            >
              AFM Digital Intelligence Platform
            </p>
            <h1
              className="text-2xl font-bold mb-1"
              style={{ color: "var(--soc-text)" }}
            >
              ShadowGuard
            </h1>
            <p className="text-sm" style={{ color: "var(--soc-muted)" }}>
              AI-powered financial crime intelligence — Kazakhstan AFM Hackathon
              2026
            </p>
          </div>

          {totalAlerts > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold"
              style={{
                background:
                  criticalAlerts > 0
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(245,158,11,0.12)",
                border: `1px solid ${criticalAlerts > 0 ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                color:
                  criticalAlerts > 0 ? "#f87171" : "var(--soc-amber)",
              }}
            >
              <AlertTriangle size={12} />
              {totalAlerts} active alert{totalAlerts !== 1 ? "s" : ""}
              {criticalAlerts > 0 && ` · ${criticalAlerts} critical`}
            </div>
          )}
        </div>

        {/* Platform-level stats */}
        <div className="mt-4 flex flex-wrap gap-4">
          {[
            { label: "Active Modules", value: activeModules.length },
            {
              label: "Active Alerts",
              value: totalAlerts,
              accent: totalAlerts > 0,
            },
            { label: "Critical", value: criticalAlerts, accent: criticalAlerts > 0 },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
                {s.label}
              </p>
              <p
                className="text-lg font-bold"
                style={{
                  color: s.accent
                    ? "var(--soc-accent)"
                    : "var(--soc-text)",
                }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Module Grid ── */}
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: "var(--soc-muted)" }}
      >
        Intelligence Modules — Select to Activate
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {activeModules.map((m) => {
          const lastResult = getModuleResult(m.id);
          const lastTask = getModuleTask(m.id);
          const accent = MODULE_ACCENT[m.id] || "var(--soc-accent)";
          const moduleAlerts = alerts.filter(
            (a: any) => !a.is_dismissed && a.module_id === m.id
          );

          const topRisk =
            (lastResult?.results as any[])?.[0]?.risk_score ||
            (lastResult?.top_channels as any[])?.[0]?.risk_score ||
            (lastResult?.findings as any[])?.[0]?.risk_score ||
            null;

          return (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className="card text-left group"
              style={{
                borderColor: "var(--soc-border)",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = `${accent}60`)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--soc-border)")
              }
            >
              {/* Icon + status row */}
              <div className="flex items-start justify-between mb-3">
                <div style={{ color: accent }}>
                  {MODULE_ICONS[m.id] || <Shield size={22} />}
                </div>

                <div className="flex items-center gap-2">
                  {moduleAlerts.length > 0 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded font-bold"
                      style={{
                        background: "rgba(233,69,96,0.15)",
                        color: "var(--soc-accent)",
                      }}
                    >
                      {moduleAlerts.length} alert
                      {moduleAlerts.length !== 1 ? "s" : ""}
                    </span>
                  )}

                  {lastTask?.status === "success" ? (
                    <span
                      className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        color: "var(--soc-green)",
                      }}
                    >
                      <CheckCircle size={10} />
                      Done
                    </span>
                  ) : lastTask?.status === "started" ? (
                    <span
                      className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                      style={{
                        background: "rgba(59,130,246,0.1)",
                        color: "#60a5fa",
                      }}
                    >
                      <Clock size={10} />
                      Running
                    </span>
                  ) : (
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        color: "var(--soc-green)",
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Module name */}
              <h3
                className="font-bold text-sm mb-1"
                style={{ color: "var(--soc-text)" }}
              >
                {m.name}
              </h3>

              {/* Description */}
              <p
                className="text-xs mb-3 leading-relaxed"
                style={{ color: "var(--soc-muted)" }}
              >
                {(m.description || "").slice(0, 100)}
                {(m.description || "").length > 100 ? "…" : ""}
              </p>

              {/* Last scan result summary */}
              {lastResult && topRisk !== null ? (
                <div className="flex items-center justify-between">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--soc-amber)" }}
                  >
                    {MODULE_TAGLINE[m.id] || "Last scan complete"}
                  </p>
                  <RiskScoreBadge score={topRisk} size="sm" showLabel={false} />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--soc-amber)" }}
                  >
                    {MODULE_TAGLINE[m.id] || ""}
                  </p>
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: "var(--soc-muted)" }}
                  >
                    Open <ChevronRight size={11} />
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Coming Soon ── */}
      {futureModules.length > 0 && (
        <>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--soc-muted)" }}
          >
            Coming Soon
          </p>

          <div className="grid grid-cols-2 gap-3">
            {futureModules.map((m) => (
              <div
                key={m.id}
                className="card opacity-50"
                style={{ cursor: "not-allowed" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div style={{ color: "var(--soc-muted)" }}>
                    {MODULE_ICONS[m.id] || <Shield size={22} />}
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: "var(--soc-surface-2)",
                      color: "var(--soc-muted)",
                      border: "1px solid var(--soc-border)",
                    }}
                  >
                    COMING SOON
                  </span>
                </div>
                <h3
                  className="font-bold text-sm mb-1"
                  style={{ color: "var(--soc-text)" }}
                >
                  {m.name}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--soc-muted)" }}
                >
                  {(m.description || "").slice(0, 90)}
                  {(m.description || "").length > 90 ? "…" : ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
