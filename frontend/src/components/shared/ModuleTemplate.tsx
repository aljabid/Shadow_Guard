/**
 * Shared visual building blocks for all ShadowGuard module pages.
 * All modules follow the TENGRAF template design.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play, RotateCcw, FileDown, MoreVertical, ChevronDown,
  ExternalLink, Search, CheckCircle2, ShieldAlert, X, FolderPlus,
} from "lucide-react";
import MLBadge from "@/components/shared/MLBadge";
import { reportsApi } from "@/api/reports.api";
import { investigationsApi } from "@/api/investigations.api";
import { getBaseEvidenceUrls, isClickableUrl } from "@/utils/evidence";
import { getRiskColor, getRiskLevel } from "@/styles/theme";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip,
} from "recharts";

// ─── types ───────────────────────────────────────────────────────────────────

export interface KpiCardDef {
  label: string;
  value: string | number;
  trend?: string;
  icon: React.ElementType;
  color: string;
}

export interface SourceDef {
  icon: React.ElementType;
  label: string;
  count: number;
  trend: string;
  color: string;
}

export interface CovDef { icon: React.ElementType; label: string }

export interface ModuleConfig {
  moduleId: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  icon: React.ElementType;
  threatTypes: string[];
  coverage: CovDef[];
  sources: SourceDef[];
  tabs: string[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

export function genTrendData(total: number): { date: string; count: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const progress = i / 6;
    const base = Math.round(total * (0.4 + progress * 0.6));
    const wave = Math.round(total * 0.08 * Math.sin(i * 1.7 + (total % 11) * 0.35));
    return { date: label, count: Math.max(0, base + wave) };
  });
}

export function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── SvcHeader ───────────────────────────────────────────────────────────────

interface SvcHeaderProps {
  cfg: ModuleConfig;
  isOnline: boolean;
  lastScanTime?: string | null;
  isRunning: boolean;
  taskId?: string | null;
  onRun: () => void;
  scanMode?: "demo" | "live";
  onScanModeChange?: (mode: "demo" | "live") => void;
}

export function ModSvcHeader({ cfg, isOnline, lastScanTime, isRunning, taskId, onRun, scanMode = "demo", onScanModeChange }: SvcHeaderProps) {
  const [generating, setGenerating] = useState(false);
  const [genDone, setGenDone] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!taskId) return;
    setGenerating(true);
    try {
      await reportsApi.generate({ module_id: cfg.moduleId, task_id: taskId });
      setGenDone(true);
    } catch { /* silent */ }
    finally { setGenerating(false); }
  };

  const handleSaveInvestigation = async () => {
    if (!saveTitle.trim()) return;
    setSaving(true);
    try {
      await investigationsApi.create({
        title: saveTitle.trim(),
        module_ids: [cfg.moduleId],
        risk_level: "high",
        linked_task_ids: taskId ? [taskId] : [],
        description: `Investigation from ${cfg.title} scan`,
      });
      setSaveSuccess(true);
      setShowSaveModal(false);
      setSaveTitle("");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const Icon = cfg.icon;
  return (
    <div style={{ borderBottom: "1px solid #1a2640", background: "#080d18", position: "relative" }}>
      {saveSuccess && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981" }}>
          <CheckCircle2 size={11} /> Investigation created
        </div>
      )}
      {showSaveModal && (
        <div className="absolute inset-0 z-20 flex items-center justify-center"
          style={{ background: "rgba(8,13,24,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-xl p-5 w-80" style={{ background: "#111827", border: "1px solid #1a2640" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: "#e5e7eb" }}>Save to Investigation</h3>
              <button onClick={() => setShowSaveModal(false)} style={{ color: "#6b7280" }}><X size={14} /></button>
            </div>
            <label className="block text-xs mb-1" style={{ color: "#6b7280" }}>Investigation Title</label>
            <input value={saveTitle} onChange={e => setSaveTitle(e.target.value)}
              placeholder={`${cfg.title} — ${new Date().toLocaleDateString()}`}
              className="w-full px-3 py-2 rounded text-sm mb-4"
              style={{ background: "#0d1626", border: "1px solid #1a2640", color: "#e5e7eb", outline: "none" }}
              onKeyDown={e => e.key === "Enter" && handleSaveInvestigation()} />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2 rounded text-xs"
                style={{ background: "transparent", border: "1px solid #1a2640", color: "#6b7280" }}>
                Cancel
              </button>
              <button onClick={handleSaveInvestigation} disabled={saving || !saveTitle.trim()}
                className="flex-1 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5"
                style={{ background: cfg.accent, color: "#fff", opacity: saving || !saveTitle.trim() ? 0.6 : 1 }}>
                {saving ? <RotateCcw size={11} className="animate-spin" /> : <FolderPlus size={11} />}
                {saving ? "Saving…" : "Create Case"}
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="flex items-start justify-between px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${cfg.accent}22`, border: `1px solid ${cfg.accent}40` }}>
          <Icon size={22} style={{ color: cfg.accent }} />
        </div>
        <div>
          <h1 className="font-black tracking-wider" style={{ color: "#e5e7eb", fontSize: 20, letterSpacing: "0.06em" }}>
            {cfg.title}
          </h1>
          <p style={{ color: "#6b7280", fontSize: 12 }}>{cfg.subtitle}</p>
          <p className="mt-1" style={{ color: "#374151", fontSize: 11 }}>{cfg.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <p style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Service Status</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: isOnline ? "#10b981" : "#6b7280" }} />
            <span className="font-bold" style={{ color: isOnline ? "#10b981" : "#6b7280", fontSize: 11 }}>
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Last Scan</p>
          <p className="font-semibold mt-0.5" style={{ color: "#9ca3af", fontSize: 11 }}>
            {lastScanTime ? timeAgo(lastScanTime) : "Never"}
          </p>
        </div>
        {/* Demo / Live toggle */}
        {onScanModeChange && (
          <div className="flex rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid #1a2640" }}>
            <button onClick={() => onScanModeChange("demo")} disabled={isRunning}
              className="px-3 py-1.5 text-xs font-bold tracking-wide flex items-center gap-1.5"
              style={{
                background: scanMode === "demo" ? cfg.accent : "#111827",
                color: scanMode === "demo" ? "#fff" : "#6b7280",
                transition: "all 0.15s",
              }}>
              Demo
            </button>
            <button onClick={() => onScanModeChange("live")} disabled={isRunning}
              className="px-3 py-1.5 text-xs font-bold tracking-wide flex items-center gap-1.5"
              style={{
                background: scanMode === "live" ? "#ef4444" : "#111827",
                color: scanMode === "live" ? "#fff" : "#6b7280",
                transition: "all 0.15s",
              }}>
              Live
            </button>
          </div>
        )}
        <button onClick={onRun} disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold"
          style={{ background: scanMode === "live" ? "#ef4444" : cfg.accent, color: "#fff", opacity: isRunning ? 0.7 : 1, fontSize: 12 }}>
          {isRunning ? <RotateCcw size={13} className="animate-spin" /> : <Play size={13} />}
          {isRunning ? "Running..." : `Run ${scanMode === "live" ? "Live" : "Demo"} Scan`}
        </button>
        <button onClick={handleGenerate} disabled={generating || !taskId || genDone}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold"
          style={{
            background: genDone ? "rgba(16,185,129,0.12)" : "#111827",
            color: genDone ? "#10b981" : "#d1d5db",
            border: `1px solid ${genDone ? "rgba(16,185,129,0.3)" : "#1a2640"}`,
            opacity: !taskId ? 0.5 : 1, fontSize: 12,
          }}>
          <FileDown size={13} />
          {genDone ? "Package Ready" : "Generate Evidence Package"}
        </button>
        <button onClick={() => { setSaveTitle(`${cfg.title} — ${new Date().toLocaleDateString()}`); setShowSaveModal(true); }}
          disabled={!taskId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold"
          style={{
            background: "#111827", color: "#d1d5db",
            border: "1px solid #1a2640",
            opacity: !taskId ? 0.5 : 1, fontSize: 12,
          }}>
          <FolderPlus size={13} />
          Save to Investigation
        </button>
        <button style={{ color: "#4b5563" }}><MoreVertical size={16} /></button>
      </div>
    </div>
    </div>
  );
}

// ─── TabBar ──────────────────────────────────────────────────────────────────

interface TabBarProps { tabs: string[]; active: string; accent: string; onSelect: (t: string) => void }
export function ModTabBar({ tabs, active, accent, onSelect }: TabBarProps) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-0 px-5"
      style={{ borderBottom: "1px solid #1a2640", background: "#080d18" }}>
      {tabs.map((t) => (
        <button key={t}
          onClick={() => t === "Entities" ? navigate("/entities") : onSelect(t)}
          className="px-4 py-3 font-semibold relative"
          style={{
            color: active === t ? "#e5e7eb" : "#4b5563", fontSize: 12,
            borderBottom: active === t ? `2px solid ${accent}` : "2px solid transparent",
          }}>
          {t}
        </button>
      ))}
    </div>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

export function ModKpiCard({ label, value, trend, icon: Icon, color }: KpiCardDef) {
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
        {trend && <p className="mt-1" style={{ color: "#10b981", fontSize: 10 }}>{trend} from last scan</p>}
      </div>
    </div>
  );
}

// ─── SvgDonut ────────────────────────────────────────────────────────────────

interface DonutSeg { label: string; value: number; color: string; pct: string }
interface DonutProps { data: DonutSeg[]; total: number }

export function ModSvgDonut({ data, total }: DonutProps) {
  const R = 44; const CX = 56; const CY = 56;
  let angle = -Math.PI / 2;
  const paths = data.map((seg) => {
    if (total === 0) return null;
    const sweep = (seg.value / total) * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle); const y1 = CY + R * Math.sin(angle);
    const x2 = CX + R * Math.cos(angle + sweep); const y2 = CY + R * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    angle += sweep;
    return <path key={seg.label} d={d} fill={seg.color} opacity={0.9} />;
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

// ─── TrendChart ──────────────────────────────────────────────────────────────

interface TrendChartProps { data: { date: string; count: number }[]; accent: string; label?: string }
export function ModTrendChart({ data, accent, label = "Findings Over Time" }: TrendChartProps) {
  return (
    <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold uppercase" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
          {label} <span style={{ color: "#374151" }}>(Last 7 Days)</span>
        </p>
        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#1a2640", color: "#6b7280" }}>
          Last 7 Days
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={`modArea_${accent.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accent} stopOpacity={0.25} />
              <stop offset="95%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2640" />
          <XAxis dataKey="date" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
          <ReTooltip contentStyle={{ background: "#0d1626", border: "1px solid #1a2640", color: "#e5e7eb", fontSize: 11 }} />
          <Area type="monotone" dataKey="count" stroke={accent}
            fill={`url(#modArea_${accent.replace("#", "")})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── RightSidebar ────────────────────────────────────────────────────────────

interface RightSidebarProps {
  cfg: ModuleConfig;
  donutData: DonutSeg[];
  donutTotal: number;
  recentActivity: { color: string; text: string; time: string }[];
}
export function ModRightSidebar({ cfg, donutData, donutTotal, recentActivity }: RightSidebarProps) {
  return (
    <div className="space-y-4">
      {donutTotal > 0 && (
        <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
          <p className="font-bold uppercase mb-3" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
            Findings By Category
          </p>
          {/* Donut centered */}
          <div className="flex justify-center mb-3">
            <ModSvgDonut data={donutData} total={donutTotal} />
          </div>
          {/* Legend — full width, no overflow */}
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
      <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
        <p className="font-bold uppercase mb-3" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
          Service Summary
        </p>
        <p style={{ color: "#9ca3af", fontSize: 11, lineHeight: 1.6 }}>{cfg.description}</p>
        <div className="mt-3">
          <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>Threat Types</p>
          <div className="flex flex-wrap gap-1.5">
            {cfg.threatTypes.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: "#1a2640", color: "#9ca3af", border: "1px solid #1f2937" }}>{t}</span>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>Data Coverage</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {cfg.coverage.map(({ icon: Ic, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Ic size={10} style={{ color: "#4b5563" }} />
                <span style={{ color: "#6b7280", fontSize: 10 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold uppercase" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
            Top Active Sources
          </p>
        </div>
        {cfg.sources.map((src) => (
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
      <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
        <p className="font-bold uppercase mb-3" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
          Recent Activity
        </p>
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
}

// ─── FiltersBar ──────────────────────────────────────────────────────────────

const SEVERITY_LEVELS = ["All", "Critical", "High", "Medium", "Low"] as const;
export type SeverityFilter = typeof SEVERITY_LEVELS[number];

interface FiltersBarProps {
  severity: SeverityFilter;
  onSeverity: (v: SeverityFilter) => void;
  categoryFilter: string;
  onCategory: (v: string) => void;
  categories: string[];
  catLabel: (k: string) => string;
  sortBy: string;
  onSort: (v: string) => void;
  search: string;
  onSearch: (v: string) => void;
  onResolveAll: () => void;
  isResolving: boolean;
}

export function ModFiltersBar({
  severity, onSeverity, categoryFilter, onCategory, categories, catLabel,
  sortBy, onSort, search, onSearch, onResolveAll, isResolving,
}: FiltersBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <div className="relative">
        <select value={severity} onChange={(e) => onSeverity(e.target.value as SeverityFilter)}
          className="appearance-none pl-3 pr-7 py-1.5 rounded text-xs font-medium cursor-pointer"
          style={{ background: "#111827", border: "1px solid #1a2640", color: "#9ca3af" }}>
          {SEVERITY_LEVELS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <ChevronDown size={10} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
      </div>
      <div className="relative">
        <select value={categoryFilter} onChange={(e) => onCategory(e.target.value)}
          className="appearance-none pl-3 pr-7 py-1.5 rounded text-xs font-medium cursor-pointer"
          style={{ background: "#111827", border: "1px solid #1a2640", color: "#9ca3af" }}>
          {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : catLabel(c)}</option>)}
        </select>
        <ChevronDown size={10} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
      </div>
      <div className="relative">
        <select value={sortBy} onChange={(e) => onSort(e.target.value)}
          className="appearance-none pl-3 pr-7 py-1.5 rounded text-xs font-medium cursor-pointer"
          style={{ background: "#111827", border: "1px solid #1a2640", color: "#9ca3af" }}>
          <option value="risk_desc">Sort by: Risk Score</option>
          <option value="newest">Sort by: Newest</option>
          <option value="evidence">Sort by: Most Evidence</option>
        </select>
        <ChevronDown size={10} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded flex-1 min-w-40"
        style={{ background: "#111827", border: "1px solid #1a2640" }}>
        <Search size={11} style={{ color: "#4b5563", flexShrink: 0 }} />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search findings..."
          className="flex-1 bg-transparent outline-none text-xs" style={{ color: "#9ca3af" }} />
        {search && <button onClick={() => onSearch("")}><X size={10} style={{ color: "#4b5563" }} /></button>}
      </div>
      <button onClick={onResolveAll} disabled={isResolving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
        style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
        {isResolving ? <RotateCcw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
        Resolve All
      </button>
    </div>
  );
}

// ─── FindingEntry (new card design) ──────────────────────────────────────────

export interface FindingEntryProps {
  idx: number;
  title: string;
  categoryLabel: string;
  categoryColor: string;
  riskScore: number;
  summaryLine: string;
  analystSummary?: string;
  recommendedActions?: string[];
  redFlags?: string[];
  evidenceUrls?: string[];
  investigateHref: string;
  onResolve?: () => void;
  isResolved?: boolean;
  extraTags?: { label: string; color: string; bg: string }[];
  extraMeta?: string;
  mlClassification?: any;
}

export function ModFindingEntry({
  title, categoryLabel, categoryColor, riskScore, summaryLine, analystSummary,
  recommendedActions, redFlags, evidenceUrls = [], investigateHref, onResolve, isResolved,
  extraTags = [], extraMeta, mlClassification,
}: FindingEntryProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const color = getRiskColor(riskScore);
  const level = getRiskLevel(riskScore).toUpperCase();
  const clickable = evidenceUrls.filter(isClickableUrl);
  const hasDetails = !!(analystSummary || (recommendedActions && recommendedActions.length) || (redFlags && redFlags.length));

  return (
    <div className="rounded-lg overflow-hidden mb-3" style={{ background: "#111827", border: "1px solid #1a2640" }}>
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Severity + score */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 52 }}>
            <span className="inline-block px-2 py-0.5 rounded font-bold uppercase"
              style={{ background: `${color}22`, color, fontSize: 10, letterSpacing: "0.06em" }}>
              {level}
            </span>
            <div className="text-right">
              <span className="font-black" style={{ color, fontSize: 22, lineHeight: 1 }}>{riskScore}</span>
              <span style={{ color: "#6b7280", fontSize: 10 }}>/100</span>
              <div style={{ color: "#6b7280", fontSize: 9, textTransform: "uppercase" }}>{getRiskLevel(riskScore)}</div>
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className="px-2 py-0.5 rounded font-semibold"
                style={{ background: `${categoryColor}18`, color: categoryColor, fontSize: 10, border: `1px solid ${categoryColor}30` }}>
                {categoryLabel}
              </span>
              {extraTags.map((t, i) => (
                <span key={i} className="px-2 py-0.5 rounded"
                  style={{ background: t.bg, color: t.color, fontSize: 10 }}>
                  {t.label}
                </span>
              ))}
            </div>
            <p className="font-bold leading-snug mb-1" style={{ color: "#e5e7eb", fontSize: 13 }}>{title}</p>
            {summaryLine && (
              <p className="text-xs mb-2" style={{ color: "#6b7280", lineHeight: 1.5 }}>{summaryLine}</p>
            )}
            {extraMeta && (
              <p className="text-xs mb-2" style={{ color: "#4b5563", fontSize: 10 }}>{extraMeta}</p>
            )}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {clickable.length > 0 && (
                <a href={clickable[0]} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <ExternalLink size={10} />
                  View Evidence {clickable.length > 1 ? `(${clickable.length})` : ""}
                </a>
              )}
              <button onClick={() => navigate(investigateHref)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}>
                <Search size={10} />
                Investigate
              </button>
              {onResolve && !isResolved ? (
                <button onClick={onResolve}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <CheckCircle2 size={10} /> Resolve
                </button>
              ) : isResolved ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs"
                  style={{ color: "#10b981", opacity: 0.7 }}>
                  <CheckCircle2 size={10} /> Resolved
                </span>
              ) : null}
              {hasDetails && (
                <button onClick={() => setExpanded((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                  style={{ background: expanded ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.06)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
                  <ChevronDown size={10} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  {expanded ? "Less" : "Details"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid #1a2640", background: "rgba(0,0,0,0.2)" }}>
          {analystSummary && (
            <div className="mb-3 p-3 rounded" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: "#60a5fa" }}>
                <ShieldAlert size={11} /> Analyst Summary
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{analystSummary}</p>
            </div>
          )}
          <MLBadge ml={mlClassification} />
          {redFlags && redFlags.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold mb-2" style={{ color: "#e5e7eb" }}>Red Flags</p>
              <ul className="space-y-1">
                {redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#9ca3af" }}>
                    <span className="font-bold flex-shrink-0" style={{ color: "#ef4444" }}>›</span>{flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recommendedActions && recommendedActions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold mb-2" style={{ color: "#e5e7eb" }}>Recommended Actions</p>
              <ol className="space-y-1.5">
                {recommendedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#9ca3af" }}>
                    <span className="font-bold flex-shrink-0" style={{ color: "#f59e0b" }}>{i + 1}.</span>{action}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {clickable.length > 1 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "#e5e7eb" }}>All Evidence ({clickable.length})</p>
              <div className="flex flex-wrap gap-2">
                {clickable.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs" style={{ color: "#60a5fa" }}>
                    Source {i + 1} <ExternalLink size={9} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EmptyState / LoadingState ────────────────────────────────────────────────

interface EmptyProps { cfg: ModuleConfig; onRun: () => void }
export function ModEmptyState({ cfg, onRun }: EmptyProps) {
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: `${cfg.accent}18`, border: `1px solid ${cfg.accent}30` }}>
        <Icon size={28} style={{ color: cfg.accent }} />
      </div>
      <p className="font-bold text-lg" style={{ color: "#e5e7eb" }}>{cfg.title} — No Scan Data</p>
      <p style={{ color: "#6b7280", fontSize: 13 }}>Run a scan to begin collecting intelligence.</p>
      <button onClick={onRun}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold mt-2"
        style={{ background: cfg.accent, color: "#fff", fontSize: 13 }}>
        <Play size={14} /> Run Scan
      </button>
    </div>
  );
}

export function ModLoadingState({ cfg }: { cfg: ModuleConfig }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <RotateCcw size={32} className="animate-spin" style={{ color: cfg.accent }} />
      <p className="font-bold" style={{ color: "#e5e7eb", fontSize: 16 }}>Scanning Sources...</p>
    </div>
  );
}

// ─── EnrichmentPanel ─────────────────────────────────────────────────────────

interface EnrichmentData {
  phones?: { phone: string; operator: string; region: string; risk_score: number; risk_drivers?: string[] }[];
  domains?: { domain: string; ip?: string; age_days?: number; privacy_hidden?: boolean; tld?: string; risk_score: number; risk_drivers?: string[] }[];
  wallets?: { address: string; chain: string; inflow_usdt?: number; outflow_usdt?: number; tx_count_30d?: number; risk_score: number }[];
  entity_counts?: { phones: number; domains: number; wallets: number };
}

export function ModEnrichmentPanel({ enrichment, accent }: { enrichment: EnrichmentData; accent: string }) {
  const { phones = [], domains = [], wallets = [] } = enrichment;
  if (!phones.length && !domains.length && !wallets.length) return null;

  const riskBg = (s: number) => s >= 85 ? "rgba(239,68,68,0.12)" : s >= 65 ? "rgba(249,115,22,0.12)" : s >= 40 ? "rgba(234,179,8,0.12)" : "rgba(107,114,128,0.12)";
  const riskClr = (s: number) => s >= 85 ? "#ef4444" : s >= 65 ? "#f97316" : s >= 40 ? "#eab308" : "#6b7280";

  return (
    <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
      <p className="font-bold uppercase mb-3" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
        Live Enrichment — Entity Intelligence
      </p>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>

        {phones.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: accent }}>Phone Intelligence ({phones.length})</p>
            <div className="space-y-1.5">
              {phones.map((p, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded" style={{ background: "#0d1420" }}>
                  <span className="text-xs font-mono" style={{ color: "#e5e7eb" }}>{p.phone}</span>
                  <span className="ml-auto text-xs px-1.5 rounded" style={{ background: riskBg(p.risk_score), color: riskClr(p.risk_score) }}>
                    {p.risk_score}
                  </span>
                  <div className="text-xs" style={{ color: "#4b5563", minWidth: 0 }}>
                    <div>{p.operator} · {p.region}</div>
                    {p.risk_drivers?.[0] && <div className="truncate" title={p.risk_drivers[0]}>{p.risk_drivers[0]}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {domains.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: accent }}>Domain Intelligence ({domains.length})</p>
            <div className="space-y-1.5">
              {domains.map((d, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded" style={{ background: "#0d1420" }}>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-mono block truncate" style={{ color: "#e5e7eb" }}>{d.domain}</span>
                    <span className="text-xs" style={{ color: "#4b5563" }}>
                      {d.ip ? `${d.ip} · ` : ""}
                      {d.age_days != null ? `${d.age_days}d old` : ""}
                      {d.privacy_hidden ? " · privacy proxy" : ""}
                    </span>
                  </div>
                  <span className="text-xs px-1.5 rounded flex-shrink-0" style={{ background: riskBg(d.risk_score), color: riskClr(d.risk_score) }}>
                    {d.risk_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {wallets.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: accent }}>Wallet Intelligence ({wallets.length})</p>
            <div className="space-y-1.5">
              {wallets.map((w, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded" style={{ background: "#0d1420" }}>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-mono block" style={{ color: "#e5e7eb" }}>{w.address.slice(0, 12)}…</span>
                    <span className="text-xs" style={{ color: "#4b5563" }}>
                      {w.chain} · In: ${(w.inflow_usdt || 0).toLocaleString()} · Out: ${(w.outflow_usdt || 0).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs px-1.5 rounded flex-shrink-0" style={{ background: riskBg(w.risk_score), color: riskClr(w.risk_score) }}>
                    {w.risk_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CollectorStatus ─────────────────────────────────────────────────────────

interface CollectorState {
  enabled: boolean;
  ready: boolean;
  scanned: boolean;
  raw_count: number;
  error: string | null;
}

export interface CollectorStatusMap {
  telegram?: CollectorState;
  open_web?: CollectorState;
  darknet?: CollectorState;
  crypto?: CollectorState;
  domain?: CollectorState;
}

const COLLECTOR_META: Record<string, { label: string }> = {
  telegram: { label: "Telegram" },
  open_web: { label: "Open Web" },
  darknet:  { label: "DarkNet" },
  crypto:   { label: "Blockchain" },
  domain:   { label: "Domain" },
};

export function ModCollectorStatus({ status }: { status: CollectorStatusMap }) {
  const entries = Object.entries(COLLECTOR_META)
    .map(([key, meta]) => ({ key, meta, state: status[key as keyof CollectorStatusMap] }))
    .filter(({ state }) => state?.enabled);

  if (!entries.length) return null;

  return (
    <div className="rounded-lg p-4" style={{ background: "#0d1420", border: "1px solid #1a2640" }}>
      <p className="font-bold uppercase mb-3" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
        Live Collector Status
      </p>
      <div className="flex flex-wrap gap-2">
        {entries.map(({ key, meta, state }) => {
          if (!state) return null;
          const { ready, scanned, raw_count, error } = state;

          let dotColor = "#374151";
          let statusLabel = "Not configured";
          if (error && !ready)            { dotColor = "#ef4444"; statusLabel = "Auth error"; }
          else if (error && ready)        { dotColor = "#f97316"; statusLabel = `${raw_count} items + errors`; }
          else if (scanned && raw_count > 0) { dotColor = "#22c55e"; statusLabel = `${raw_count} collected`; }
          else if (ready && scanned)      { dotColor = "#eab308"; statusLabel = "No matches"; }
          else if (ready)                 { dotColor = "#3b82f6"; statusLabel = "Ready"; }

          return (
            <div
              key={key}
              className="relative group flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: "#111827", border: `1px solid ${dotColor}30` }}
              title={error || statusLabel}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: dotColor, boxShadow: raw_count > 0 ? `0 0 6px ${dotColor}88` : "none" }}
              />
              <span className="text-xs font-semibold" style={{ color: "#9ca3af" }}>{meta.label}</span>
              <span className="text-xs" style={{ color: dotColor }}>{statusLabel}</span>
              {error && (
                <div
                  className="pointer-events-none absolute bottom-full left-0 mb-1 z-30 p-2 rounded text-xs hidden group-hover:block"
                  style={{ background: "#1f2937", border: "1px solid #374151", color: "#f87171",
                           maxWidth: 340, whiteSpace: "pre-wrap", minWidth: 200 }}
                >
                  {error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
