/**
 * SHADOWBET — Illegal Gambling Intelligence
 * Service page following the ShadowGuard module template design.
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useModuleTask } from "@/hooks/useModuleTask";
import { useModulesStore, useAlertsStore } from "@/store";
import { alertsApi } from "@/api/alerts.api";
import { getBaseEvidenceUrls, formatCategory } from "@/utils/evidence";
import {
  Dice6, AlertTriangle, Users, Globe, Activity, Database, Shield,
  DollarSign, Smartphone,
} from "lucide-react";
import {
  ModSvcHeader, ModTabBar, ModKpiCard, ModTrendChart, ModRightSidebar,
  ModFiltersBar, ModFindingEntry, ModEmptyState, ModLoadingState, ModEnrichmentPanel, ModCollectorStatus,
  genTrendData, timeAgo,
  type ModuleConfig, type SeverityFilter,
} from "@/components/shared/ModuleTemplate";
import { getRiskColor } from "@/styles/theme";
import { ExternalLink, CheckCircle2 } from "lucide-react";

// ─── config ──────────────────────────────────────────────────────────────────

const ACCENT = "#a855f7";

const CFG: ModuleConfig = {
  moduleId: "shadowbet",
  title: "SHADOWBET",
  subtitle: "Illegal Gambling Intelligence",
  description: "Illegal gambling platform and operator network intelligence — tracks mobile payments, influencer reach, and unlicensed betting operators.",
  accent: ACCENT,
  icon: Dice6,
  threatTypes: ["Illegal Betting", "Mobile Payment Fraud", "No License", "Influencer Networks", "Operator Clusters"],
  coverage: [
    { icon: Globe,       label: "Betting Platforms" },
    { icon: Smartphone,  label: "Mobile Payments" },
    { icon: Users,       label: "Influencer Networks" },
    { icon: Database,    label: "Domain Registry" },
    { icon: Activity,    label: "Telegram Channels" },
    { icon: Shield,      label: "AIFC / BAC Registry" },
  ],
  sources: [
    { icon: Globe,      label: "Betting Platforms",  count: 184,  trend: "+13%", color: ACCENT },
    { icon: Activity,   label: "Telegram Channels",  count: 2340, trend: "+28%", color: "#3b82f6" },
    { icon: Users,      label: "Influencer Accounts",count: 312,  trend: "+9%",  color: "#ef4444" },
    { icon: Database,   label: "Domain Clusters",    count: 89,   trend: "+16%", color: "#f97316" },
    { icon: Smartphone, label: "Payment Methods",    count: 56,   trend: "+7%",  color: "#10b981" },
  ],
  tabs: ["Overview", "Findings", "Operators", "Entities", "Configuration"],
};

const CAT_COLORS: Record<string, string> = {
  ILLEGAL_BETTING_PLATFORM:   "#a855f7",
  UNLICENSED_CASINO:          "#ef4444",
  SPORTS_BETTING_OPERATOR:    "#f97316",
  CRYPTO_BETTING_PLATFORM:    "#3b82f6",
};

function catColor(k: string) { return CAT_COLORS[k] || "#6b7280"; }
function catLabel(k: string) { return formatCategory(k, "Illegal Platform"); }

function getRedFlags(platform: any): string[] {
  const flags: string[] = [];
  if (!platform.is_licensed) flags.push("Platform is not licensed — no valid AIFC or BAC registration found.");
  if ((platform.payment_methods || []).length > 0)
    flags.push(`Payment methods detected: ${platform.payment_methods.join(", ")}`);
  if ((platform.affiliated_domains || []).length > 1)
    flags.push(`${platform.affiliated_domains.length} affiliated domains — possible operator network.`);
  if ((platform.wallet_addresses || []).length > 0)
    flags.push("Crypto wallet infrastructure detected — investigate financial flows.");
  return flags;
}

function getRecommendedActions(platform: any): string[] {
  const actions: string[] = [];
  const risk = Number(platform.risk_score || 0);
  if (risk >= 80) actions.push("Escalate immediately for AFM analyst review.");
  else if (risk >= 50) actions.push("Queue for manual verification.");
  else actions.push("Monitor platform activity.");
  actions.push("Check license status, domains, payment methods, and influencers.");
  if ((platform.wallet_addresses || []).length > 0)
    actions.push("Investigate linked crypto wallets.");
  return actions;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function ShadowBetPanel() {
  const navigate = useNavigate();
  const { run } = useModuleTask("shadowbet");
  const { currentTask, lastResult, setLastResult } = useModulesStore();
  const isRunning = useModulesStore((s) => !!s.runningModules["shadowbet"]);
  const [scanMode, setScanMode] = useState<"demo" | "live">(() => {
    try { return (localStorage.getItem("sm_shadowbet") as "demo" | "live") || "demo"; } catch { return "demo"; }
  });
  const handleScanModeChange = (mode: "demo" | "live") => {
    setScanMode(mode); try { localStorage.setItem("sm_shadowbet", mode); } catch {}
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
    const pending = localStorage.getItem("sg_autorun_shadowbet");
    if (pending) { localStorage.removeItem("sg_autorun_shadowbet"); try { run(JSON.parse(pending)); } catch {} }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = () => run({ demo_mode: scanMode === "demo", max_channels: 20, include_influencer_map: true });

  const refreshAlerts = async () => {
    const fresh = await alertsApi.list({ dismissed: false, limit: 50 });
    setAlerts(Array.isArray(fresh) ? fresh : []);
  };

  const handleResolveAll = async () => {
    try {
      setIsResolving(true);
      await alertsApi.resolveModule("shadowbet");
      await refreshAlerts();
      setLastResult("shadowbet", null);
    } catch (err) { console.error(err); }
    finally { setIsResolving(false); }
  };

  const getAlertForPlatform = (idx: number) =>
    alerts.find((a: any) => a.module_id === "shadowbet" && !a.is_dismissed &&
      Number((a.metadata || {}).finding_index) === idx &&
      String((a.metadata || {}).finding_type || "") === "platform");

  const getAlertForOperator = (idx: number) =>
    alerts.find((a: any) => a.module_id === "shadowbet" && !a.is_dismissed &&
      Number((a.metadata || {}).finding_index) === idx &&
      String((a.metadata || {}).finding_type || "") === "operator_network");

  const handleResolvePlatform = async (idx: number) => {
    const alert = getAlertForPlatform(idx);
    if (!alert) return;
    try { await alertsApi.resolve(alert.id); await refreshAlerts(); }
    catch (err) { console.error(err); }
  };

  const handleResolveOperator = async (idx: number) => {
    const alert = getAlertForOperator(idx);
    if (!alert) return;
    try { await alertsApi.resolve(alert.id); await refreshAlerts(); }
    catch (err) { console.error(err); }
  };

  const rawResults: any[] = (lastResult?.results as any[]) || [];
  const rawOperators: any[] = (lastResult?.operator_networks as any[]) || [];
  const enrichment = (lastResult?.enrichment as any) || null;
  const collectorStatus = (lastResult?.collector_status as any) || null;

  const platforms = rawResults.map((item, i) => ({ item, i }));
  const operators = rawOperators.map((item, i) => ({ item, i }));

  const criticalCount = platforms.filter(({ item }) => Number(item?.risk_score || 0) >= 85).length;
  const highCount     = platforms.filter(({ item }) => Number(item?.risk_score || 0) >= 65).length;

  const catEntries: [string, number][] = [];
  rawResults.forEach((r) => {
    const cat = r.platform_category || "ILLEGAL_BETTING_PLATFORM";
    const existing = catEntries.find(([k]) => k === cat);
    if (existing) existing[1]++;
    else catEntries.push([cat, 1]);
  });
  const catTotal  = catEntries.reduce((s, [, v]) => s + v, 0) || platforms.length;
  const donutData = catEntries.map(([k, v]) => ({
    label: catLabel(k), value: v, color: catColor(k),
    pct: catTotal > 0 ? ((v / catTotal) * 100).toFixed(1) : "0.0",
  })).sort((a, b) => b.value - a.value);

  const trendData  = useMemo(() => genTrendData(platforms.length || 30), [platforms.length]);
  const uniqueCats = useMemo(() => ["All", ...Array.from(new Set(rawResults.map((r) => r.platform_category).filter(Boolean)))], [rawResults]);

  const recentActivity = useMemo(() => {
    const mod = alerts.filter((a: any) => a.module_id === "shadowbet").slice(0, 5)
      .map((a: any) => ({ color: ACCENT, text: a.title || "Alert detected", time: a.created_at ? timeAgo(a.created_at) : "recently" }));
    if (mod.length === 0) return [
      { color: "#ef4444", text: "Unlicensed gambling platform identified", time: "4m ago" },
      { color: "#10b981", text: "Platform scan completed", time: "4m ago" },
      { color: ACCENT,    text: "Operator network cluster mapped", time: "11m ago" },
      { color: "#f59e0b", text: "Influencer chain traced", time: "25m ago" },
      { color: "#6b7280", text: "AIFC registry synchronized", time: "1h ago" },
    ];
    return mod;
  }, [alerts]);

  const filteredPlatforms = useMemo(() => {
    let list = platforms.slice();
    if (severity !== "All") {
      const thr: Record<SeverityFilter, [number, number]> = {
        All: [0, 100], Critical: [85, 100], High: [65, 84], Medium: [40, 64], Low: [0, 39],
      };
      const [lo, hi] = thr[severity];
      list = list.filter(({ item }) => { const s = Number(item?.risk_score || 0); return s >= lo && s <= hi; });
    }
    if (categoryFilter !== "All") list = list.filter(({ item }) => item?.platform_category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ item }) => String(item?.platform_name || "").toLowerCase().includes(q));
    }
    if (sortBy === "risk_desc") list.sort((a, b) => Number(b.item?.risk_score || 0) - Number(a.item?.risk_score || 0));
    return list;
  }, [platforms, severity, categoryFilter, search, sortBy]);

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
      {/* AFM directive banner */}
      <div className="mb-4 p-3 rounded flex items-start gap-2"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <AlertTriangle size={12} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
        <span className="text-xs" style={{ color: "#f59e0b" }}>
          AFM directive active — mobile balance payments to unlicensed gambling platforms must be blocked
        </span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold uppercase" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
          Illegal Platforms <span style={{ color: "#374151" }}>({filteredPlatforms.length})</span>
        </p>
      </div>
      <ModFiltersBar severity={severity} onSeverity={setSeverity}
        categoryFilter={categoryFilter} onCategory={setCategoryFilter}
        categories={uniqueCats} catLabel={catLabel}
        sortBy={sortBy} onSort={setSortBy}
        search={search} onSearch={setSearch}
        onResolveAll={handleResolveAll} isResolving={isResolving} />
      {filteredPlatforms.length === 0
        ? <p className="text-center py-10" style={{ color: "#4b5563", fontSize: 13 }}>No platforms match your filters.</p>
        : filteredPlatforms.slice(0, 8).map(({ item: r, i }) => {
            const cat = r.platform_category || "ILLEGAL_BETTING_PLATFORM";
            const urls = getBaseEvidenceUrls(r);
            const subtitle = [
              (r.payment_methods || []).length > 0 ? `Payments: ${r.payment_methods.slice(0, 2).join(", ")}` : null,
              (r.affiliated_domains || []).length > 0 ? `${r.affiliated_domains.length} affiliated domains` : null,
              (r.wallet_addresses || []).length > 0 ? `${r.wallet_addresses.length} wallets` : null,
            ].filter(Boolean).join(" · ");
            const extraTags = [
              !r.is_licensed
                ? { label: "NO LICENSE", color: "#f87171", bg: "rgba(239,68,68,0.12)" }
                : { label: "LICENSED", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
            ];
            return (
              <ModFindingEntry key={i} idx={i}
                title={r.platform_name || "Unknown Platform"}
                categoryLabel={catLabel(cat)} categoryColor={catColor(cat)}
                riskScore={Number(r.risk_score || 0)} summaryLine={subtitle}
                analystSummary={r.analyst_summary} redFlags={getRedFlags(r)}
                recommendedActions={getRecommendedActions(r)}
                evidenceUrls={urls} investigateHref={`/investigation/shadowbet/${i}`}
                onResolve={() => handleResolvePlatform(i)} isResolved={!getAlertForPlatform(i)}
                extraTags={extraTags} mlClassification={r.ml_classification} />
            );
          })}
    </>
  );

  const operatorsList = (
    <div className="space-y-3">
      {operators.length === 0
        ? <p className="text-center py-10" style={{ color: "#4b5563", fontSize: 13 }}>No operator networks detected.</p>
        : operators.map(({ item: op, i }) => {
            const score = Number(op.threat_score || op.risk_score || 0);
            const color = getRiskColor(score);
            const urls  = getBaseEvidenceUrls(op);
            const resolved = !getAlertForOperator(i);
            return (
              <div key={i} className="rounded-lg p-4" style={{ background: "#111827", border: "1px solid #1a2640" }}>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 52 }}>
                    <span className="px-2 py-0.5 rounded font-bold uppercase"
                      style={{ background: `${color}22`, color, fontSize: 10 }}>
                      {score >= 85 ? "CRITICAL" : score >= 65 ? "HIGH" : score >= 40 ? "MED" : "LOW"}
                    </span>
                    <span className="font-black" style={{ color, fontSize: 20, lineHeight: 1 }}>{score}</span>
                    <span style={{ color: "#6b7280", fontSize: 9 }}>/100</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold" style={{ color: "#e5e7eb", fontSize: 13 }}>{op.operator_id}</p>
                    <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
                      {op.domain_count} domains · {op.influencer_count} influencers ·&nbsp;
                      Est. {Number(op.estimated_weekly_revenue_kzt || 0).toLocaleString()} KZT/week
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {urls.slice(0, 3).map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs"
                          style={{ color: ACCENT }}>
                          Source {idx + 1} <ExternalLink size={9} />
                        </a>
                      ))}
                      <button onClick={() => navigate(`/investigation/shadowbet/${platforms.length + i}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                        style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}>
                        <ExternalLink size={10} /> Investigate
                      </button>
                      {!resolved ? (
                        <button onClick={() => handleResolveOperator(i)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                          style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
                          <CheckCircle2 size={11} /> Resolve
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: "#10b981", opacity: 0.7 }}>
                          <CheckCircle2 size={11} /> Resolved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
    </div>
  );

  return (
    <div style={{ background: "#080d18", minHeight: "100%" }}>
      {header}
      {tabBar}
      {activeTab === "Overview" && (
        <>
          <div className="grid grid-cols-6 gap-3 p-5 pb-0">
            <ModKpiCard label="Illegal Platforms"   value={Number(lastResult?.illegal_platforms_found || 0)} trend="↑ 13%"  icon={Dice6}      color={ACCENT} />
            <ModKpiCard label="Operator Networks"   value={Number(lastResult?.operator_networks_found || 0)} trend="↑ 9%"   icon={Database}   color="#ef4444" />
            <ModKpiCard label="Influencers Mapped"  value={Number(lastResult?.total_influencers_mapped || 0)} trend="↑ 21%" icon={Users}       color="#f97316" />
            <ModKpiCard label="Audience Reach"      value={Number(lastResult?.total_audience_reach || 0).toLocaleString()} trend="↑ 28%" icon={Activity} color="#3b82f6" />
            <ModKpiCard label="Critical Platforms"  value={criticalCount}                                    trend="↑ 15%"  icon={AlertTriangle} color="#eab308" />
            <ModKpiCard label="High Risk"           value={highCount}                                        trend="↑ 11%"  icon={Shield}     color="#10b981" />
          </div>
          <div className="grid gap-5 p-5" style={{ gridTemplateColumns: "1fr 340px" }}>
            <div className="space-y-4">
              <ModTrendChart data={trendData} accent={ACCENT} label="Illegal Betting Activity Over Time" />
              {enrichment && <ModEnrichmentPanel enrichment={enrichment} accent={ACCENT} />}
              {collectorStatus && <ModCollectorStatus status={collectorStatus} />}
              {findingsList}
            </div>
            <ModRightSidebar cfg={CFG} donutData={donutData} donutTotal={catTotal} recentActivity={recentActivity} />
          </div>
        </>
      )}
      {activeTab === "Findings" && <div className="p-5">{findingsList}</div>}
      {activeTab === "Operators" && (
        <div className="p-5">
          <p className="font-bold mb-4" style={{ color: "#e5e7eb", fontSize: 14 }}>
            Operator Networks ({operators.length})
          </p>
          {operatorsList}
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
