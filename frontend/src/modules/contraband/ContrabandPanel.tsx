/**
 * CONTRABAND-KZ — Contraband Market Intelligence
 * Service page following the ShadowGuard module template design.
 */
import { useState, useMemo, useEffect } from "react";
import { useModuleTask } from "@/hooks/useModuleTask";
import { useModulesStore, useAlertsStore } from "@/store";
import { alertsApi } from "@/api/alerts.api";
import {
  PackageSearch, AlertTriangle, Globe, Activity, Database, Shield,
  MessageSquare, ShieldAlert,
} from "lucide-react";
import {
  ModSvcHeader, ModTabBar, ModKpiCard, ModTrendChart, ModRightSidebar,
  ModFiltersBar, ModFindingEntry, ModEmptyState, ModLoadingState, ModEnrichmentPanel, ModCollectorStatus,
  genTrendData, timeAgo,
  type ModuleConfig, type SeverityFilter,
} from "@/components/shared/ModuleTemplate";
import ContrabandGraph from "./components/ContrabandGraph";
import ContrabandTimeline from "./components/ContrabandTimeline";
import { ContrabandResult, ContrabandFinding } from "./types";
import { getContrabandCategoryColor } from "./utils/contrabandColors";
import { formatCategory } from "./utils/contrabandFormatters";
import { getEvidenceCount } from "./utils/contrabandEvidence";

// ─── config ──────────────────────────────────────────────────────────────────

const ACCENT = "#10b981";

const CFG: ModuleConfig = {
  moduleId: "contraband",
  title: "CONTRABAND-KZ",
  subtitle: "Contraband Market Intelligence",
  description: "Drugs, vapes, alcohol, and courier network intelligence — monitors illegal marketplace activity across Telegram, web, and DarkNet sources.",
  accent: ACCENT,
  icon: PackageSearch,
  threatTypes: ["Drug Trafficking", "Illegal Vapes", "Contraband Alcohol", "Courier Networks", "Drop Networks", "Darknet Markets"],
  coverage: [
    { icon: MessageSquare, label: "Telegram Groups" },
    { icon: Globe,         label: "Web Markets" },
    { icon: ShieldAlert,   label: "DarkNet" },
    { icon: Activity,      label: "Instagram" },
    { icon: Database,      label: "Paste Sites" },
    { icon: Shield,        label: "OSINT Sources" },
  ],
  sources: [
    { icon: MessageSquare, label: "Telegram Channels", count: 1820, trend: "+27%", color: ACCENT },
    { icon: ShieldAlert,   label: "DarkNet Markets",   count: 342,  trend: "+14%", color: "#ef4444" },
    { icon: Globe,         label: "Web Sources",       count: 689,  trend: "+9%",  color: "#3b82f6" },
    { icon: Activity,      label: "Instagram Accounts",count: 412,  trend: "+19%", color: "#f97316" },
    { icon: Database,      label: "Paste / Forums",    count: 198,  trend: "+11%", color: "#a855f7" },
  ],
  tabs: ["Overview", "Findings", "Graph", "Timeline", "Entities", "Configuration"],
};

function catColor(k: string) { return getContrabandCategoryColor(k); }
function catLabelFn(k: string) { return formatCategory(k); }

function getFindingUrls(finding: ContrabandFinding): string[] {
  const sourceData = finding.source_data || {};
  return Array.from(new Set([
    finding.source_url, finding.url,
    ...(finding.evidence_urls || []),
    ...(sourceData.evidence_urls || []),
    ...(sourceData.telegram_links || []),
    ...(sourceData.web_links || []),
    ...(sourceData.onion_links || []),
  ].filter(Boolean).map((u) => String(u))));
}

// ─── component ───────────────────────────────────────────────────────────────

export default function ContrabandPanel() {
  const { run } = useModuleTask("contraband");
  const { currentTask, lastResult } = useModulesStore();
  const isRunning = useModulesStore((s) => !!s.runningModules["contraband"]);
  const [scanMode, setScanMode] = useState<"demo" | "live">(() => {
    try { return (localStorage.getItem("sm_contraband") as "demo" | "live") || "demo"; } catch { return "demo"; }
  });
  const handleScanModeChange = (mode: "demo" | "live") => {
    setScanMode(mode); try { localStorage.setItem("sm_contraband", mode); } catch {}
  };
  const [includeTelegram, setIncludeTelegram] = useState<boolean>(() => {
    try { const v = localStorage.getItem("cb_src_telegram"); return v !== null ? v === "true" : false; } catch { return false; }
  });
  const [includeWeb, setIncludeWeb] = useState<boolean>(() => {
    try { const v = localStorage.getItem("cb_src_web"); return v !== null ? v === "true" : true; } catch { return true; }
  });
  const [includeDarknet, setIncludeDarknet] = useState<boolean>(() => {
    try { const v = localStorage.getItem("cb_src_darknet"); return v !== null ? v === "true" : false; } catch { return false; }
  });
  const [includeInstagram, setIncludeInstagram] = useState<boolean>(() => {
    try { const v = localStorage.getItem("cb_src_instagram"); return v !== null ? v === "true" : true; } catch { return true; }
  });

  const [activeTab, setActiveTab] = useState("Overview");
  const [isResolving, setIsResolving] = useState(false);
  const [severity, setSeverity] = useState<SeverityFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("risk_desc");
  const [search, setSearch] = useState("");

  const alerts = useAlertsStore((s) => s.alerts);
  const setAlerts = useAlertsStore((s) => s.setAlerts);


  const setTelegram = (v: boolean) => { setIncludeTelegram(v); try { localStorage.setItem("cb_src_telegram", String(v)); } catch {} };
  const setWeb = (v: boolean) => { setIncludeWeb(v); try { localStorage.setItem("cb_src_web", String(v)); } catch {} };
  const setDarknet = (v: boolean) => { setIncludeDarknet(v); try { localStorage.setItem("cb_src_darknet", String(v)); } catch {} };
  const setInstagram = (v: boolean) => { setIncludeInstagram(v); try { localStorage.setItem("cb_src_instagram", String(v)); } catch {} };

  const result = lastResult as ContrabandResult | null;
  const findings = result?.findings || [];
  const enrichment = (lastResult?.enrichment as any) || null;
  const collectorStatus = (lastResult?.collector_status as any) || null;

  useEffect(() => {
    const pending = localStorage.getItem("sg_autorun_contraband");
    if (pending) { localStorage.removeItem("sg_autorun_contraband"); try { run(JSON.parse(pending)); } catch {} }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = () => {
    run({
      mode: scanMode, demo_mode: scanMode === "demo",
      include_telegram: includeTelegram, include_web: includeWeb,
      include_darknet: includeDarknet, include_instagram: includeInstagram,
      max_findings: 20,
    });
  };

  const refreshAlerts = async () => {
    const fresh = await alertsApi.list({ dismissed: false, limit: 50 });
    setAlerts(Array.isArray(fresh) ? fresh : []);
  };

  const handleResolveAll = async () => {
    try {
      setIsResolving(true);
      await alertsApi.resolveModule("contraband");
      await refreshAlerts();
    } catch (err) { console.error(err); }
    finally { setIsResolving(false); }
  };

  const criticalCount = findings.filter((f) => Number(f.risk_score || 0) >= 85).length;
  const highCount     = findings.filter((f) => Number(f.risk_score || 0) >= 65).length;

  const catEntries = Object.entries(result?.category_counts || {}).filter(([, v]) => v > 0);
  const catTotal   = catEntries.reduce((s, [, v]) => s + v, 0) || findings.length;
  const donutData  = catEntries.map(([k, v]) => ({
    label: catLabelFn(k), value: v, color: catColor(k),
    pct: catTotal > 0 ? ((v / catTotal) * 100).toFixed(1) : "0.0",
  })).sort((a, b) => b.value - a.value);

  const trendData  = useMemo(() => genTrendData(findings.length || 45), [findings.length]);
  const uniqueCats = useMemo(() => ["All", ...Array.from(new Set(findings.map((f) => f.crime_category).filter(Boolean) as string[]))], [findings]);

  const recentActivity = useMemo(() => {
    const mod = alerts.filter((a: any) => a.module_id === "contraband").slice(0, 5)
      .map((a: any) => ({ color: ACCENT, text: a.title || "Alert detected", time: a.created_at ? timeAgo(a.created_at) : "recently" }));
    if (mod.length === 0) return [
      { color: "#ef4444", text: "Drug trafficking network detected", time: "1m ago" },
      { color: "#10b981", text: "Contraband scan completed", time: "1m ago" },
      { color: "#3b82f6", text: "Courier network mapped", time: "6m ago" },
      { color: "#f97316", text: "DarkNet market listing found", time: "20m ago" },
      { color: "#6b7280", text: "Instagram collector updated", time: "45m ago" },
    ];
    return mod;
  }, [alerts]);

  const filteredFindings = useMemo(() => {
    let list = findings.slice();
    if (severity !== "All") {
      const thr: Record<SeverityFilter, [number, number]> = {
        All: [0, 100], Critical: [85, 100], High: [65, 84], Medium: [40, 64], Low: [0, 39],
      };
      const [lo, hi] = thr[severity];
      list = list.filter((f) => { const s = Number(f.risk_score || 0); return s >= lo && s <= hi; });
    }
    if (categoryFilter !== "All") list = list.filter((f) => f.crime_category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) =>
        String(f.title || "").toLowerCase().includes(q) ||
        String(f.source_name || f.source || "").toLowerCase().includes(q));
    }
    if (sortBy === "risk_desc") list.sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0));
    return list;
  }, [findings, severity, categoryFilter, search, sortBy]);

  const isOnline = !!result || isRunning;
  const lastScanTime = currentTask?.completed_at || currentTask?.created_at;

  const header = (
    <ModSvcHeader cfg={CFG} isOnline={isOnline} lastScanTime={lastScanTime}
      isRunning={isRunning} taskId={currentTask?.task_id} onRun={handleRun}
      scanMode={scanMode} onScanModeChange={handleScanModeChange} />
  );
  const tabBar = <ModTabBar tabs={CFG.tabs} active={activeTab} accent={ACCENT} onSelect={setActiveTab} />;

  if (!result && !isRunning) return (
    <div style={{ background: "#080d18", minHeight: "100%" }}>
      {header}{tabBar}
      {/* Source controls in empty state */}
      <div className="px-5 py-3 flex items-center gap-4 flex-wrap" style={{ borderBottom: "1px solid #1a2640" }}>
        <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>Sources:</span>
        {([
          { label: "Telegram", val: includeTelegram, set: setTelegram },
          { label: "Web",      val: includeWeb,      set: setWeb },
          { label: "DarkNet",  val: includeDarknet,  set: setDarknet },
          { label: "Instagram",val: includeInstagram,set: setInstagram },
        ] as const).map(({ label, val, set }) => (
          <label key={label} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#9ca3af" }}>
            <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} />
            {label}
          </label>
        ))}
      </div>
      <ModEmptyState cfg={CFG} onRun={handleRun} />
    </div>
  );

  if (isRunning && !result) return (
    <div style={{ background: "#080d18", minHeight: "100%" }}>
      {header}{tabBar}<ModLoadingState cfg={CFG} />
    </div>
  );

  const sourceControlsBar = (
    <div className="px-5 py-2 flex items-center gap-4 flex-wrap" style={{ borderBottom: "1px solid #1a2640" }}>
      <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>Sources:</span>
      {([
        { label: "Telegram", val: includeTelegram, set: setTelegram },
        { label: "Web",      val: includeWeb,      set: setWeb },
        { label: "DarkNet",  val: includeDarknet,  set: setDarknet },
        { label: "Instagram",val: includeInstagram,set: setInstagram },
      ] as const).map(({ label, val, set }) => (
        <label key={label} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#9ca3af" }}>
          <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} />
          {label}
        </label>
      ))}
    </div>
  );

  const findingsList = (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold uppercase" style={{ color: "#6b7280", fontSize: 10, letterSpacing: "0.1em" }}>
          Contraband Findings <span style={{ color: "#374151" }}>({filteredFindings.length})</span>
        </p>
      </div>
      <ModFiltersBar severity={severity} onSeverity={setSeverity}
        categoryFilter={categoryFilter} onCategory={setCategoryFilter}
        categories={uniqueCats} catLabel={catLabelFn}
        sortBy={sortBy} onSort={setSortBy}
        search={search} onSearch={setSearch}
        onResolveAll={handleResolveAll} isResolving={isResolving} />
      {filteredFindings.length === 0
        ? <p className="text-center py-10" style={{ color: "#4b5563", fontSize: 13 }}>No findings match your filters.</p>
        : filteredFindings.map((f, idx) => {
            const cat      = f.crime_category || "CONTRABAND_INTELLIGENCE";
            const urls     = getFindingUrls(f);
            const entities = f.entities || {};
            const evCnt    = getEvidenceCount(f);
            const telegramCnt = (entities.telegram_handles || []).length;
            const walletCnt   = (entities.wallets || []).length;
            const subtitle = [
              f.source_name || f.source ? `Source: ${f.source_name || f.source}` : null,
              f.city ? `City: ${f.city}` : null,
              `Evidence: ${evCnt}`,
              telegramCnt > 0 ? `Telegram: ${telegramCnt}` : null,
              walletCnt > 0   ? `Wallets: ${walletCnt}` : null,
            ].filter(Boolean).join(" · ");
            const extraTags = [
              { label: f.source_type || "unknown source", color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
              f.evidence_priority ? { label: `Evidence: ${String(f.evidence_priority).toUpperCase()}`, color: "#10b981", bg: "rgba(16,185,129,0.1)" } : null,
            ].filter(Boolean) as any[];
            return (
              <ModFindingEntry key={idx} idx={idx}
                title={f.title || "Untitled Finding"}
                categoryLabel={catLabelFn(cat)} categoryColor={catColor(cat)}
                riskScore={Number(f.risk_score || 0)} summaryLine={subtitle}
                analystSummary={f.analyst_summary} redFlags={f.red_flags}
                recommendedActions={f.recommended_actions}
                evidenceUrls={urls} investigateHref={`/investigation/contraband/${idx}`}
                extraTags={extraTags} mlClassification={f.ml_classification} />
            );
          })}
      {/* Analyst summary */}
      {result?.analyst_summary && (
        <div className="mt-4 rounded-lg p-4" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <p className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: "#10b981" }}>
            <AlertTriangle size={12} /> Module Analyst Summary
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{result.analyst_summary}</p>
          {Array.isArray(result.recommended_actions) && result.recommended_actions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold mb-1" style={{ color: "#e5e7eb" }}>Recommended Actions</p>
              {result.recommended_actions.slice(0, 4).map((action, i) => (
                <p key={i} className="text-xs" style={{ color: "#6b7280" }}>{i + 1}. {action}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div style={{ background: "#080d18", minHeight: "100%" }}>
      {header}
      {tabBar}
      {sourceControlsBar}

      {activeTab === "Overview" && (
        <>
          <div className="grid grid-cols-6 gap-3 p-5 pb-0">
            <ModKpiCard label="Sources Scanned"    value={Number(result?.sources_scanned || 0)}           trend="↑ 18%"  icon={Globe}         color={ACCENT} />
            <ModKpiCard label="Total Findings"     value={Number(result?.findings_count || findings.length)} trend="↑ 24%" icon={PackageSearch} color="#ef4444" />
            <ModKpiCard label="Drug Findings"      value={Number(result?.drug_findings || 0)}              trend="↑ 16%"  icon={AlertTriangle} color="#f97316" />
            <ModKpiCard label="Critical Findings"  value={criticalCount}                                   trend="↑ 31%"  icon={ShieldAlert}   color="#a855f7" />
            <ModKpiCard label="Courier Networks"   value={Number(result?.courier_networks || 0)}           trend="↑ 9%"   icon={Activity}      color="#eab308" />
            <ModKpiCard label="Alerts Fired"       value={Number(result?.alerts_fired || 0)}               trend="↑ 14%"  icon={Database}      color="#3b82f6" />
          </div>
          <div className="grid gap-5 p-5" style={{ gridTemplateColumns: "1fr 340px" }}>
            <div className="space-y-4">
              <ModTrendChart data={trendData} accent={ACCENT} label="Contraband Intelligence Over Time" />
              {enrichment && <ModEnrichmentPanel enrichment={enrichment} accent={ACCENT} />}
              {collectorStatus && <ModCollectorStatus status={collectorStatus} />}
              {findingsList}
            </div>
            <ModRightSidebar cfg={CFG} donutData={donutData} donutTotal={catTotal} recentActivity={recentActivity} />
          </div>
        </>
      )}
      {activeTab === "Findings" && <div className="p-5">{findingsList}</div>}
      {activeTab === "Graph" && (
        <div className="p-5">
          <p className="font-bold mb-4" style={{ color: "#e5e7eb", fontSize: 14 }}>
            Contraband Network Graph
          </p>
          <ContrabandGraph nodes={result?.graph_nodes || []} edges={result?.graph_edges || []} />
        </div>
      )}
      {activeTab === "Timeline" && (
        <div className="p-5">
          <p className="font-bold mb-4" style={{ color: "#e5e7eb", fontSize: 14 }}>
            Intelligence Timeline
          </p>
          <ContrabandTimeline findings={findings} />
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
