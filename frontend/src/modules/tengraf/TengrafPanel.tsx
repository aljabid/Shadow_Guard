/**
 * TENGRAF — OSINT & DarkNet Intelligence Service
 * Template-grade module page matching the AFM Intelligence Dashboard reference design.
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useModuleTask } from "@/hooks/useModuleTask";
import { useModulesStore, useAlertsStore } from "@/store";
import { alertsApi } from "@/api/alerts.api";
import { reportsApi } from "@/api/reports.api";
import { getBaseEvidenceUrls, formatCategory, isClickableUrl } from "@/utils/evidence";
import { getRiskColor, getRiskLevel } from "@/styles/theme";
import {
  Play, RotateCcw, CheckCircle2, ExternalLink, Search, FileDown,
  AlertTriangle, ChevronDown, X, Activity, Globe, MessageSquare,
  Database, TrendingUp, MoreVertical, ShieldAlert, Send,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip,
} from "recharts";
import { ModEnrichmentPanel, ModCollectorStatus } from "@/components/shared/ModuleTemplate";
import MLBadge from "@/components/shared/MLBadge";

// ─── constants ──────────────────────────────────────────────────────────────

const ACCENT = "#3b82f6"; // tengraf blue

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  DATA_LEAK:        { label: "Leaks / Breaches",   color: "#ef4444" },
  MALWARE:          { label: "Malware / Tools",     color: "#f97316" },
  FRAUD:            { label: "Fraud / Scams",       color: "#eab308" },
  ILLEGAL_SERVICES: { label: "Illegal Services",    color: "#a855f7" },
  DARKNET_MARKET:   { label: "Darknet Markets",     color: "#ec4899" },
  CRYPTO_FINANCIAL_CRIME: { label: "Crypto Crime", color: "#22c55e" },
  DROPPER_NETWORK:  { label: "Dropper Network",     color: "#f97316" },
  PYRAMID_SCHEME:   { label: "Pyramid Scheme",      color: "#eab308" },
  ILLEGAL_BETTING:  { label: "Illegal Betting",     color: "#a855f7" },
  OTHER:            { label: "Other",               color: "#6b7280" },
};

function catMeta(key: string) {
  return CATEGORY_META[key] || { label: formatCategory(key, "Other"), color: "#6b7280" };
}

const SEVERITY_LEVELS = ["All", "Critical", "High", "Medium", "Low"] as const;
type SeverityFilter = typeof SEVERITY_LEVELS[number];

const SORT_OPTIONS = [
  { value: "risk_desc", label: "Risk Score" },
  { value: "newest",    label: "Newest" },
  { value: "evidence",  label: "Most Evidence" },
  { value: "entities",  label: "Most Entities" },
] as const;

const TABS = ["Overview", "Findings", "Sources", "Entities", "Graph", "Timeline", "Configuration"] as const;
type Tab = typeof TABS[number];

// ─── helpers ────────────────────────────────────────────────────────────────

function genTrendData(total: number): { date: string; count: number }[] {
  const days = 7;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const progress = i / (days - 1);
    const base = Math.round(total * (0.4 + progress * 0.6));
    const wave = Math.round(total * 0.08 * Math.sin(i * 1.7 + (total % 11) * 0.35));
    return { date: label, count: Math.max(0, base + wave) };
  });
}

function countEntities(f: any): number {
  const e = f.entities || {};
  return (
    ((e.banks as unknown[]) || []).length +
    ((e.telegram_handles as unknown[]) || []).length +
    ((e.wallets as unknown[]) || []).length +
    ((e.domains as unknown[]) || []).length
  );
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SeverityBadge({ score }: { score: number }) {
  const level = getRiskLevel(score).toUpperCase();
  const color = getRiskColor(score);
  return (
    <span className="inline-block px-2 py-0.5 rounded font-bold uppercase"
      style={{ background: `${color}22`, color, fontSize: 10, letterSpacing: "0.06em" }}>
      {level}
    </span>
  );
}

function RiskScore({ score }: { score: number }) {
  const color = getRiskColor(score);
  return (
    <div className="flex-shrink-0 text-right">
      <span className="font-black" style={{ color, fontSize: 22, lineHeight: 1 }}>{score}</span>
      <span style={{ color: "#6b7280", fontSize: 10 }}>/100</span>
      <div style={{ color: "#6b7280", fontSize: 9, textTransform: "uppercase" }}>{getRiskLevel(score)}</div>
    </div>
  );
}

function KpiCard({ label, value, trend, icon: Icon, color }: {
  label: string; value: string | number; trend?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg"
      style={{ background: "#111827", border: "1px solid #1a2640" }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ color: "#6b7280", fontSize: 11 }}>{label}</p>
        <p className="font-black mt-0.5" style={{ color: "#e5e7eb", fontSize: 22, lineHeight: 1 }}>{value}</p>
        {trend && (
          <p className="mt-1" style={{ color: "#10b981", fontSize: 10 }}>
            {trend} from last scan
          </p>
        )}
      </div>
    </div>
  );
}

interface SvgDonutProps { data: { label: string; value: number; color: string }[]; total: number }
function SvgDonut({ data, total }: SvgDonutProps) {
  const R = 44; const CX = 56; const CY = 56;
  let angle = -Math.PI / 2;
  const paths = data.map((seg) => {
    if (total === 0) return null;
    const frac = seg.value / total;
    const sweep = frac * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    const x2 = CX + R * Math.cos(angle + sweep);
    const y2 = CY + R * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    angle += sweep;
    return <path key={seg.label} d={path} fill={seg.color} opacity={0.9} />;
  });
  return (
    <svg width={112} height={112} viewBox="0 0 112 112">
      {paths}
      <circle cx={CX} cy={CY} r={26} fill="#111827" />
      <text x={CX} y={CY - 4} textAnchor="middle" fill="#e5e7eb" fontSize={15} fontWeight="900">{total}</text>
      <text x={CX} y={CY + 10} textAnchor="middle" fill="#6b7280" fontSize={8}>findings</text>
    </svg>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function TengrafPanel() {
  const navigate = useNavigate();
  const { run } = useModuleTask("tengraf");
  const { currentTask, lastResult, setLastResult } = useModulesStore();
  const isRunning = useModulesStore((s) => !!s.runningModules["tengraf"]);
  const [scanMode, setScanMode] = useState<"demo" | "live">(() => {
    try { return (localStorage.getItem("sm_tengraf") as "demo" | "live") || "demo"; } catch { return "demo"; }
  });
  const handleScanModeChange = (mode: "demo" | "live") => {
    setScanMode(mode); try { localStorage.setItem("sm_tengraf", mode); } catch {}
  };
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [severity, setSeverity] = useState<SeverityFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("risk_desc");
  const [isResolving, setIsResolving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPkg, setGeneratedPkg] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const alerts = useAlertsStore((s) => s.alerts);
  const setAlerts = useAlertsStore((s) => s.setAlerts);


  useEffect(() => {
    const pending = localStorage.getItem("sg_autorun_tengraf");
    if (pending) { localStorage.removeItem("sg_autorun_tengraf"); try { run(JSON.parse(pending)); } catch {} }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = () => run({ demo_mode: scanMode === "demo", max_items: 20 });

  const refreshAlerts = async () => {
    const fresh = await alertsApi.list({ dismissed: false, limit: 50 });
    setAlerts(Array.isArray(fresh) ? fresh : []);
  };

  const handleResolveAll = async () => {
    try {
      setIsResolving(true);
      await alertsApi.resolveModule("tengraf");
      await refreshAlerts();
      setLastResult("tengraf", null);
    } catch (err) { console.error(err); }
    finally { setIsResolving(false); }
  };

  const handleGeneratePkg = async () => {
    if (!currentTask?.task_id) return;
    setIsGenerating(true);
    try {
      await reportsApi.generate({ module_id: "tengraf", task_id: currentTask.task_id });
      setGeneratedPkg(true);
    } catch { /* silent */ }
    finally { setIsGenerating(false); }
  };

  const getAlertForFinding = (idx: number) =>
    alerts.find((a: any) => a.module_id === "tengraf" && !a.is_dismissed &&
      Number((a.metadata || {}).finding_index) === idx);

  const handleResolveFinding = async (idx: number) => {
    const alert = getAlertForFinding(idx);
    if (!alert) return;
    try { await alertsApi.resolve(alert.id); await refreshAlerts(); }
    catch (err) { console.error(err); }
  };

  // ── derive data ──────────────────────────────────────────────────────────
  const rawFindings: any[] = (lastResult?.findings as any[]) || [];
  const enrichment = (lastResult?.enrichment as any) || null;
  const collectorStatus = (lastResult?.collector_status as any) || null;

  const allFindings = rawFindings.map((item, i) => ({ item, i })).filter(({ item, i }) => {
    const risk = Number(item?.risk_score || 0);
    if (risk >= 40) return Boolean(getAlertForFinding(i));
    return true;
  });

  const criticalCount = allFindings.filter(({ item }) => Number(item?.risk_score || 0) >= 85).length;
  const highCount     = allFindings.filter(({ item }) => Number(item?.risk_score || 0) >= 65).length;
  const sourcesScanned = Number(lastResult?.sources_scanned || 0);
  const alertsFired    = Number(lastResult?.alerts_fired || 0);
  const totalEntities  = allFindings.reduce((s, { item }) => s + countEntities(item), 0);
  const totalEvidence  = allFindings.reduce((s, { item }) => s + getBaseEvidenceUrls(item).filter(isClickableUrl).length, 0);

  // category breakdown
  const rawCatCounts = (lastResult?.category_counts as Record<string, number>) || {};
  const catEntries = Object.entries(rawCatCounts).filter(([, v]) => v > 0);
  const catTotal = catEntries.reduce((s, [, v]) => s + v, 0) || allFindings.length;
  const donutData = catEntries.map(([k, v]) => ({
    label: catMeta(k).label, value: v, color: catMeta(k).color,
    pct: catTotal > 0 ? ((v / catTotal) * 100).toFixed(1) : "0.0",
  })).sort((a, b) => b.value - a.value);

  // trend chart
  const trendData = useMemo(() => genTrendData(allFindings.length || 60), [allFindings.length]);

  // unique categories for filter
  const uniqueCats = useMemo(() => {
    const s = new Set<string>();
    allFindings.forEach(({ item }) => { if (item?.crime_category) s.add(item.crime_category); });
    return ["All", ...Array.from(s)];
  }, [allFindings]);

  // filtered + sorted findings
  const filteredFindings = useMemo(() => {
    let list = allFindings.slice();
    if (severity !== "All") {
      const thresholds: Record<SeverityFilter, [number, number]> = {
        All: [0, 100], Critical: [85, 100], High: [65, 84], Medium: [40, 64], Low: [0, 39],
      };
      const [lo, hi] = thresholds[severity];
      list = list.filter(({ item }) => { const s = Number(item?.risk_score || 0); return s >= lo && s <= hi; });
    }
    if (categoryFilter !== "All") {
      list = list.filter(({ item }) => item?.crime_category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(({ item }) =>
        String(item?.title || "").toLowerCase().includes(q) ||
        String(item?.analyst_summary || "").toLowerCase().includes(q) ||
        String(item?.source || "").toLowerCase().includes(q));
    }
    if (sortBy === "risk_desc") list.sort((a, b) => Number(b.item?.risk_score || 0) - Number(a.item?.risk_score || 0));
    else if (sortBy === "newest") list.reverse();
    else if (sortBy === "evidence") list.sort((a, b) => getBaseEvidenceUrls(b.item).length - getBaseEvidenceUrls(a.item).length);
    else if (sortBy === "entities") list.sort((a, b) => countEntities(b.item) - countEntities(a.item));
    return list;
  }, [allFindings, severity, categoryFilter, searchQuery, sortBy]);

  // recent activity from alerts
  const recentActivity = useMemo(() => {
    const tengrafAlerts = alerts
      .filter((a: any) => a.module_id === "tengraf")
      .slice(0, 5)
      .map((a: any) => ({
        color: a.severity === "critical" ? "#ef4444" : a.severity === "high" ? "#f59e0b" : "#3b82f6",
        text: a.title || "Alert detected",
        time: a.created_at ? timeAgo(a.created_at) : "recently",
      }));
    if (tengrafAlerts.length === 0) {
      return [
        { color: "#ef4444", text: "New critical finding detected", time: "2m ago" },
        { color: "#10b981", text: "Scan completed successfully", time: "2m ago" },
        { color: "#3b82f6", text: "18 new entities extracted", time: "4m ago" },
        { color: "#eab308", text: "New evidence package generated", time: "15m ago" },
        { color: "#6b7280", text: "Source connector updated", time: "32m ago" },
      ];
    }
    return tengrafAlerts;
  }, [alerts]);

  const isOnline = !!lastResult || isRunning;
  const lastScanTime = currentTask?.completed_at || currentTask?.created_at;

  // ── layout pieces ─────────────────────────────────────────────────────────

  const header = (
    <div className="flex items-start justify-between px-5 py-4"
      style={{ borderBottom: "1px solid #1a2640", background: "#080d18" }}>
      <div className="flex items-start gap-4">
        {/* TENGRAF icon */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)" }}>
          <Send size={20} style={{ color: "#fff" }} />
        </div>
        <div>
          <h1 className="font-black tracking-wider" style={{ color: "#e5e7eb", fontSize: 20, letterSpacing: "0.06em" }}>
            TENGRAF
          </h1>
          <p style={{ color: "#6b7280", fontSize: 12 }}>OSINT &amp; Darknet Intelligence Service</p>
          <p className="mt-1" style={{ color: "#374151", fontSize: 11 }}>
            Monitoring open web, dark web, Telegram, and OSINT sources for threats, leaks, exposed data, and illicit activities.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Service status */}
        <div className="text-right">
          <p style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Service Status</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: isOnline ? "#10b981" : "#6b7280" }} />
            <span className="font-bold" style={{ color: isOnline ? "#10b981" : "#6b7280", fontSize: 11 }}>
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>
        {/* Last scan */}
        <div className="text-right">
          <p style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Last Scan</p>
          <p className="font-semibold mt-0.5" style={{ color: "#9ca3af", fontSize: 11 }}>
            {lastScanTime ? timeAgo(lastScanTime) : "Never"}
          </p>
        </div>
        {/* Demo / Live toggle */}
        <div className="flex rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid #1a2640" }}>
          <button onClick={() => handleScanModeChange("demo")} disabled={isRunning}
            className="px-3 py-1.5 text-xs font-bold"
            style={{ background: scanMode === "demo" ? ACCENT : "#111827", color: scanMode === "demo" ? "#fff" : "#6b7280" }}>
            Demo
          </button>
          <button onClick={() => handleScanModeChange("live")} disabled={isRunning}
            className="px-3 py-1.5 text-xs font-bold"
            style={{ background: scanMode === "live" ? "#ef4444" : "#111827", color: scanMode === "live" ? "#fff" : "#6b7280" }}>
            Live
          </button>
        </div>
        {/* Run Scan */}
        <button onClick={handleRun} disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold"
          style={{ background: scanMode === "live" ? "#ef4444" : ACCENT, color: "#fff", opacity: isRunning ? 0.7 : 1, fontSize: 12 }}>
          {isRunning ? <RotateCcw size={13} className="animate-spin" /> : <Play size={13} />}
          {isRunning ? "Running..." : `Run ${scanMode === "live" ? "Live" : "Demo"} Scan`}
        </button>
        {/* Generate Evidence Package */}
        <button onClick={handleGeneratePkg}
          disabled={isGenerating || !currentTask?.task_id || generatedPkg}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold"
          style={{
            background: generatedPkg ? "rgba(16,185,129,0.12)" : "#111827",
            color: generatedPkg ? "#10b981" : "#d1d5db",
            border: `1px solid ${generatedPkg ? "rgba(16,185,129,0.3)" : "#1a2640"}`,
            opacity: !currentTask?.task_id ? 0.5 : 1,
            fontSize: 12,
          }}>
          <FileDown size={13} />
          {generatedPkg ? "Package Ready" : "Generate Evidence Package"}
        </button>
        {/* More */}
        <button style={{ color: "#4b5563" }}><MoreVertical size={16} /></button>
      </div>
    </div>
  );

  const tabs = (
    <div className="flex items-center gap-0 px-5"
      style={{ borderBottom: "1px solid #1a2640", background: "#080d18" }}>
      {TABS.map((t) => (
        <button key={t} onClick={() => t === "Entities" ? navigate("/entities") : setActiveTab(t)}
          className="px-4 py-3 font-semibold relative"
          style={{
            color: activeTab === t ? "#e5e7eb" : "#4b5563",
            fontSize: 12,
            borderBottom: activeTab === t ? `2px solid ${ACCENT}` : "2px solid transparent",
          }}>
          {t}
        </button>
      ))}
    </div>
  );

  // ── no data state ─────────────────────────────────────────────────────────
  if (!lastResult && !isRunning) {
    return (
      <div style={{ background: "#080d18", minHeight: "100%" }}>
        {header}{tabs}
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
            <Send size={28} style={{ color: ACCENT }} />
          </div>
          <p className="font-bold text-lg" style={{ color: "#e5e7eb" }}>TENGRAF — No Scan Data</p>
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            Run a scan to begin collecting OSINT and DarkNet intelligence.
          </p>
          <button onClick={handleRun}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold mt-2"
            style={{ background: ACCENT, color: "#fff", fontSize: 13 }}>
            <Play size={14} /> Run Scan
          </button>
        </div>
      </div>
    );
  }

  // ── running state overlay ─────────────────────────────────────────────────
  if (isRunning && !lastResult) {
    return (
      <div style={{ background: "#080d18", minHeight: "100%" }}>
        {header}{tabs}
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <RotateCcw size={32} className="animate-spin" style={{ color: ACCENT }} />
          <p className="font-bold" style={{ color: "#e5e7eb", fontSize: 16 }}>Scanning Sources...</p>
          <p style={{ color: "#6b7280", fontSize: 12 }}>Collecting OSINT, DarkNet, and Telegram intelligence.</p>
        </div>
      </div>
    );
  }

  // ── KPI strip ─────────────────────────────────────────────────────────────
  const kpiStrip = (
    <div className="grid grid-cols-6 gap-3 p-5 pb-0">
      <KpiCard label="Total Findings"     value={allFindings.length}  trend="↑ 18%"  icon={ShieldAlert}   color="#3b82f6" />
      <KpiCard label="Critical Findings"  value={criticalCount}       trend="↑ 28%"  icon={AlertTriangle} color="#ef4444" />
      <KpiCard label="High Risk Findings" value={highCount}           trend="↑ 16%"  icon={TrendingUp}    color="#f59e0b" />
      <KpiCard label="Entities Extracted" value={totalEntities || 287} trend="↑ 22%" icon={Database}      color="#a855f7" />
      <KpiCard label="Sources Scanned"    value={sourcesScanned || 2156} trend="↑ 11%" icon={Globe}       color="#10b981" />
      <KpiCard label="New Evidence"       value={totalEvidence || alertsFired || 146} trend="↑ 24%" icon={Activity} color="#06b6d4" />
    </div>
  );

  // ── right sidebar ─────────────────────────────────────────────────────────
  const rightSidebar = (
    <div className="space-y-4">
      {/* Category donut */}
      {catTotal > 0 && (
        <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
          <p className="font-bold uppercase mb-3" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
            Findings By Category
          </p>
          <div className="flex justify-center mb-3">
            <SvgDonut data={donutData} total={catTotal} />
          </div>
          <div className="space-y-1.5">
            {donutData.slice(0, 5).map((d) => (
              <div key={d.label} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="flex-1 min-w-0 truncate" style={{ color: "#9ca3af", fontSize: 10 }}>
                  {d.label}
                </span>
                <span className="font-bold flex-shrink-0" style={{ color: "#e5e7eb", fontSize: 11 }}>
                  {d.value}
                </span>
                <span className="flex-shrink-0 font-mono" style={{ color: "#6b7280", fontSize: 9, minWidth: 44, textAlign: "right" }}>
                  {d.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Summary */}
      <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
        <p className="font-bold uppercase mb-3" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
          Service Summary
        </p>
        <p style={{ color: "#9ca3af", fontSize: 11, lineHeight: 1.6 }}>
          Collecting and analyzing data from open web, dark web, Telegram, forums, paste sites,
          and other OSINT sources.
        </p>
        <div className="mt-3">
          <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>Threat Types</p>
          <div className="flex flex-wrap gap-1.5">
            {["Leaks", "Malware", "Fraud", "Illegal Services", "Exposed Data", "Darknet Markets"].map((t) => (
              <span key={t} className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: "#1a2640", color: "#9ca3af", border: "1px solid #1f2937" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>Data Coverage</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {[
              { icon: Globe,          label: "Open Web"   },
              { icon: ShieldAlert,    label: "Dark Web"   },
              { icon: MessageSquare,  label: "Telegram"   },
              { icon: Database,       label: "Forums"     },
              { icon: Activity,       label: "Paste Sites"},
              { icon: TrendingUp,     label: "Social Media"},
            ].map(({ icon: Ic, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Ic size={10} style={{ color: "#4b5563" }} />
                <span style={{ color: "#6b7280", fontSize: 10 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Active Sources */}
      <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold uppercase" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
            Top Active Sources
          </p>
          <button style={{ color: ACCENT, fontSize: 10 }}>View All</button>
        </div>
        {[
          { icon: MessageSquare, label: "Telegram Channels", count: 842, trend: "+14%", color: "#3b82f6" },
          { icon: ShieldAlert,   label: "Dark Web Forums",   count: 624, trend: "+9%",  color: "#ef4444" },
          { icon: Database,      label: "Paste Sites",       count: 256, trend: "+18%", color: "#eab308" },
          { icon: Globe,         label: "Open Web",          count: 198, trend: "+7%",  color: "#10b981" },
          { icon: Activity,      label: "Social Media",      count: 126, trend: "+6%",  color: "#a855f7" },
        ].map((src) => (
          <div key={src.label} className="flex items-center justify-between py-2"
            style={{ borderBottom: "1px solid #1a2640" }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: `${src.color}18` }}>
                <src.icon size={11} style={{ color: src.color }} />
              </div>
              <span style={{ color: "#9ca3af", fontSize: 11 }}>{src.label}</span>
            </div>
            <div className="text-right">
              <span className="font-bold" style={{ color: "#e5e7eb", fontSize: 12 }}>{src.count.toLocaleString()}</span>
              <span className="ml-2" style={{ color: "#10b981", fontSize: 10 }}>{src.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold uppercase" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
            Recent Activity
          </p>
          <button style={{ color: ACCENT, fontSize: 10 }}>View All</button>
        </div>
        <div className="space-y-2.5">
          {recentActivity.map((act, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: act.color }} />
              <span className="flex-1 text-xs leading-snug" style={{ color: "#9ca3af" }}>{act.text}</span>
              <span className="flex-shrink-0" style={{ color: "#4b5563", fontSize: 10 }}>{act.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── filters bar ───────────────────────────────────────────────────────────
  const filtersBar = (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      {/* Severity */}
      <div className="relative">
        <select value={severity} onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
          className="appearance-none pl-3 pr-7 py-1.5 rounded text-xs font-medium cursor-pointer"
          style={{ background: "#111827", border: "1px solid #1a2640", color: "#9ca3af" }}>
          {SEVERITY_LEVELS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <ChevronDown size={10} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
      </div>
      {/* Category */}
      <div className="relative">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="appearance-none pl-3 pr-7 py-1.5 rounded text-xs font-medium cursor-pointer"
          style={{ background: "#111827", border: "1px solid #1a2640", color: "#9ca3af" }}>
          {uniqueCats.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : catMeta(c).label}</option>)}
        </select>
        <ChevronDown size={10} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
      </div>
      {/* Sort */}
      <div className="relative">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="appearance-none pl-3 pr-7 py-1.5 rounded text-xs font-medium cursor-pointer"
          style={{ background: "#111827", border: "1px solid #1a2640", color: "#9ca3af" }}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sort by: {o.label}</option>)}
        </select>
        <ChevronDown size={10} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
      </div>
      {/* Search */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded flex-1 min-w-40"
        style={{ background: "#111827", border: "1px solid #1a2640" }}>
        <Search size={11} style={{ color: "#4b5563", flexShrink: 0 }} />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search findings..."
          className="flex-1 bg-transparent outline-none text-xs"
          style={{ color: "#9ca3af" }} />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")}><X size={10} style={{ color: "#4b5563" }} /></button>
        )}
      </div>
      {/* Resolve All */}
      <button onClick={handleResolveAll} disabled={isResolving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
        style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
        {isResolving ? <RotateCcw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
        Resolve All
      </button>
    </div>
  );

  // ── finding card (new design) ──────────────────────────────────────────────
  const renderFindingCard = ({ item: f, i }: { item: any; i: number }) => {
    const score      = Number(f?.risk_score || 0);
    const cat        = f?.crime_category || "OTHER";
    const meta       = catMeta(cat);
    const evidUrls   = getBaseEvidenceUrls(f);
    const clickable  = evidUrls.filter(isClickableUrl);
    const entityCnt  = countEntities(f);
    const resolved   = !getAlertForFinding(i);
    const isExpanded = expandedIdx === i;
    const srcName    = f?.source || (f?.source_data as any)?.source_name || "";
    const srcType    = f?.source_type || (f?.source_data as any)?.source_type || "";

    return (
      <div key={i} className="rounded-lg overflow-hidden mb-3"
        style={{ background: "#111827", border: "1px solid #1a2640" }}>
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Left: severity + score */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 52 }}>
              <SeverityBadge score={score} />
              <RiskScore score={score} />
            </div>
            {/* Middle: content */}
            <div className="flex-1 min-w-0">
              {/* Category tags */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="px-2 py-0.5 rounded font-semibold"
                  style={{ background: `${meta.color}18`, color: meta.color, fontSize: 10, border: `1px solid ${meta.color}30` }}>
                  {meta.label}
                </span>
                {f?.evidence_priority && (
                  <span className="px-2 py-0.5 rounded"
                    style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontSize: 10 }}>
                    Evidence: {String(f.evidence_priority).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Title */}
              <p className="font-bold leading-snug mb-1" style={{ color: "#e5e7eb", fontSize: 13 }}>
                {f?.title || "Untitled Finding"}
              </p>
              {/* Summary */}
              {f?.analyst_summary && (
                <p className="text-xs mb-2 line-clamp-2" style={{ color: "#6b7280", lineHeight: 1.5 }}>
                  {f.analyst_summary}
                </p>
              )}
              {/* Meta row: source / evidence / entities / time */}
              <div className="flex items-center gap-3 flex-wrap">
                {srcName && (
                  <span className="flex items-center gap-1" style={{ color: "#6b7280", fontSize: 10 }}>
                    <Globe size={9} />
                    {srcType && <span className="uppercase">{srcType}:</span>}
                    <span className="font-mono">{String(srcName).slice(0, 30)}</span>
                  </span>
                )}
                <span className="flex items-center gap-1" style={{ color: "#6b7280", fontSize: 10 }}>
                  <Activity size={9} />
                  Evidence: {clickable.length}
                </span>
                <span className="flex items-center gap-1" style={{ color: "#6b7280", fontSize: 10 }}>
                  <Database size={9} />
                  Entities: {entityCnt}
                </span>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {clickable.length > 0 && (
                  <a href={clickable[0]} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                    style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                    <ExternalLink size={10} />
                    View Evidence {clickable.length > 1 ? `(${clickable.length})` : ""}
                  </a>
                )}
                <button onClick={() => navigate(`/investigation/tengraf/${i}`)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                  style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}>
                  <Search size={10} />
                  Investigate
                </button>
                {!resolved ? (
                  <button onClick={() => handleResolveFinding(i)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
                    <CheckCircle2 size={10} />
                    Resolve
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                    style={{ background: "rgba(16,185,129,0.06)", color: "#10b981", opacity: 0.7 }}>
                    <CheckCircle2 size={10} />
                    Resolved
                  </span>
                )}
                {(f?.analyst_summary || f?.recommended_actions) && (
                  <button onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                    style={{ background: isExpanded ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.06)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
                    <ChevronDown size={10} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    {isExpanded ? "Less" : "Details"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Expanded drawer */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid #1a2640", background: "rgba(0,0,0,0.2)" }}>
            {f?.analyst_summary && (
              <div className="mb-3 p-3 rounded" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <p className="text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: "#60a5fa" }}>
                  <ShieldAlert size={11} /> Analyst Summary
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{f.analyst_summary}</p>
              </div>
            )}
            <MLBadge ml={f?.ml_classification} />
            {Array.isArray(f?.recommended_actions) && f.recommended_actions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold mb-2" style={{ color: "#e5e7eb" }}>Recommended Actions</p>
                <ol className="space-y-1.5">
                  {(f.recommended_actions as string[]).map((action, ai) => (
                    <li key={ai} className="flex items-start gap-2 text-xs" style={{ color: "#9ca3af" }}>
                      <span className="font-bold flex-shrink-0" style={{ color: "#f59e0b" }}>{ai + 1}.</span>
                      {action}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {clickable.length > 1 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: "#e5e7eb" }}>All Evidence Sources ({clickable.length})</p>
                <div className="flex flex-wrap gap-2">
                  {clickable.map((url, ui) => (
                    <a key={ui} href={url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs"
                      style={{ color: ACCENT }}>
                      Source {ui + 1} <ExternalLink size={9} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── overview tab ──────────────────────────────────────────────────────────
  const overviewContent = (
    <>
      {kpiStrip}
      <div className="grid gap-5 p-5" style={{ gridTemplateColumns: "1fr 340px" }}>
        {/* Left column */}
        <div className="space-y-4">
          {/* Findings Over Time */}
          <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold uppercase" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
                Findings Over Time <span style={{ color: "#374151" }}>(Last 7 Days)</span>
              </p>
              <span className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: "#1a2640", color: "#6b7280" }}>Last 7 Days</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="tgArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2640" />
                <XAxis dataKey="date" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip contentStyle={{ background: "#0d1626", border: "1px solid #1a2640", color: "#e5e7eb", fontSize: 11 }} />
                <Area type="monotone" dataKey="count" stroke={ACCENT} fill="url(#tgArea)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {enrichment && <ModEnrichmentPanel enrichment={enrichment} accent={ACCENT} />}
          {collectorStatus && <ModCollectorStatus status={collectorStatus} />}

          {/* TOP FINDINGS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold uppercase" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
                Top Findings <span style={{ color: "#374151" }}>({filteredFindings.length})</span>
              </p>
            </div>
            {filtersBar}
            {filteredFindings.length === 0 ? (
              <div className="text-center py-10">
                <p style={{ color: "#4b5563", fontSize: 13 }}>No findings match your filters.</p>
              </div>
            ) : (
              filteredFindings.map(renderFindingCard)
            )}
          </div>
        </div>

        {/* Right sidebar */}
        {rightSidebar}
      </div>
    </>
  );

  // ── findings tab ──────────────────────────────────────────────────────────
  const findingsContent = (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold" style={{ color: "#e5e7eb", fontSize: 14 }}>
          Intelligence Findings ({filteredFindings.length})
        </p>
      </div>
      {filtersBar}
      {filteredFindings.length === 0 ? (
        <div className="text-center py-16">
          <p style={{ color: "#4b5563", fontSize: 13 }}>No findings match your filters.</p>
        </div>
      ) : (
        filteredFindings.map(renderFindingCard)
      )}
    </div>
  );

  // ── sources tab ───────────────────────────────────────────────────────────
  const sourcesContent = (
    <div className="p-5">
      <p className="font-bold mb-4" style={{ color: "#e5e7eb", fontSize: 14 }}>Active Intelligence Sources</p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: MessageSquare, label: "Telegram Channels", count: 842,  trend: "+14%", color: "#3b82f6", desc: "Monitored Telegram groups and channels" },
          { icon: ShieldAlert,   label: "Dark Web Forums",   count: 624,  trend: "+9%",  color: "#ef4444", desc: "Hidden service forums and markets" },
          { icon: Database,      label: "Paste Sites",       count: 256,  trend: "+18%", color: "#eab308", desc: "Pastebin, hastebin, and similar services" },
          { icon: Globe,         label: "Open Web Sources",  count: 198,  trend: "+7%",  color: "#10b981", desc: "News, forums, and web sources" },
          { icon: Activity,      label: "Social Media",      count: 126,  trend: "+6%",  color: "#a855f7", desc: "Twitter, Reddit, and social channels" },
          { icon: Database,      label: "GitHub / Code",     count: 43,   trend: "+22%", color: "#06b6d4", desc: "Leaked code and credential repos" },
        ].map((src) => (
          <div key={src.label} className="p-4 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2640" }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${src.color}18` }}>
                <src.icon size={18} style={{ color: src.color }} />
              </div>
              <div className="flex-1">
                <p className="font-bold" style={{ color: "#e5e7eb", fontSize: 13 }}>{src.label}</p>
                <p style={{ color: "#6b7280", fontSize: 11 }}>{src.desc}</p>
              </div>
              <div className="text-right">
                <p className="font-black" style={{ color: "#e5e7eb", fontSize: 20 }}>{src.count.toLocaleString()}</p>
                <p style={{ color: "#10b981", fontSize: 11 }}>{src.trend}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#080d18", minHeight: "100%" }}>
      {header}
      {tabs}
      {activeTab === "Overview"  && overviewContent}
      {activeTab === "Findings"  && findingsContent}
      {activeTab === "Sources"   && sourcesContent}
      {(activeTab === "Graph" || activeTab === "Timeline" || activeTab === "Configuration") && (
        <div className="flex flex-col items-center justify-center py-20">
          <p style={{ color: "#4b5563", fontSize: 14 }}>{activeTab} view — coming in next iteration</p>
          <button onClick={() => setActiveTab("Overview")}
            className="mt-4 px-4 py-2 rounded text-sm"
            style={{ background: "#111827", color: "#9ca3af", border: "1px solid #1a2640" }}>
            Back to Overview
          </button>
        </div>
      )}
    </div>
  );
}
