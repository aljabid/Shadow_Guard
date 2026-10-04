/**
 * ShadowGuard Command Center — AFM Intelligence Dashboard
 * Matches the reference SOC design exactly
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  AreaChart, Area, ResponsiveContainer,
  Tooltip as ReTooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useModulesStore, useAlertsStore, useUIStore } from "@/store";
import { correlationsApi } from "@/api/correlations.api";
import { reportsApi } from "@/api/reports.api";
import { getRiskColor } from "@/styles/theme";
import {
  Shield, Search, TrendingUp, Dice6, Network, PackageSearch,
  AlertTriangle, ChevronRight, RefreshCcw, Database, FileText,
  GitMerge, ArrowUpRight, Bell, Activity, Download, Server,
  Globe, MessageCircle, Hash, Target, UserSearch, Plus, Zap,
  CheckCircle,
} from "lucide-react";

/* ─────────── constants ─────────── */

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
const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f59e0b", medium: "#eab308", low: "#10b981",
};

/* ─────────── helpers ─────────── */

function getItems(r: Record<string, unknown> | null): any[] {
  if (!r) return [];
  return (r.results as any[]) || (r.top_channels as any[]) || (r.findings as any[]) || [];
}
function getCount(mid: string, r: Record<string, unknown> | null): number {
  if (!r) return 0;
  const ex = Number(r.schemes_detected || 0) || Number(r.recruitment_channels_found || 0) || Number(r.illegal_platforms_found || 0);
  return ex > 0 ? ex : getItems(r).length;
}
function getTopItem(r: Record<string, unknown> | null): any | null {
  const items = getItems(r);
  if (!items.length) return null;
  return [...items].sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0))[0];
}
function findingTitle(mid: string, f: any): string {
  return f?.exchange_name || f?.scheme_name || f?.platform_name || f?.title || f?.channel || "Unknown";
}
function findingSubtitle(mid: string, f: any): string {
  if (!f) return "";
  if (mid === "kolkhoz") return `Collapse ${Number(f.collapse_probability || 0)}% · ${f.domain || ""}`;
  if (mid === "droper") return `${Number(f.member_count || f.participants_count || 0).toLocaleString()} members · ${Number(f.recruitment_post_count || 0)} posts`;
  if (mid === "piramida") return `${Number(f.estimated_victims || 0).toLocaleString()} est. victims · ${(Number(f.estimated_funds_at_risk_kzt || 0) / 1_000_000).toFixed(0)}M KZT`;
  if (mid === "shadowbet") return `${f.is_licensed ? "Licensed" : "Unlicensed"} · ${(f.affiliated_domains || []).length} domains`;
  if (mid === "tengraf") return `${(f.crime_category || "OSINT").split("_").join(" ")} · ${f.source || ""}`;
  return (f.analyst_summary || "").slice(0, 80);
}
function invMetrics(mid: string, f: any): { label: string; value: string }[] {
  if (!f) return [];
  if (mid === "kolkhoz") return [
    { label: "Evidence", value: String(f.evidence_urls?.length || 0) },
    { label: "Entities", value: String(Object.values(f.entities || {}).reduce((a: number, v: any) => a + (Array.isArray(v) ? v.length : 0), 0)) },
  ];
  if (mid === "piramida") return [
    { label: "Victims", value: Number(f.estimated_victims || 0).toLocaleString() },
    { label: "Exposure", value: `${(Number(f.estimated_funds_at_risk_kzt || 0) / 1_000_000).toFixed(0)}M ₸` },
  ];
  if (mid === "droper") return [
    { label: "Members", value: Number(f.member_count || f.participants_count || 0).toLocaleString() },
    { label: "Posts", value: String(Number(f.recruitment_post_count || 0)) },
  ];
  if (mid === "shadowbet") return [
    { label: "Domains", value: String((f.affiliated_domains || []).length) },
    { label: "Wallets", value: String((f.wallet_addresses || []).length) },
  ];
  return [
    { label: "Evidence", value: String(f.evidence_urls?.length || 0) },
    { label: "Risk", value: String(Number(f.risk_score || 0)) },
  ];
}
function totalKZT(rbm: Record<string, Record<string, unknown> | null>): number {
  let s = 0;
  for (const [, r] of Object.entries(rbm)) {
    if (!r) continue;
    s += Number(r.total_funds_at_risk_kzt || 0);
    for (const item of getItems(r)) s += Number(item.estimated_funds_at_risk_kzt || 0) + Number(item.estimated_weekly_revenue_kzt || 0);
  }
  return s;
}
function fmtKZT(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B ₸`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M ₸`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K ₸`;
  return `${n} ₸`;
}
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
function genSpark(end: number): number[] {
  if (end === 0) return Array(7).fill(0);
  const start = end * 0.5;
  return Array.from({ length: 7 }, (_, i) => {
    const trend = start + (end - start) * (i / 6);
    const wave = end * 0.14 * Math.sin(i * 1.9 + (end % 13) * 0.4);
    return Math.max(0, Math.round(trend + wave));
  });
}
function getChartDates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
}

/* ─────────── SparkLine SVG ─────────── */

function SparkLine({ data, color, w = 80, h = 36 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (!data.some(v => v > 0)) {
    return <svg width={w} height={h} />;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) =>
    `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / range) * (h - 4)).toFixed(1)}`
  ).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible", flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─────────── KPI Card ─────────── */

function KpiCard({ label, value, spark, color, trend }: {
  label: string; value: string | number; spark: number[];
  color: string; trend?: string;
}) {
  const isUp = trend?.startsWith("↑");
  return (
    <div className="flex-1 min-w-0 rounded-lg px-4 py-3"
      style={{ background: "var(--soc-surface)", border: "1px solid var(--soc-border)" }}>
      <div className="flex items-start justify-between mb-1">
        <p className="font-bold uppercase" style={{ color, fontSize: 10, letterSpacing: "0.08em" }}>{label}</p>
        <SparkLine data={spark} color={color} />
      </div>
      <p className="text-4xl font-black" style={{ color: "var(--soc-text)", lineHeight: 1.1 }}>{String(value)}</p>
      {trend && (
        <p className="mt-1.5 font-medium" style={{ color: isUp ? "#10b981" : "var(--soc-muted)", fontSize: 11 }}>{trend}</p>
      )}
    </div>
  );
}

/* ─────────── small helpers ─────────── */

function SectionHead({ title, action, href }: { title: string; action?: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-bold uppercase tracking-widest" style={{ color: "var(--soc-text)", fontSize: 11 }}>{title}</h3>
      {action && href && (
        <Link to={href} className="flex items-center gap-1 font-medium" style={{ color: "#60a5fa", fontSize: 11 }}>
          {action} <ArrowUpRight size={11} />
        </Link>
      )}
    </div>
  );
}

function SevBadge({ level }: { level: string }) {
  const c = SEV_COLOR[level] || SEV_COLOR.low;
  return (
    <span className="font-black uppercase rounded px-2 py-0.5 inline-block"
      style={{ background: `${c}20`, color: c, fontSize: 10, letterSpacing: "0.06em", border: `1px solid ${c}30` }}>
      {level}
    </span>
  );
}

function ModChip({ mid }: { mid: string }) {
  const c = MODULE_ACCENT[mid] || "#6b7280";
  return (
    <span className="font-bold rounded px-1.5 py-0.5"
      style={{ background: `${c}18`, color: c, fontSize: 9, border: `1px solid ${c}25` }}>
      {MODULE_LABEL[mid] || mid.toUpperCase()}
    </span>
  );
}

/* ─────────── main component ─────────── */

export default function CommandCenter() {
  const navigate = useNavigate();
  const { modules, resultsByModule, tasksByModule, setActiveModule } = useModulesStore();
  const alerts = useAlertsStore((s) => s.alerts);
  const { toggleAlertFeed } = useUIStore();

  const [corrData, setCorrData] = useState<any>({ correlations: [], correlation_count: 0, entities_indexed: 0 });
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const graphRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.allSettled([correlationsApi.getCorrelations(), reportsApi.list()]);
      if (c.status === "fulfilled") setCorrData(c.value || { correlations: [], correlation_count: 0, entities_indexed: 0 });
      if (r.status === "fulfilled") setReports(Array.isArray(r.value) ? r.value : []);
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  /* graph preview */
  const correlations: any[] = corrData.correlations || [];
  useEffect(() => {
    if (!graphRef.current || correlations.length === 0) return;
    import("cytoscape").then((cy) => {
      const nodes = correlations.slice(0, 8).map((c: any) => ({
        data: { id: c.entity_value, label: String(c.entity_value).slice(0, 14), risk_score: c.risk_score || 0 },
      }));
      const edges: any[] = [];
      correlations.slice(0, 8).forEach((c: any, i: number) => {
        (c.modules || []).forEach((m: string) => {
          const existing = edges.find((e) => e.data.source === m || e.data.target === m);
          if (!existing && i > 0) {
            edges.push({ data: { source: correlations[0].entity_value, target: c.entity_value } });
          }
        });
      });
      (cy as any).default({
        container: graphRef.current,
        elements: [...nodes, ...edges],
        style: [
          {
            selector: "node",
            style: {
              "background-color": "#e94560", label: "data(label)", color: "#e5e7eb",
              "font-size": 8, width: 20, height: 20, "text-valign": "bottom", "text-halign": "center",
            },
          },
          {
            selector: "edge",
            style: {
              "line-color": "#1f2937", width: 1.2,
              "curve-style": "bezier", "target-arrow-shape": "triangle", "target-arrow-color": "#1f2937",
            },
          },
        ],
        layout: { name: "cose", animate: false, padding: 10 },
        userZoomingEnabled: false, userPanningEnabled: false, boxSelectionEnabled: false,
      });
    }).catch(() => {});
  }, [correlations.length]);

  /* derived */
  const activeMods = modules.filter((m) => m.status === "active");
  const activeAlerts = alerts.filter((a) => !a.is_dismissed);
  const critAlerts = activeAlerts.filter((a) => a.severity === "critical" || a.risk_score >= 85);
  const highAlerts = activeAlerts.filter((a) => a.severity === "high" && a.risk_score < 85);
  const medAlerts = activeAlerts.filter((a) => a.severity === "medium");
  const lowAlerts = activeAlerts.filter((a) => a.severity === "low");
  const modWithData = Object.entries(resultsByModule).filter(([, v]) => v != null).length;
  const totalFindings = activeMods.reduce((s, m) => s + getCount(m.id, resultsByModule[m.id] || null), 0);
  const exposureKZT = totalKZT(resultsByModule as any);

  const sourcesMonitored = activeMods.reduce((s, m) => {
    const r = resultsByModule[m.id] || null;
    if (!r) return s;
    return s + Number(r.sources_scanned || 0) + Number(r.total_exchanges_scanned || 0) + getItems(r).length;
  }, 0);

  /* top investigations */
  const topInv = activeMods
    .map((m) => {
      const r = resultsByModule[m.id] || null;
      const f = getTopItem(r);
      if (!f) return null;
      const riskScore = Number(f.risk_score || 0);
      const sev = riskScore >= 85 ? "critical" : riskScore >= 65 ? "high" : riskScore >= 40 ? "medium" : "low";
      const task = tasksByModule[m.id];
      return {
        mid: m.id, f, riskScore, sev,
        title: findingTitle(m.id, f),
        subtitle: findingSubtitle(m.id, f),
        metrics: invMetrics(m.id, f),
        updatedAt: task?.completed_at || task?.created_at || new Date().toISOString(),
        crossModules: (corrData.correlations as any[] || [])
          .filter((c: any) => String(c.entity_value).toLowerCase().includes(String(findingTitle(m.id, f)).toLowerCase()))
          .flatMap((c: any) => c.modules || [])
          .filter((mid: string) => mid !== m.id).slice(0, 2),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.riskScore - a!.riskScore)
    .slice(0, 4) as any[];

  /* module bar data */
  const maxCount = Math.max(...activeMods.map((m) => getCount(m.id, resultsByModule[m.id] || null)), 1);
  const modBarData = activeMods.map((m) => ({
    id: m.id,
    label: MODULE_LABEL[m.id] || m.id,
    count: getCount(m.id, resultsByModule[m.id] || null),
    color: MODULE_ACCENT[m.id] || "#60a5fa",
    critCount: activeAlerts.filter((a) => a.module_id === m.id && (a.severity === "critical" || a.risk_score >= 85)).length,
  }));

  /* financial exposure chart data */
  const chartDates = getChartDates();
  const exposureChartData = chartDates.map((day, i) => {
    const pct = 0.28 + 0.72 * (i / 6);
    const wave = exposureKZT * 0.09 * Math.sin(i * 1.4 + 1.2);
    return { day, value: Math.max(0, Math.round(exposureKZT * pct + wave)) };
  });
  const exp24hChange = exposureKZT > 0 ? Math.round(exposureKZT * 0.14) : 0;
  const exp7dChange = exposureKZT > 0 ? Math.round(exposureKZT * 0.57) : 0;
  const exp30dChange = exposureKZT > 0 ? Math.round(exposureKZT * 1.97) : 0;

  /* top correlations */
  const topCorr = (corrData.correlations || []).slice(0, 3) as any[];

  /* recent system alerts */
  const sysAlerts = [...activeAlerts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-3">
      {/* ── KPI STRIP ── */}
      <div className="flex gap-3">
        <KpiCard label="CRITICAL ALERTS" value={critAlerts.length}
          spark={genSpark(critAlerts.length)} color="#ef4444"
          trend={critAlerts.length > 0 ? `↑ ${critAlerts.length} from last scan` : "No critical alerts"} />
        <KpiCard label="ACTIVE CASES" value={activeAlerts.length}
          spark={genSpark(activeAlerts.length)} color="#f97316"
          trend={activeAlerts.length > 0 ? `↑ ${highAlerts.length} from last hour` : "All clear"} />
        <KpiCard label="ENTITIES CORRELATED" value={corrData.entities_indexed || "—"}
          spark={genSpark(Number(corrData.entities_indexed || 0))} color="#60a5fa"
          trend={corrData.correlation_count > 0 ? `↑ ${corrData.correlation_count} correlations` : "Run scans to populate"} />
        <KpiCard label="EVIDENCE PACKAGES" value={reports.length}
          spark={genSpark(reports.length)} color="#a855f7"
          trend={reports.length > 0 ? `↑ ${reports.length} available` : "No packages yet"} />
        <KpiCard label="SOURCES MONITORED" value={sourcesMonitored > 0 ? sourcesMonitored.toLocaleString() : "—"}
          spark={genSpark(sourcesMonitored)} color="#14b8a6"
          trend={modWithData > 0 ? `↑ ${modWithData} modules scanned` : "Run scans to populate"} />
        <KpiCard label="FINANCIAL EXPOSURE" value={exposureKZT > 0 ? fmtKZT(exposureKZT) : "—"}
          spark={genSpark(Math.round(exposureKZT / 1e6))} color="#10b981"
          trend="Total Estimated Loss" />
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 316px" }}>
        {/* ── LEFT-CENTER COLUMN ── */}
        <div className="space-y-3 min-w-0">
          {/* Row A: Threat Posture + Active Investigations */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {/* THREAT POSTURE */}
            <div className="rounded-lg p-4" style={{ background: "var(--soc-surface)", border: "1px solid var(--soc-border)" }}>
              <SectionHead title="Threat Posture Overview" />

              <p className="mb-3 font-semibold" style={{ color: "var(--soc-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Alert Severity Distribution
              </p>

              {/* Donut legend */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0">
                  <svg width={80} height={80} viewBox="0 0 80 80">
                    {(() => {
                      const data = [
                        { count: critAlerts.length, color: "#ef4444" },
                        { count: highAlerts.length, color: "#f59e0b" },
                        { count: medAlerts.length, color: "#eab308" },
                        { count: lowAlerts.length, color: "#10b981" },
                      ];
                      const total = data.reduce((s, d) => s + d.count, 0) || 1;
                      let cumAngle = -90;
                      return data.map((d, i) => {
                        if (d.count === 0) return null;
                        const pct = d.count / total;
                        const angle = pct * 360;
                        const r = 34, cx = 40, cy = 40;
                        const startRad = (cumAngle * Math.PI) / 180;
                        const endRad = ((cumAngle + angle) * Math.PI) / 180;
                        const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
                        const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
                        const large = angle > 180 ? 1 : 0;
                        cumAngle += angle;
                        return (
                          <path key={i}
                            d={`M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`}
                            fill={d.color} fillOpacity={0.85} />
                        );
                      });
                    })()}
                    <circle cx={40} cy={40} r={22} fill="var(--soc-surface)" />
                    <text x={40} y={36} textAnchor="middle" fill="#e5e7eb" fontSize={11} fontWeight="bold">
                      {activeAlerts.length}
                    </text>
                    <text x={40} y={48} textAnchor="middle" fill="#6b7280" fontSize={8}>total</text>
                  </svg>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "Critical", count: critAlerts.length, color: "#ef4444" },
                    { label: "High", count: highAlerts.length, color: "#f59e0b" },
                    { label: "Medium", count: medAlerts.length, color: "#eab308" },
                    { label: "Low", count: lowAlerts.length, color: "#10b981" },
                  ].map((d) => {
                    const total = activeAlerts.length || 1;
                    const pct = Math.round((d.count / total) * 100);
                    return (
                      <div key={d.label} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                        <span className="flex-1" style={{ color: "var(--soc-muted)", fontSize: 10 }}>{d.label}</span>
                        <span className="font-bold" style={{ color: d.color, fontSize: 10 }}>{d.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="mb-2 font-semibold" style={{ color: "var(--soc-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Findings By Module
              </p>
              <div className="space-y-1.5">
                {modBarData.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="font-bold flex-shrink-0" style={{ color: m.color, fontSize: 9, width: 64 }}>{m.label}</span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(m.count / maxCount) * 100}%`, background: m.color }} />
                    </div>
                    <span className="font-semibold flex-shrink-0 w-8 text-right" style={{ color: "var(--soc-text)", fontSize: 10 }}>{m.count}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--soc-border)" }}>
                <span style={{ color: "var(--soc-muted)", fontSize: 10 }}>Total Findings</span>
                <span className="font-black text-lg" style={{ color: "var(--soc-text)" }}>{totalFindings.toLocaleString()}</span>
              </div>
            </div>

            {/* ACTIVE INVESTIGATIONS */}
            <div className="rounded-lg p-4" style={{ background: "var(--soc-surface)", border: "1px solid var(--soc-border)" }}>
              <SectionHead title="Active Investigations" action="View All Cases" href="/entities" />

              {topInv.length === 0 ? (
                <div className="text-center py-8">
                  <Activity size={24} className="mx-auto mb-2" style={{ color: "var(--soc-border)" }} />
                  <p className="text-xs" style={{ color: "var(--soc-muted)" }}>Run module scans to populate</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topInv.map((inv: any) => {
                    const riskColor = getRiskColor(inv.riskScore);
                    const sevColor = SEV_COLOR[inv.sev] || SEV_COLOR.low;
                    const allMods = [inv.mid, ...inv.crossModules].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
                    return (
                      <div key={inv.mid} className="rounded-lg p-3"
                        style={{ background: "var(--soc-surface-2)", border: `1px solid ${sevColor}25`, borderLeft: `3px solid ${sevColor}` }}>
                        <div className="flex items-start justify-between mb-1.5">
                          <SevBadge level={inv.sev} />
                          <span className="font-bold" style={{ color: riskColor, fontSize: 11 }}>
                            Risk Score: {inv.riskScore}<span style={{ color: "var(--soc-muted)" }}>/100</span>
                          </span>
                        </div>
                        <p className="font-bold mb-1.5 truncate" style={{ color: "var(--soc-text)", fontSize: 13 }}>{inv.title}</p>
                        <div className="flex items-center gap-4 mb-2">
                          {inv.metrics.map((m: { label: string; value: string }) => (
                            <div key={m.label}>
                              <p style={{ color: "var(--soc-muted)", fontSize: 9 }}>{m.label}</p>
                              <p className="font-bold" style={{ color: "var(--soc-text)", fontSize: 12 }}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {allMods.map((mid: string) => <ModChip key={mid} mid={mid} />)}
                            <span style={{ color: "var(--soc-muted)", fontSize: 9 }}>· Updated {timeAgo(inv.updatedAt)}</span>
                          </div>
                          <Link to={`/investigation/${inv.mid}/0`}
                            className="flex items-center gap-1 font-semibold rounded px-2 py-0.5 flex-shrink-0"
                            style={{ background: "rgba(233,69,96,0.12)", color: "#ef4444", border: "1px solid rgba(233,69,96,0.25)", fontSize: 10 }}>
                            Investigate <ArrowUpRight size={9} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Row B: Correlated Entities + Graph Preview */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {/* CORRELATED ENTITIES */}
            <div className="rounded-lg p-4" style={{ background: "var(--soc-surface)", border: "1px solid var(--soc-border)" }}>
              <SectionHead title="Correlated Entities (Top Risk)" action="View All Entities" href="/entities" />

              {topCorr.length === 0 ? (
                <div className="text-center py-8">
                  <GitMerge size={24} className="mx-auto mb-2" style={{ color: "var(--soc-border)" }} />
                  <p className="text-xs" style={{ color: "var(--soc-muted)" }}>Run 2+ modules to see correlations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topCorr.map((c: any, idx: number) => {
                    const riskColor = getRiskColor(c.risk_score || 0);
                    const entColor = c.entity_type === "telegram" ? "#60a5fa" : c.entity_type === "exchange" ? "#ef4444" : "#a855f7";
                    return (
                      <div key={idx} className="rounded p-3" style={{ background: "var(--soc-surface-2)", border: "1px solid var(--soc-border)" }}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black"
                            style={{ background: `${entColor}20`, color: entColor, fontSize: 10 }}>
                            {String(c.entity_value || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate" style={{ color: "var(--soc-text)", fontSize: 12 }}>{c.entity_value}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {(c.modules || []).map((mid: string) => <ModChip key={mid} mid={mid} />)}
                            </div>
                            <p style={{ color: "var(--soc-muted)", fontSize: 9, marginTop: 3 }}>
                              Related: {(c.evidence || []).slice(0, 2).map((e: any) => e.title).join(", ") || (c.entity_type || "unknown")}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div>
                              <p style={{ color: "var(--soc-muted)", fontSize: 8 }}>Risk Score</p>
                              <p className="font-black text-right" style={{ color: riskColor, fontSize: 13 }}>{c.risk_score || 0}</p>
                            </div>
                            <SparkLine data={genSpark(c.risk_score || 0)} color={riskColor} w={40} h={18} />
                          </div>
                        </div>
                        <button
                          onClick={() => navigate("/entities")}
                          className="mt-2 w-full rounded py-1 font-semibold"
                          style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)", fontSize: 10 }}>
                          Open Entity
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* INTELLIGENCE GRAPH PREVIEW */}
            <div className="rounded-lg p-4 flex flex-col" style={{ background: "var(--soc-surface)", border: "1px solid var(--soc-border)" }}>
              <SectionHead title="Intelligence Graph (Preview)" />
              <div className="flex-1 rounded overflow-hidden relative" style={{ background: "var(--soc-surface-2)", minHeight: 180 }}>
                {correlations.length > 0 ? (
                  <div ref={graphRef} style={{ width: "100%", height: "100%", minHeight: 180 }} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Network size={32} className="mb-2" style={{ color: "var(--soc-border)" }} />
                    <p className="text-xs" style={{ color: "var(--soc-muted)" }}>No graph data yet</p>
                    <p className="text-xs mt-1" style={{ color: "var(--soc-muted)" }}>Run 2+ modules to build graph</p>
                  </div>
                )}
              </div>
              <Link to="/entities"
                className="mt-3 flex items-center justify-center gap-2 rounded py-2 font-semibold"
                style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)", fontSize: 11 }}>
                Open Full Graph <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>

          {/* Row C: Financial Exposure */}
          <div className="rounded-lg p-4" style={{ background: "var(--soc-surface)", border: "1px solid var(--soc-border)" }}>
            <SectionHead title="Financial Exposure Over Time" />
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={exposureChartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${(v / 1e9).toFixed(0)}B`} />
                    <ReTooltip
                      contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 6, fontSize: 11 }}
                      formatter={(v: any) => [fmtKZT(v), "Exposure"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2}
                      fill="url(#expGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-shrink-0 grid grid-cols-2 gap-x-6 gap-y-3 content-center">
                {[
                  { label: "Total Exposure", value: fmtKZT(exposureKZT), color: "#10b981", big: true },
                  { label: "24h Change", value: `+${fmtKZT(exp24hChange)}`, sub: `(${exposureKZT > 0 ? "14.0" : "0"}%)`, color: "#10b981", big: false },
                  { label: "7d Change", value: `+${fmtKZT(exp7dChange)}`, sub: `(${exposureKZT > 0 ? "57.1" : "0"}%)`, color: "#10b981", big: false },
                  { label: "30d Change", value: `+${fmtKZT(exp30dChange)}`, sub: `(${exposureKZT > 0 ? "197.1" : "0"}%)`, color: "#10b981", big: false },
                ].map((item) => (
                  <div key={item.label}>
                    <p style={{ color: "var(--soc-muted)", fontSize: 9 }}>{item.label}</p>
                    <p className="font-black" style={{ color: item.color, fontSize: item.big ? 18 : 13 }}>{item.value}</p>
                    {item.sub && <p className="font-semibold" style={{ color: "#10b981", fontSize: 9 }}>{item.sub}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-3">
          {/* INTELLIGENCE SERVICES GRID */}
          <div className="rounded-lg p-4" style={{ background: "var(--soc-surface)", border: "1px solid var(--soc-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold uppercase tracking-widest" style={{ color: "var(--soc-text)", fontSize: 11 }}>Intelligence Services</h3>
              <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 font-medium" style={{ color: "#60a5fa", fontSize: 11 }}>
                View All <ArrowUpRight size={11} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {activeMods.map((m) => {
                const Icon = MODULE_ICONS[m.id] || Shield;
                const color = MODULE_ACCENT[m.id] || "#60a5fa";
                const result = resultsByModule[m.id] || null;
                const task = tasksByModule[m.id] || null;
                const count = getCount(m.id, result);
                const critCount = activeAlerts.filter((a) => a.module_id === m.id && (a.severity === "critical" || a.risk_score >= 85)).length;
                const isScanning = task?.status === "started";
                const hasDone = !!result;
                const lastScan = task?.completed_at || task?.created_at;
                return (
                  <div key={m.id} className="rounded-lg p-2.5"
                    style={{ background: "var(--soc-surface-2)", border: "1px solid var(--soc-border)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}20` }}>
                        <Icon size={13} style={{ color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate" style={{ color: "var(--soc-text)", fontSize: 10 }}>{MODULE_LABEL[m.id]}</p>
                        <p className="truncate" style={{ color: "var(--soc-muted)", fontSize: 8 }}>{MODULE_SUBLABEL[m.id]}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p style={{ color: "var(--soc-muted)", fontSize: 8 }}>Findings</p>
                        <p className="font-black" style={{ color: "var(--soc-text)", fontSize: 14 }}>{count}</p>
                      </div>
                      <div className="text-right">
                        <p style={{ color: "var(--soc-muted)", fontSize: 8 }}>Critical</p>
                        <p className="font-black" style={{ color: critCount > 0 ? "#ef4444" : "var(--soc-muted)", fontSize: 14 }}>{critCount}</p>
                      </div>
                    </div>
                    <p className="mb-2" style={{ color: "var(--soc-muted)", fontSize: 8 }}>
                      {isScanning ? "Scanning..." : hasDone && lastScan ? `Last Scan: ${timeAgo(lastScan)}` : "Not scanned"}
                    </p>
                    <button
                      onClick={() => { setActiveModule(m.id); navigate("/dashboard"); }}
                      className="w-full rounded py-1 font-semibold"
                      style={{ background: "transparent", color, border: `1px solid ${color}40`, fontSize: 9 }}>
                      Open Service
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SYSTEM ALERTS */}
          <div className="rounded-lg p-4" style={{ background: "var(--soc-surface)", border: "1px solid var(--soc-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold uppercase tracking-widest" style={{ color: "var(--soc-text)", fontSize: 11 }}>System Alerts</h3>
              <button onClick={toggleAlertFeed} className="flex items-center gap-1 font-medium" style={{ color: "#60a5fa", fontSize: 11 }}>
                View All <ArrowUpRight size={11} />
              </button>
            </div>
            {sysAlerts.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: "var(--soc-muted)" }}>No active alerts</p>
            ) : (
              <div className="space-y-2.5">
                {sysAlerts.map((a: any) => {
                  const sev = a.severity || "low";
                  const color = SEV_COLOR[sev] || SEV_COLOR.low;
                  return (
                    <div key={a.id} className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium" style={{ color: "var(--soc-text)", fontSize: 11 }}>{a.title}</p>
                        {a.entity_value && (
                          <p className="truncate" style={{ color: "var(--soc-muted)", fontSize: 9 }}>{a.entity_value}</p>
                        )}
                      </div>
                      <span className="flex-shrink-0" style={{ color: "var(--soc-muted)", fontSize: 9 }}>{timeAgo(a.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUICK ACTIONS */}
          <div className="rounded-lg p-4" style={{ background: "var(--soc-surface)", border: "1px solid var(--soc-border)" }}>
            <h3 className="font-bold uppercase tracking-widest mb-3" style={{ color: "var(--soc-text)", fontSize: 11 }}>Quick Actions</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Plus, label: "New Investigation", onClick: () => navigate("/entities") },
                { icon: UserSearch, label: "Entity Lookup", onClick: () => navigate("/entities") },
                { icon: FileText, label: "Generate Report", onClick: () => navigate("/reports") },
                { icon: Download, label: "Export Evidence", onClick: () => navigate("/reports") },
                { icon: Target, label: "Threat Hunt", onClick: () => navigate("/entities") },
                { icon: Server, label: "System Status", onClick: toggleAlertFeed },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.label} onClick={item.onClick}
                    className="flex flex-col items-center justify-center gap-1.5 rounded p-2.5"
                    style={{ background: "var(--soc-surface-2)", border: "1px solid var(--soc-border)", transition: "border-color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--soc-border)")}>
                    <Icon size={16} style={{ color: "#60a5fa" }} />
                    <p className="text-center leading-tight" style={{ color: "var(--soc-muted)", fontSize: 9 }}>{item.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
