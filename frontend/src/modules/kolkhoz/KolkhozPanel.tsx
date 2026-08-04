/**
 * KOLKHOZ — Exchange Risk Intelligence
 * Service page following the ShadowGuard module template design.
 */
import { useState, useMemo, useEffect } from "react";
import { useModuleTask } from "@/hooks/useModuleTask";
import { useModulesStore, useAlertsStore } from "@/store";
import { alertsApi } from "@/api/alerts.api";
import { getBaseEvidenceUrls, formatCategory } from "@/utils/evidence";
import {
  Shield, TrendingDown, AlertTriangle, Activity, Globe, Database,
  DollarSign, BarChart2,
} from "lucide-react";
import {
  ModSvcHeader, ModTabBar, ModKpiCard, ModTrendChart, ModRightSidebar,
  ModFiltersBar, ModFindingEntry, ModEmptyState, ModLoadingState, ModEnrichmentPanel, ModCollectorStatus,
  genTrendData, timeAgo,
  type ModuleConfig, type SeverityFilter,
} from "@/components/shared/ModuleTemplate";
import TimelineChart from "@/components/charts/TimelineChart";
import SignalBreakdownChart from "@/components/charts/SignalBreakdownChart";

// ─── config ──────────────────────────────────────────────────────────────────

const ACCENT = "#ef4444";

const CFG: ModuleConfig = {
  moduleId: "kolkhoz",
  title: "KOLKHOZ",
  subtitle: "Exchange Risk Intelligence",
  description: "Pre-collapse shadow exchange signal engine — monitors exchange health, wallet flows, and complaint surge patterns.",
  accent: ACCENT,
  icon: Shield,
  threatTypes: ["Pre-Collapse Signals", "Wallet Outflows", "Complaint Surge", "Support Silence", "Domain Anomalies"],
  coverage: [
    { icon: Globe,     label: "Exchange Domains" },
    { icon: Database,  label: "Wallet Chains" },
    { icon: Activity,  label: "Telegram Channels" },
    { icon: BarChart2, label: "Complaint Forums" },
    { icon: Shield,    label: "RAKS Data Feed" },
    { icon: DollarSign, label: "Financial Flow" },
  ],
  sources: [
    { icon: Globe,      label: "Exchange Sites",    count: 342, trend: "+12%", color: ACCENT },
    { icon: Activity,   label: "Telegram Channels", count: 218, trend: "+8%",  color: "#f97316" },
    { icon: Database,   label: "Wallet Trackers",   count: 156, trend: "+19%", color: "#eab308" },
    { icon: BarChart2,  label: "Complaint Forums",  count: 89,  trend: "+5%",  color: "#a855f7" },
    { icon: Shield,     label: "RAKS Records",      count: 41,  trend: "+3%",  color: "#10b981" },
  ],
  tabs: ["Overview", "Findings", "Timeline", "Entities", "Configuration"],
};

const CAT_COLORS: Record<string, string> = {
  PRE_COLLAPSE_EXCHANGE: "#ef4444",
  HIGH_RISK_EXCHANGE:    "#f97316",
  WATCHLIST_EXCHANGE:    "#eab308",
  EXCHANGE_MONITORING:   "#10b981",
};

function catColor(k: string) { return CAT_COLORS[k] || "#6b7280"; }
function catLabel(k: string) { return formatCategory(k, "Exchange"); }

function getAnalystSummary(item: any): string {
  if (item?.analyst_summary) return String(item.analyst_summary);
  const name = item?.exchange_name || "This exchange";
  const risk = Number(item?.risk_score || 0);
  if (risk >= 70) return `${name} shows elevated pre-collapse indicators and should be reviewed by an analyst.`;
  if (risk >= 40) return `${name} shows early warning indicators but has not crossed the critical threshold.`;
  return `${name} currently shows low-risk behavior. No major pre-collapse pattern detected.`;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function KolkhozPanel() {
  const { run } = useModuleTask("kolkhoz");
  const { currentTask, lastResult, setLastResult } = useModulesStore();
  const isRunning = useModulesStore((s) => !!s.runningModules["kolkhoz"]);
  const [scanMode, setScanMode] = useState<"demo" | "live">(() => {
    try { return (localStorage.getItem("sm_kolkhoz") as "demo" | "live") || "demo"; } catch { return "demo"; }
  });
  const handleScanModeChange = (mode: "demo" | "live") => {
    setScanMode(mode); try { localStorage.setItem("sm_kolkhoz", mode); } catch {}
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
    const pending = localStorage.getItem("sg_autorun_kolkhoz");
    if (pending) { localStorage.removeItem("sg_autorun_kolkhoz"); try { run(JSON.parse(pending)); } catch {} }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = () => run({ demo_mode: scanMode === "demo" });

  const refreshAlerts = async () => {
    const fresh = await alertsApi.list({ dismissed: false, limit: 50 });
    setAlerts(Array.isArray(fresh) ? fresh : []);
  };

  const handleResolveAll = async () => {
    try {
      setIsResolving(true);
      await alertsApi.resolveModule("kolkhoz");
      await refreshAlerts();
      setLastResult("kolkhoz", null);
    } catch (err) { console.error(err); }
    finally { setIsResolving(false); }
  };

  const getAlertForFinding = (idx: number) =>
    alerts.find((a: any) => a.module_id === "kolkhoz" && !a.is_dismissed &&
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

  const trendData  = useMemo(() => genTrendData(allFindings.length || 40), [allFindings.length]);
  const uniqueCats = useMemo(() => ["All", ...Array.from(new Set(allFindings.map(({ item }) => item?.exchange_category).filter(Boolean)))], [allFindings]);

  const recentActivity = useMemo(() => {
    const mod = alerts.filter((a: any) => a.module_id === "kolkhoz").slice(0, 5)
      .map((a: any) => ({ color: a.severity === "critical" ? "#ef4444" : "#f59e0b", text: a.title || "Alert detected", time: a.created_at ? timeAgo(a.created_at) : "recently" }));
    if (mod.length === 0) return [
      { color: "#ef4444", text: "High-risk exchange collapse signal detected", time: "3m ago" },
      { color: "#10b981", text: "Exchange scan completed successfully", time: "3m ago" },
      { color: "#3b82f6", text: "Wallet flow anomaly traced", time: "8m ago" },
      { color: "#eab308", text: "Support channel silence confirmed", time: "22m ago" },
      { color: "#6b7280", text: "RAKS data feed synchronized", time: "1h ago" },
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
    if (categoryFilter !== "All") list = list.filter(({ item }) => item?.exchange_category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ item }) =>
        String(item?.exchange_name || "").toLowerCase().includes(q) ||
        String(item?.domain || "").toLowerCase().includes(q));
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

  const findingsList = (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold uppercase" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
          Exchange Findings <span style={{ color: "#374151" }}>({filteredFindings.length})</span>
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
        : filteredFindings.map(({ item, i }) => {
            const cat = item?.exchange_category || "EXCHANGE_MONITORING";
            const urls = getBaseEvidenceUrls(item);
            const subtitle = [
              `Collapse probability: ${Number(item?.collapse_probability || 0)}%`,
              item?.confidence ? `Confidence: ${item.confidence}` : null,
              item?.domain ? `Domain: ${item.domain}` : null,
              (item?.wallet_addresses || []).length > 0
                ? `${(item.wallet_addresses || []).length} wallets tracked` : null,
            ].filter(Boolean).join(" · ");
            const extraTags = [
              item?.health_status ? { label: item.health_status, color: "#eab308", bg: "rgba(234,179,8,0.1)" } : null,
              item?.evidence_priority ? { label: `Evidence: ${String(item.evidence_priority).toUpperCase()}`, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" } : null,
            ].filter(Boolean) as any[];
            return (
              <div key={i}>
                <ModFindingEntry
                  idx={i}
                  title={item?.exchange_name || "Unknown Exchange"}
                  categoryLabel={catLabel(cat)}
                  categoryColor={catColor(cat)}
                  riskScore={Number(item?.risk_score || 0)}
                  summaryLine={subtitle}
                  analystSummary={getAnalystSummary(item)}
                  mlClassification={item?.ml_classification}
                  redFlags={item?.risk_drivers}
                  recommendedActions={item?.recommended_actions}
                  evidenceUrls={urls}
                  investigateHref={`/investigation/kolkhoz/${i}`}
                  onResolve={() => handleResolveFinding(i)}
                  isResolved={!getAlertForFinding(i)}
                  extraTags={extraTags}
                />
                {item?.signals && item.signals.length > 0 && (
                  <div className="mb-3 rounded-lg p-3" style={{ background: "#111827", border: "1px solid #1a2640" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>Signal Breakdown — {item.exchange_name}</p>
                    <SignalBreakdownChart signals={item.signals} />
                  </div>
                )}
              </div>
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
            <ModKpiCard label="Exchanges Scanned"   value={Number(lastResult?.total_exchanges_scanned || 0)} trend="↑ 12%"  icon={Globe}        color={ACCENT} />
            <ModKpiCard label="High Risk Exchanges" value={Number(lastResult?.high_risk_exchanges || 0)}    trend="↑ 24%"  icon={TrendingDown}  color="#f97316" />
            <ModKpiCard label="Critical Signals"    value={criticalCount}                                   trend="↑ 18%"  icon={AlertTriangle} color="#eab308" />
            <ModKpiCard label="High Findings"       value={highCount}                                       trend="↑ 9%"   icon={Activity}      color="#a855f7" />
            <ModKpiCard label="Alerts Fired"        value={Number(lastResult?.alerts_fired || 0)}           trend="↑ 15%"  icon={Shield}        color="#10b981" />
            <ModKpiCard label="Mode"                value={String(lastResult?.mode || "live").toUpperCase()} icon={Database} color="#3b82f6" />
          </div>
          <div className="grid gap-5 p-5" style={{ gridTemplateColumns: "1fr 340px" }}>
            <div className="space-y-4">
              <ModTrendChart data={trendData} accent={ACCENT} label="Exchange Risk Over Time" />
              {enrichment && <ModEnrichmentPanel enrichment={enrichment} accent={ACCENT} />}
              {collectorStatus && <ModCollectorStatus status={collectorStatus} />}
              {rawResults.length > 1 && (
                <div className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
                  <p className="font-bold uppercase mb-3" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
                    Risk Score Timeline
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
            <p className="font-bold mb-4" style={{ color: "#e5e7eb", fontSize: 14 }}>Exchange Risk Score Timeline</p>
            <TimelineChart events={rawResults} height={320} />
          </div>
        </div>
      )}
      {(activeTab === "Entities" || activeTab === "Configuration") && (
        <div className="flex flex-col items-center justify-center py-20">
          <p style={{ color: "#4b5563", fontSize: 14 }}>{activeTab} view — select from sidebar</p>
          <button onClick={() => setActiveTab("Overview")} className="mt-4 px-4 py-2 rounded text-sm"
            style={{ background: "#111827", color: "#9ca3af", border: "1px solid #1a2640" }}>
            Back to Overview
          </button>
        </div>
      )}
    </div>
  );
}
