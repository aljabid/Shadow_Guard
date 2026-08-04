/**
 * DROPER — Recruitment Network Intelligence
 * Service page following the ShadowGuard module template design.
 */
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useModuleTask } from "@/hooks/useModuleTask";
import { useModulesStore, useAlertsStore } from "@/store";
import { alertsApi } from "@/api/alerts.api";
import { getBaseEvidenceUrls, formatCategory } from "@/utils/evidence";
import {
  Search, Users, Network, MessageSquare, Globe, Activity, Database, Shield,
} from "lucide-react";
import {
  ModSvcHeader, ModTabBar, ModKpiCard, ModTrendChart, ModRightSidebar,
  ModFiltersBar, ModFindingEntry, ModEmptyState, ModLoadingState, ModEnrichmentPanel, ModCollectorStatus,
  genTrendData, timeAgo,
  type ModuleConfig, type SeverityFilter,
} from "@/components/shared/ModuleTemplate";

// ─── config ──────────────────────────────────────────────────────────────────

const ACCENT = "#f97316";

const CFG: ModuleConfig = {
  moduleId: "droper",
  title: "DROPER",
  subtitle: "Recruitment Network Intelligence",
  description: "Drop card recruitment network intelligence — maps Telegram channels recruiting money mules and dropper networks.",
  accent: ACCENT,
  icon: Search,
  threatTypes: ["Drop Card Recruitment", "Cashout Networks", "Money Mule Operations", "Crypto Drop", "Bank Dropper"],
  coverage: [
    { icon: MessageSquare, label: "Telegram Groups" },
    { icon: Network,       label: "Network Graphs" },
    { icon: Users,         label: "Operator Mapping" },
    { icon: Globe,         label: "Web Sources" },
    { icon: Activity,      label: "Post Analysis" },
    { icon: Database,      label: "Channel History" },
  ],
  sources: [
    { icon: MessageSquare, label: "Telegram Channels", count: 1240, trend: "+22%", color: ACCENT },
    { icon: Users,         label: "Operator Networks", count: 87,   trend: "+15%", color: "#ef4444" },
    { icon: Activity,      label: "Recruitment Posts", count: 3420, trend: "+31%", color: "#eab308" },
    { icon: Globe,         label: "Web Forums",        count: 156,  trend: "+8%",  color: "#a855f7" },
    { icon: Database,      label: "Bank Droper Refs",  count: 412,  trend: "+19%", color: "#10b981" },
  ],
  tabs: ["Overview", "Findings", "Graph", "Entities", "Configuration"],
};

const CAT_COLORS: Record<string, string> = {
  DROP_CARD_RECRUITMENT: "#ef4444",
  CASHOUT_NETWORK:       "#f97316",
  CRYPTO_DROP_NETWORK:   "#a855f7",
  DROPPER_NETWORK:       "#eab308",
};

function catColor(k: string) { return CAT_COLORS[k] || "#6b7280"; }
function catLabel(k: string) { return formatCategory(k, "Recruitment"); }

function getChannelUrls(ch: any): string[] {
  const sourceData = ch.source_data || ch.source || {};
  const channelLink = ch.link || ch.source_url || ch.url || sourceData?.source_url ||
    (ch.username ? `https://t.me/${ch.username}` : null);
  return getBaseEvidenceUrls({ ...ch, link: channelLink, ...(sourceData as object) });
}

// ─── component ───────────────────────────────────────────────────────────────

export default function DroperPanel() {
  const navigate = useNavigate();
  const { run } = useModuleTask("droper");
  const { currentTask, lastResult, setLastResult } = useModulesStore();
  const isRunning = useModulesStore((s) => !!s.runningModules["droper"]);
  const [scanMode, setScanMode] = useState<"demo" | "live">(() => {
    try { return (localStorage.getItem("sm_droper") as "demo" | "live") || "demo"; } catch { return "demo"; }
  });
  const handleScanModeChange = (mode: "demo" | "live") => {
    setScanMode(mode); try { localStorage.setItem("sm_droper", mode); } catch {}
  };
  const [activeTab, setActiveTab] = useState("Overview");
  const [isResolving, setIsResolving] = useState(false);
  const [severity, setSeverity] = useState<SeverityFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("risk_desc");
  const [search, setSearch] = useState("");

  const alerts = useAlertsStore((s) => s.alerts);
  const setAlerts = useAlertsStore((s) => s.setAlerts);
  const graphRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const pending = localStorage.getItem("sg_autorun_droper");
    if (pending) { localStorage.removeItem("sg_autorun_droper"); try { run(JSON.parse(pending)); } catch {} }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = () => run({ demo_mode: scanMode === "demo", max_channels: 20, include_graph: true });

  const refreshAlerts = async () => {
    const fresh = await alertsApi.list({ dismissed: false, limit: 50 });
    setAlerts(Array.isArray(fresh) ? fresh : []);
  };

  const handleResolveAll = async () => {
    try {
      setIsResolving(true);
      await alertsApi.resolveModule("droper");
      await refreshAlerts();
      setLastResult("droper", null);
    } catch (err) { console.error(err); }
    finally { setIsResolving(false); }
  };

  const getAlertForFinding = (idx: number) =>
    alerts.find((a: any) => a.module_id === "droper" && !a.is_dismissed &&
      Number((a.metadata || {}).finding_index) === idx);

  const handleResolveFinding = async (idx: number) => {
    const alert = getAlertForFinding(idx);
    if (!alert) return;
    try { await alertsApi.resolve(alert.id); await refreshAlerts(); }
    catch (err) { console.error(err); }
  };

  const rawTopChannels: any[] = (lastResult?.top_channels as any[]) || [];
  const graphNodes: any[] = (lastResult?.graph_nodes as any[]) || [];
  const graphEdges: any[] = (lastResult?.graph_edges as any[]) || [];
  const categoryCounts = (lastResult?.category_counts as Record<string, number>) || {};
  const enrichment = (lastResult?.enrichment as any) || null;
  const collectorStatus = (lastResult?.collector_status as any) || null;

  const allFindings = rawTopChannels.map((item, i) => ({ item, i }));

  const criticalCount = allFindings.filter(({ item }) => Number(item?.risk_score || 0) >= 85).length;
  const highCount     = allFindings.filter(({ item }) => Number(item?.risk_score || 0) >= 65).length;

  const catEntries = Object.entries(categoryCounts).filter(([, v]) => v > 0);
  const catTotal   = catEntries.reduce((s, [, v]) => s + v, 0) || allFindings.length;
  const donutData  = catEntries.map(([k, v]) => ({
    label: catLabel(k), value: v, color: catColor(k),
    pct: catTotal > 0 ? ((v / catTotal) * 100).toFixed(1) : "0.0",
  })).sort((a, b) => b.value - a.value);

  const trendData  = useMemo(() => genTrendData(allFindings.length || 50), [allFindings.length]);
  const uniqueCats = useMemo(() => ["All", ...Array.from(new Set(allFindings.map(({ item }) => item?.crime_category).filter(Boolean)))], [allFindings]);

  const recentActivity = useMemo(() => {
    const mod = alerts.filter((a: any) => a.module_id === "droper").slice(0, 5)
      .map((a: any) => ({ color: ACCENT, text: a.title || "Alert detected", time: a.created_at ? timeAgo(a.created_at) : "recently" }));
    if (mod.length === 0) return [
      { color: "#ef4444", text: "High-risk dropper channel detected", time: "2m ago" },
      { color: "#10b981", text: "Telegram scan completed", time: "2m ago" },
      { color: "#3b82f6", text: "Network graph updated", time: "5m ago" },
      { color: "#eab308", text: "Operator cluster identified", time: "18m ago" },
      { color: "#6b7280", text: "Channel history synchronized", time: "45m ago" },
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
    if (categoryFilter !== "All") list = list.filter(({ item }) => item?.crime_category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ item }) =>
        String(item?.channel || item?.title || "").toLowerCase().includes(q) ||
        String(item?.username || "").toLowerCase().includes(q));
    }
    if (sortBy === "risk_desc") list.sort((a, b) => Number(b.item?.risk_score || 0) - Number(a.item?.risk_score || 0));
    return list;
  }, [allFindings, severity, categoryFilter, search, sortBy]);

  // cytoscape graph for the Graph tab — nodes are clickable
  useEffect(() => {
    if (activeTab !== "Graph" || !graphRef.current || graphNodes.length === 0) return;
    let mounted = true;
    import("cytoscape").then((mod) => {
      if (!mounted || !graphRef.current) return;
      const cy = (mod as any).default({
        container: graphRef.current,
        elements: [
          ...graphNodes.map((n) => ({ data: { id: n.id, label: n.label, risk_score: n.risk_score, type: n.type } })),
          ...graphEdges.map((e) => ({ data: { source: e.source, target: e.target, label: e.label || "" } })),
        ],
        style: [
          { selector: "node", style: { "background-color": ACCENT, label: "data(label)", color: "#e5e7eb", "font-size": 9, width: 24, height: 24, cursor: "pointer" } },
          { selector: "node:selected", style: { "background-color": "#facc15", "border-color": "#fff", "border-width": 2 } },
          { selector: "edge", style: { "line-color": "#374151", width: 1.5, "curve-style": "bezier", "target-arrow-shape": "triangle", "target-arrow-color": "#374151" } },
        ],
        layout: { name: "cose", animate: false },
      });
      cy.on("tap", "node", (evt: any) => {
        const nodeId: string = evt.target.data("id") || "";
        const numPart = String(nodeId).replace(/\D/g, "") || "0";
        if (nodeId.startsWith("finding") || nodeId.startsWith("channel")) {
          navigate(`/investigation/droper/${numPart}`);
        } else {
          navigate(`/entities?module=droper&value=${encodeURIComponent(evt.target.data("label") || nodeId)}`);
        }
      });
    });
    return () => { mounted = false; };
  }, [activeTab, graphNodes, graphEdges, navigate]);

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
          Recruitment Channels <span style={{ color: "#374151" }}>({filteredFindings.length})</span>
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
        : filteredFindings.slice(0, 8).map(({ item: ch, i }) => {
            const memberCount = Number(ch.member_count || ch.participants_count || 0);
            const cat = ch.crime_category || "DROPPER_NETWORK";
            const urls = getChannelUrls(ch);
            const subtitle = [
              `${memberCount.toLocaleString()} members`,
              `${Number(ch.recruitment_post_count || 0)} recruitment posts`,
              ch.bank_name ? `Bank: ${ch.bank_name}` : null,
            ].filter(Boolean).join(" · ");
            const extraTags = [
              ch.network_role ? { label: ch.network_role, color: "#60a5fa", bg: "rgba(59,130,246,0.12)" } : null,
              ch.evidence_priority ? { label: `Evidence: ${String(ch.evidence_priority).toUpperCase()}`, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" } : null,
            ].filter(Boolean) as any[];
            return (
              <ModFindingEntry key={i} idx={i}
                title={ch.title || ch.channel || ch.username || "Unknown Channel"}
                categoryLabel={catLabel(cat)} categoryColor={catColor(cat)}
                riskScore={Number(ch.risk_score || 0)} summaryLine={subtitle}
                analystSummary={ch.analyst_summary} recommendedActions={ch.recommended_actions}
                evidenceUrls={urls} investigateHref={`/investigation/droper/${i}`}
                onResolve={() => handleResolveFinding(i)} isResolved={!getAlertForFinding(i)}
                extraTags={extraTags} mlClassification={ch.ml_classification} />
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
            <ModKpiCard label="Channels Found"    value={Number(lastResult?.recruitment_channels_found || 0)} trend="↑ 22%"  icon={MessageSquare} color={ACCENT} />
            <ModKpiCard label="Operator Networks" value={Number(lastResult?.communities_detected || 0)}        trend="↑ 15%"  icon={Network}       color="#ef4444" />
            <ModKpiCard label="Flagged Posts"     value={Number(lastResult?.total_flagged_posts || 0)}         trend="↑ 31%"  icon={Activity}      color="#eab308" />
            <ModKpiCard label="Critical Signals"  value={criticalCount}                                        trend="↑ 18%"  icon={Shield}        color="#a855f7" />
            <ModKpiCard label="High Risk"         value={highCount}                                            trend="↑ 9%"   icon={Users}         color="#10b981" />
            <ModKpiCard label="Alerts Fired"      value={Number(lastResult?.alerts_fired || 0)}                trend="↑ 14%"  icon={Globe}         color="#3b82f6" />
          </div>
          <div className="grid gap-5 p-5" style={{ gridTemplateColumns: "1fr 340px" }}>
            <div className="space-y-4">
              <ModTrendChart data={trendData} accent={ACCENT} label="Recruitment Activity Over Time" />
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
            Recruitment Network Graph — {graphNodes.length} channels, {graphEdges.length} connections
          </p>
          <div ref={graphRef} style={{ height: 480, background: "#111827", borderRadius: 8, border: "1px solid #1a2640" }} />
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
