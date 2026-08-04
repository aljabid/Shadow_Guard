/**
 * PIRAMIDA — Pyramid & Scam Detection
 * Service page following the ShadowGuard module template design.
 */
import { useState, useMemo, useEffect } from "react";
import { useModuleTask } from "@/hooks/useModuleTask";
import { useModulesStore, useAlertsStore } from "@/store";
import { alertsApi } from "@/api/alerts.api";
import { getBaseEvidenceUrls, formatCategory } from "@/utils/evidence";
import {
  TrendingUp, AlertTriangle, Users, DollarSign, Globe, Activity,
  Database, Shield,
} from "lucide-react";
import {
  ModSvcHeader, ModTabBar, ModKpiCard, ModTrendChart, ModRightSidebar,
  ModFiltersBar, ModFindingEntry, ModEmptyState, ModLoadingState, ModEnrichmentPanel, ModCollectorStatus,
  genTrendData, timeAgo,
  type ModuleConfig, type SeverityFilter,
} from "@/components/shared/ModuleTemplate";
import TimelineChart from "@/components/charts/TimelineChart";

// ─── config ──────────────────────────────────────────────────────────────────

const ACCENT = "#eab308";

const CFG: ModuleConfig = {
  moduleId: "piramida",
  title: "PIRAMIDA",
  subtitle: "Pyramid & Scam Detection",
  description: "Financial pyramid early warning system — monitors investment schemes, referral fraud, and unregistered financial services.",
  accent: ACCENT,
  icon: TrendingUp,
  threatTypes: ["Pyramid Schemes", "High Yield Investment", "Unregistered Services", "Referral Fraud", "Guaranteed Returns"],
  coverage: [
    { icon: Globe,     label: "Telegram Channels" },
    { icon: Database,  label: "Web Sources" },
    { icon: Activity,  label: "Registration DBs" },
    { icon: Users,     label: "Victim Analysis" },
    { icon: DollarSign, label: "Financial Flows" },
    { icon: Shield,    label: "AFM Registry" },
  ],
  sources: [
    { icon: Globe,      label: "Telegram Channels", count: 892,  trend: "+16%", color: ACCENT },
    { icon: Database,   label: "Web Platforms",     count: 341,  trend: "+9%",  color: "#f97316" },
    { icon: Activity,   label: "Social Media",      count: 218,  trend: "+22%", color: "#ef4444" },
    { icon: Shield,     label: "AFM Registry",      count: 1240, trend: "+4%",  color: "#10b981" },
    { icon: DollarSign, label: "Payment Trackers",  count: 67,   trend: "+11%", color: "#a855f7" },
  ],
  tabs: ["Overview", "Findings", "Timeline", "Entities", "Configuration"],
};

const CAT_COLORS: Record<string, string> = {
  EXTREME_RETURN_PYRAMID:          "#ef4444",
  HIGH_YIELD_INVESTMENT_SCHEME:    "#f97316",
  UNREGISTERED_INVESTMENT_SCHEME:  "#eab308",
  REFERRAL_RECRUITMENT_SCHEME:     "#a855f7",
  GUARANTEED_PROFIT_SCHEME:        "#22c55e",
};

function catColor(k: string) { return CAT_COLORS[k] || "#6b7280"; }
function catLabel(k: string) { return formatCategory(k, "Investment Scheme"); }

// ─── component ───────────────────────────────────────────────────────────────

export default function PiramidaPanel() {
  const { run } = useModuleTask("piramida");
  const { currentTask, lastResult, setLastResult } = useModulesStore();
  const isRunning = useModulesStore((s) => !!s.runningModules["piramida"]);
  const [scanMode, setScanMode] = useState<"demo" | "live">(() => {
    try { return (localStorage.getItem("sm_piramida") as "demo" | "live") || "demo"; } catch { return "demo"; }
  });
  const handleScanModeChange = (mode: "demo" | "live") => {
    setScanMode(mode); try { localStorage.setItem("sm_piramida", mode); } catch {}
  };
  const [activeTab, setActiveTab] = useState("Overview");
  const [isResolving, setIsResolving] = useState(false);
  const [severity, setSeverity] = useState<SeverityFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("risk_desc");
  const [search, setSearch] = useState("");

  const alerts = useAlertsStore((s) => s.alerts);
  const setAlerts = useAlertsStore((s) => s.setAlerts);


  useEffect(() => {
    const pending = localStorage.getItem("sg_autorun_piramida");
    if (pending) { localStorage.removeItem("sg_autorun_piramida"); try { run(JSON.parse(pending)); } catch {} }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = () => run({ demo_mode: scanMode === "demo", max_channels: 20 });

  const refreshAlerts = async () => {
    const fresh = await alertsApi.list({ dismissed: false, limit: 50 });
    setAlerts(Array.isArray(fresh) ? fresh : []);
  };

  const handleResolveAll = async () => {
    try {
      setIsResolving(true);
      await alertsApi.resolveModule("piramida");
      await refreshAlerts();
      setLastResult("piramida", null);
    } catch (err) { console.error(err); }
    finally { setIsResolving(false); }
  };

  const getAlertForFinding = (idx: number) =>
    alerts.find((a: any) => a.module_id === "piramida" && !a.is_dismissed &&
      Number((a.metadata || {}).finding_index) === idx);

  const handleResolveFinding = async (idx: number) => {
    const alert = getAlertForFinding(idx);
    if (!alert) return;
    try { await alertsApi.resolve(alert.id); await refreshAlerts(); }
    catch (err) { console.error(err); }
  };

  const rawResults: any[] = (lastResult?.results as any[]) || [];
  const categoryCounts = (lastResult?.category_counts as Record<string, number>) || {};
  const enrichment = (lastResult?.enrichment as any) || null;
  const collectorStatus = (lastResult?.collector_status as any) || null;

  const allFindings = rawResults.map((item, i) => ({ item, i }));

  const criticalCount = allFindings.filter(({ item }) => Number(item?.risk_score || 0) >= 85).length;
  const highCount     = allFindings.filter(({ item }) => Number(item?.risk_score || 0) >= 65).length;

  const catEntries = Object.entries(categoryCounts).filter(([, v]) => v > 0);
  const catTotal   = catEntries.reduce((s, [, v]) => s + v, 0) || allFindings.length;
  const donutData  = catEntries.map(([k, v]) => ({
    label: catLabel(k), value: v, color: catColor(k),
    pct: catTotal > 0 ? ((v / catTotal) * 100).toFixed(1) : "0.0",
  })).sort((a, b) => b.value - a.value);

  const trendData  = useMemo(() => genTrendData(allFindings.length || 35), [allFindings.length]);
  const uniqueCats = useMemo(() => ["All", ...Array.from(new Set(allFindings.map(({ item }) => item?.scheme_category).filter(Boolean)))], [allFindings]);

  const recentActivity = useMemo(() => {
    const mod = alerts.filter((a: any) => a.module_id === "piramida").slice(0, 5)
      .map((a: any) => ({ color: ACCENT, text: a.title || "Alert detected", time: a.created_at ? timeAgo(a.created_at) : "recently" }));
    if (mod.length === 0) return [
      { color: "#ef4444", text: "High-risk pyramid scheme flagged", time: "5m ago" },
      { color: "#10b981", text: "Scan completed successfully", time: "5m ago" },
      { color: "#3b82f6", text: "1,400 victim accounts estimated", time: "12m ago" },
      { color: ACCENT,    text: "Amir Capital pattern matched", time: "30m ago" },
      { color: "#6b7280", text: "AFM registry synchronized", time: "2h ago" },
    ];
    return mod;
  }, [alerts]);

  const filteredFindings = useMemo(() => {
    let list = allFindings.slice();
    if (severity !== "All") {
      const thr: Record<SeverityFilter, [number, number]> = {
        All: [0, 100], Critical: [85, 100], High: [65, 84], Medium: [40, 64], Low: [0, 39],
      };
      const [lo, hi] = thr[severity];
      list = list.filter(({ item }) => { const s = Number(item?.risk_score || 0); return s >= lo && s <= hi; });
    }
    if (categoryFilter !== "All") list = list.filter(({ item }) => item?.scheme_category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ item }) =>
        String(item?.scheme_name || item?.channel || item?.title || "").toLowerCase().includes(q));
    }
    if (sortBy === "risk_desc") list.sort((a, b) => Number(b.item?.risk_score || 0) - Number(a.item?.risk_score || 0));
    return list;
  }, [allFindings, severity, categoryFilter, search, sortBy]);

  const isOnline = !!lastResult || isRunning;
  const lastScanTime = currentTask?.completed_at || currentTask?.created_at;

  const header = (
    <ModSvcHeader cfg={CFG} isOnline={isOnline} lastScanTime={lastScanTime}
      isRunning={isRunning} taskId={currentTask?.task_id} onRun={handleRun}
      scanMode={scanMode} onScanModeChange={handleScanModeChange} />
  );
  const tabBar = <ModTabBar tabs={CFG.tabs} active={activeTab} accent={ACCENT} onSelect={setActiveTab} />;

  if (!lastResult && !isRunning) return (
    <div style={{ background: "#080d18", minHeight: "100%" }}>
      {header}{tabBar}<ModEmptyState cfg={CFG} onRun={handleRun} />
    </div>
  );
  if (isRunning && !lastResult) return (
    <div style={{ background: "#080d18", minHeight: "100%" }}>
      {header}{tabBar}<ModLoadingState cfg={CFG} />
    </div>
  );

  const totalVictims = Number(lastResult?.total_estimated_victims || 0);
  const totalFunds   = Number(lastResult?.total_funds_at_risk_kzt || 0);

  const findingsList = (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold uppercase" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
          Scheme Findings <span style={{ color: "#374151" }}>({filteredFindings.length})</span>
        </p>
      </div>
      <ModFiltersBar severity={severity} onSeverity={setSeverity}
        categoryFilter={categoryFilter} onCategory={setCategoryFilter}
        categories={uniqueCats} catLabel={catLabel}
        sortBy={sortBy} onSort={setSortBy}
        search={search} onSearch={setSearch}
        onResolveAll={handleResolveAll} isResolving={isResolving} />
      {filteredFindings.length === 0
        ? <p className="text-center py-10" style={{ color: "#4b5563", fontSize: 13 }}>No findings match your filters.</p>
        : filteredFindings.slice(0, 8).map(({ item: r, i }) => {
            const cat = r.scheme_category || "SUSPICIOUS_INVESTMENT_CONTENT";
            const urls = getBaseEvidenceUrls(r);
            const subtitle = [
              r.promised_return_max ? `${r.promised_return_max}%/month promised return` : null,
              `${Number(r.estimated_victims || 0).toLocaleString()} est. victims`,
              `${(Number(r.estimated_funds_at_risk_kzt || 0) / 1_000_000).toFixed(1)}M KZT at risk`,
            ].filter(Boolean).join(" · ");
            const extraTags = [
              !r.is_registered ? { label: "NOT REGISTERED", color: "#f87171", bg: "rgba(239,68,68,0.12)" } : null,
              r.evidence_priority ? { label: `Evidence: ${String(r.evidence_priority).toUpperCase()}`, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" } : null,
            ].filter(Boolean) as any[];
            return (
              <ModFindingEntry key={i} idx={i}
                title={r.scheme_name || r.channel || r.title || "Unknown Scheme"}
                categoryLabel={catLabel(cat)} categoryColor={catColor(cat)}
                riskScore={Number(r.risk_score || 0)} summaryLine={subtitle}
                analystSummary={r.analyst_summary} redFlags={r.red_flags}
                recommendedActions={r.recommended_actions}
                evidenceUrls={urls} investigateHref={`/investigation/piramida/${i}`}
                onResolve={() => handleResolveFinding(i)} isResolved={!getAlertForFinding(i)}
                extraTags={extraTags} mlClassification={r.ml_classification} />
            );
          })}
    </>
  );

  return (
    <div style={{ background: "#080d18", minHeight: "100%" }}>
      {header}
      {tabBar}

      {activeTab === "Overview" && (
        <>
          <div className="grid grid-cols-6 gap-3 p-5 pb-0">
            <ModKpiCard label="Schemes Detected"  value={Number(lastResult?.schemes_detected || 0)}          trend="↑ 16%"  icon={TrendingUp}    color={ACCENT} />
            <ModKpiCard label="Critical Schemes"  value={criticalCount}                                       trend="↑ 28%"  icon={AlertTriangle} color="#ef4444" />
            <ModKpiCard label="High Risk"         value={highCount}                                           trend="↑ 12%"  icon={Activity}      color="#f97316" />
            <ModKpiCard label="Est. Victims"      value={totalVictims.toLocaleString()}                       trend="↑ 22%"  icon={Users}         color="#a855f7" />
            <ModKpiCard label="KZT at Risk"       value={`${(totalFunds / 1_000_000).toFixed(1)}M`}          trend="↑ 19%"  icon={DollarSign}    color="#10b981" />
            <ModKpiCard label="Alerts Fired"      value={Number(lastResult?.alerts_fired || 0)}               trend="↑ 8%"   icon={Shield}        color="#3b82f6" />
          </div>
          <div className="grid gap-5 p-5" style={{ gridTemplateColumns: "1fr 340px" }}>
            <div className="space-y-4">
              <ModTrendChart data={trendData} accent={ACCENT} label="Scheme Detection Over Time" />
              {enrichment && <ModEnrichmentPanel enrichment={enrichment} accent={ACCENT} />}
              {collectorStatus && <ModCollectorStatus status={collectorStatus} />}
              {lastResult?.mode === "playback" && rawResults.length > 1 && (
                <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
                  <p className="font-bold uppercase mb-3" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
                    Amir Capital Risk Timeline
                  </p>
                  <TimelineChart events={rawResults} height={180} />
                </div>
              )}
              {findingsList}
            </div>
            <ModRightSidebar cfg={CFG} donutData={donutData} donutTotal={catTotal} recentActivity={recentActivity} />
          </div>
        </>
      )}
      {activeTab === "Findings" && <div className="p-5">{findingsList}</div>}
      {activeTab === "Timeline" && rawResults.length > 0 && (
        <div className="p-5">
          <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
            <p className="font-bold mb-4" style={{ color: "#e5e7eb", fontSize: 14 }}>Scheme Risk Score Timeline</p>
            <TimelineChart events={rawResults} height={320} />
          </div>
        </div>
      )}
      {(activeTab === "Entities" || activeTab === "Configuration") && (
        <div className="flex flex-col items-center justify-center py-20">
          <p style={{ color: "#4b5563", fontSize: 14 }}>{activeTab} view — select from sidebar</p>
          <button onClick={() => setActiveTab("Overview")} className="mt-4 px-4 py-2 rounded text-sm"
            style={{ background: "#111827", color: "#9ca3af", border: "1px solid #1a2640" }}>Back to Overview</button>
        </div>
      )}
    </div>
  );
}
