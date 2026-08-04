import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useEntityRegistry } from "@/hooks/useEntityRegistry";
import EntityTag from "@/components/entities/EntityTag";
import UnifiedIntelligenceGraph from "@/components/graph/UnifiedIntelligenceGraph";
import { intelligenceGraphApi } from "@/api/intelligenceGraph.api";
import {
  correlationsApi,
  CrossModuleCorrelation,
} from "@/api/correlations.api";
import {
  Search,
  RefreshCcw,
  Link2,
  ExternalLink,
  X,
  Database,
  GitMerge,
  Network,
  AlertTriangle,
} from "lucide-react";
import RiskScoreBadge from "@/components/common/RiskScoreBadge";

/* ─────────────── helpers ─────────────── */

function normalizeSearch(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace("www.", "")
    .replace("t.me/", "")
    .replace("@", "")
    .replace(/[^\wа-яёәғқңөұүһі.-]+/gi, " ")
    .trim();
}

function matchesQuery(value: unknown, query: string): boolean {
  if (!query) return true;
  return normalizeSearch(value).includes(normalizeSearch(query));
}

function correlationMatches(
  c: CrossModuleCorrelation,
  query: string
): boolean {
  if (!query.trim()) return true;
  return (
    matchesQuery(c.entity_value, query) ||
    matchesQuery(c.entity_type, query) ||
    matchesQuery(c.normalized_value, query) ||
    matchesQuery(c.modules?.join(" "), query) ||
    matchesQuery((c as any).correlation_label, query) ||
    matchesQuery((c as any).analyst_summary, query) ||
    (c.evidence || []).some(
      (ev: any) =>
        matchesQuery(ev.title, query) ||
        matchesQuery(ev.module_id, query) ||
        matchesQuery(ev.source_url, query)
    )
  );
}

function getCorrelationPath(c: CrossModuleCorrelation): string {
  const ev: any = c.evidence?.[0];
  const mod = ev?.module_id || c.modules?.[0] || "tengraf";
  const idx = ev?.finding_index ?? ev?.result_index ?? ev?.index ?? 0;
  return `/investigation/${mod}/${idx}`;
}

function getEntityPath(entity: any): string {
  const mod = entity.source_modules?.[0] || "tengraf";
  return `/investigation/${mod}/0`;
}

const MODULE_LABELS: Record<string, string> = {
  kolkhoz: "KOLKHOZ",
  droper: "DROPER",
  piramida: "PIRAMIDA",
  shadowbet: "SHADOW BET",
  tengraf: "TENGRAF",
  contraband: "CONTRABAND",
};

const MODULE_COLORS: Record<string, string> = {
  kolkhoz: "#60a5fa",
  droper: "#ef4444",
  piramida: "#a855f7",
  shadowbet: "#f97316",
  tengraf: "#eab308",
  contraband: "#10b981",
};

function ModulePill({ moduleId }: { moduleId: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded font-semibold"
      style={{
        background: `${MODULE_COLORS[moduleId] || "var(--soc-muted)"}18`,
        color: MODULE_COLORS[moduleId] || "var(--soc-muted)",
        border: `1px solid ${MODULE_COLORS[moduleId] || "var(--soc-muted)"}40`,
      }}
    >
      {MODULE_LABELS[moduleId] || moduleId.toUpperCase()}
    </span>
  );
}

/* ─────────────── component ─────────────── */

export default function EntitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pivotModule = searchParams.get("module") || "";
  const pivotType = searchParams.get("type") || "";
  const pivotValue = searchParams.get("value") || "";
  const initialSearch = searchParams.get("search") || pivotValue;

  const [query, setQuery] = useState(initialSearch);
  const [activeQuery, setActiveQuery] = useState(initialSearch);
  const [graphLoading, setGraphLoading] = useState(false);
  const [corrLoading, setCorrLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "correlations" | "graph" | "registry"
  >("correlations");

  const [graphData, setGraphData] = useState<any>({
    nodes: [],
    edges: [],
    node_count: 0,
    edge_count: 0,
  });

  const [corrData, setCorrData] = useState<{
    correlations: CrossModuleCorrelation[];
    correlation_count: number;
    entities_indexed: number;
    tasks_indexed: number;
  }>({
    correlations: [],
    correlation_count: 0,
    entities_indexed: 0,
    tasks_indexed: 0,
  });

  const { entities, loading, search, getCrossModule } = useEntityRegistry();

  /* ── derived data ── */
  const filteredCorrelations = useMemo(
    () => corrData.correlations.filter((c) => correlationMatches(c, activeQuery)),
    [corrData.correlations, activeQuery]
  );

  const filteredGraphData = useMemo(() => {
    const q = activeQuery.trim();
    if (!q) return graphData;

    const matchedNodeIds = new Set<string>();
    for (const n of graphData.nodes || []) {
      if (
        matchesQuery(n.id, q) ||
        matchesQuery(n.label, q) ||
        matchesQuery(n.type, q)
      )
        matchedNodeIds.add(n.id);
    }
    for (const e of graphData.edges || []) {
      if (
        matchesQuery(e.source, q) ||
        matchesQuery(e.target, q) ||
        matchesQuery(e.label, q)
      ) {
        matchedNodeIds.add(e.source);
        matchedNodeIds.add(e.target);
      }
    }
    // expand neighbors
    for (const e of graphData.edges || []) {
      if (matchedNodeIds.has(e.source) || matchedNodeIds.has(e.target)) {
        matchedNodeIds.add(e.source);
        matchedNodeIds.add(e.target);
      }
    }
    const nodes = (graphData.nodes || []).filter((n: any) =>
      matchedNodeIds.has(n.id)
    );
    const edges = (graphData.edges || []).filter(
      (e: any) =>
        matchedNodeIds.has(e.source) && matchedNodeIds.has(e.target)
    );
    return { ...graphData, nodes, edges, node_count: nodes.length, edge_count: edges.length };
  }, [graphData, activeQuery]);

  /* ── loaders ── */
  const loadGraph = async () => {
    setGraphLoading(true);
    try {
      const data = await intelligenceGraphApi.getGraph();
      setGraphData(data || { nodes: [], edges: [] });
    } catch (err) {
      console.error("Failed to load intelligence graph:", err);
    } finally {
      setGraphLoading(false);
    }
  };

  const loadCorrelations = async () => {
    setCorrLoading(true);
    try {
      const data = await correlationsApi.getCorrelations();
      setCorrData(
        data || { correlations: [], correlation_count: 0, entities_indexed: 0, tasks_indexed: 0 }
      );
    } catch (err) {
      console.error("Failed to load correlations:", err);
    } finally {
      setCorrLoading(false);
    }
  };

  const refreshAll = () => Promise.all([loadGraph(), loadCorrelations()]);

  useEffect(() => { refreshAll(); }, []);

  useEffect(() => {
    const urlSearch = searchParams.get("value") || searchParams.get("search") || "";
    if (urlSearch) { setQuery(urlSearch); setActiveQuery(urlSearch); search(urlSearch); }
  }, [searchParams]);

  /* ── handlers ── */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    setActiveQuery(clean);
    if (clean) { setSearchParams({ search: clean }); search(clean); }
    else { setSearchParams({}); }
  };

  const clearSearch = () => {
    setQuery("");
    setActiveQuery("");
    setSearchParams({});
  };

  const TAB_ITEMS = [
    { id: "correlations", label: "Cross-Module Correlations", icon: GitMerge, count: activeQuery ? filteredCorrelations.length : corrData.correlation_count },
    { id: "graph", label: "Intelligence Graph", icon: Network, count: filteredGraphData.node_count || 0 },
    { id: "registry", label: "Entity Registry", icon: Database, count: entities.length },
  ] as const;

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1
            className="text-lg font-bold tracking-wide"
            style={{ color: "var(--soc-text)" }}
          >
            Entity & Correlation Hub
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--soc-muted)" }}>
            Unified investigation view — cross-module correlations, entity
            graph, and registry across KOLKHOZ, DROPER, PIRAMIDA, SHADOW BET,
            TENGRAF
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={getCrossModule}
            className="text-xs px-3 py-1.5 rounded inline-flex items-center gap-1.5"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              color: "var(--soc-amber)",
            }}
          >
            <AlertTriangle size={11} />
            Cross-Module Only
          </button>

          <button
            onClick={refreshAll}
            disabled={graphLoading || corrLoading}
            className="text-xs px-3 py-1.5 rounded inline-flex items-center gap-1.5"
            style={{
              background: "var(--soc-surface-2)",
              border: "1px solid var(--soc-border)",
              color: "var(--soc-text)",
              opacity: graphLoading || corrLoading ? 0.6 : 1,
            }}
          >
            <RefreshCcw
              size={11}
              className={graphLoading || corrLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Entity Pivot Banner ── */}
      {pivotValue && (
        <div
          className="mb-5 p-4 rounded"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(15,23,42,0.45))",
            border: "1px solid rgba(59,130,246,0.28)",
          }}
        >
          <p
            className="text-xs uppercase font-semibold mb-1"
            style={{ color: "var(--soc-accent)" }}
          >
            Entity Pivot Investigation
          </p>
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--soc-text)" }}
          >
            {pivotValue}
          </h2>
          <p className="text-xs mt-1" style={{ color: "var(--soc-muted)" }}>
            Module:{" "}
            {pivotModule ? MODULE_LABELS[pivotModule] || pivotModule : "unknown"} ·
            Entity type: {pivotType || "entity"} · Showing connected graph
            nodes, correlations, and registry matches.
          </p>
        </div>
      )}

      {/* ── Search ── */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--soc-muted)" }}
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveQuery(e.target.value);
            }}
            placeholder="Search wallets, domains, Telegram channels, platforms, banks…"
            className="w-full pl-8 pr-3 py-2 rounded text-sm"
            style={{
              background: "var(--soc-surface)",
              border: "1px solid var(--soc-border)",
              color: "var(--soc-text)",
            }}
          />
        </div>

        {activeQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="px-3 py-2 rounded"
            style={{
              background: "var(--soc-surface-2)",
              border: "1px solid var(--soc-border)",
              color: "var(--soc-muted)",
            }}
          >
            <X size={14} />
          </button>
        )}

        <button
          type="submit"
          className="px-4 py-2 rounded text-xs font-semibold"
          style={{ background: "var(--soc-accent)", color: "white" }}
        >
          Search
        </button>
      </form>

      {activeQuery && (
        <div
          className="mb-4 px-3 py-2 rounded text-xs flex items-center gap-2"
          style={{
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.25)",
            color: "var(--soc-muted)",
          }}
        >
          <Search size={11} style={{ color: "#60a5fa" }} />
          Filtering by:{" "}
          <span style={{ color: "var(--soc-text)", fontWeight: 600 }}>
            {activeQuery}
          </span>
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Correlations",
            value: activeQuery
              ? filteredCorrelations.length
              : corrData.correlation_count || 0,
            accent: true,
          },
          { label: "Entities Indexed", value: corrData.entities_indexed || 0 },
          {
            label: "Graph Nodes",
            value: filteredGraphData.node_count || 0,
          },
          { label: "Graph Edges", value: filteredGraphData.edge_count || 0 },
        ].map((item) => (
          <div key={item.label} className="card">
            <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
              {item.label}
            </p>
            <p
              className="text-xl font-bold mt-1"
              style={{
                color: item.accent ? "var(--soc-accent)" : "var(--soc-text)",
              }}
            >
              {String(item.value)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex gap-1 mb-5 p-1 rounded"
        style={{ background: "var(--soc-surface-2)", border: "1px solid var(--soc-border)" }}
      >
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-medium transition-colors"
              style={{
                background: active ? "var(--soc-accent)" : "transparent",
                color: active ? "white" : "var(--soc-muted)",
              }}
            >
              <Icon size={12} />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{
                    background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                    color: active ? "white" : "var(--soc-text)",
                    minWidth: 20,
                    textAlign: "center",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Cross-Module Correlations ── */}
      {activeTab === "correlations" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
              Entities detected by two or more modules, ranked by confidence
              and risk.
            </p>
          </div>

          {corrLoading ? (
            <div className="card text-center py-8">
              <p style={{ color: "var(--soc-muted)" }} className="text-sm">
                Loading cross-module correlations…
              </p>
            </div>
          ) : filteredCorrelations.length === 0 ? (
            <div className="card text-center py-8">
              <GitMerge
                size={32}
                className="mx-auto mb-3"
                style={{ color: "var(--soc-border)" }}
              />
              <p className="text-sm" style={{ color: "var(--soc-muted)" }}>
                {activeQuery
                  ? "No correlations match this search."
                  : "No cross-module correlations found. Run at least two modules to generate correlations."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCorrelations.slice(0, 12).map((c, idx) => (
                <div
                  key={`${c.entity_type}:${c.normalized_value}:${idx}`}
                  className="card"
                >
                  {/* Entity header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Link2
                          size={13}
                          style={{ color: "var(--soc-accent)", flexShrink: 0 }}
                        />
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--soc-text)" }}
                        >
                          {c.entity_value}
                        </p>
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: "rgba(245,158,11,0.1)",
                            color: "var(--soc-amber)",
                          }}
                        >
                          {c.entity_type}
                        </span>
                      </div>

                      {(c as any).correlation_label && (
                        <p
                          className="text-xs"
                          style={{ color: "var(--soc-accent)" }}
                        >
                          {(c as any).correlation_label}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <RiskScoreBadge score={c.risk_score} size="sm" />
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--soc-muted)" }}
                      >
                        {c.confidence}% confidence
                      </p>
                    </div>
                  </div>

                  {/* Module pills */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(c.modules || []).map((mod) => (
                      <ModulePill key={mod} moduleId={mod} />
                    ))}
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "var(--soc-surface-2)",
                        border: "1px solid var(--soc-border)",
                        color: "var(--soc-muted)",
                      }}
                    >
                      {c.evidence_count} evidence items
                    </span>
                  </div>

                  {/* Analyst summary */}
                  {(c as any).analyst_summary && (
                    <p
                      className="text-xs mb-3 leading-relaxed"
                      style={{ color: "var(--soc-muted)" }}
                    >
                      {(c as any).analyst_summary}
                    </p>
                  )}

                  {/* Evidence list */}
                  <div className="space-y-1 mb-3">
                    {c.evidence.slice(0, 3).map((ev, i) => (
                      <p
                        key={i}
                        className="text-xs"
                        style={{ color: "var(--soc-muted)" }}
                      >
                        <span
                          style={{
                            color:
                              MODULE_COLORS[ev.module_id] ||
                              "var(--soc-text)",
                          }}
                        >
                          {MODULE_LABELS[ev.module_id] || ev.module_id}
                        </span>
                        : {ev.title} — {ev.risk_score}/100
                      </p>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Link
                      to={getCorrelationPath(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                      style={{
                        background: "rgba(59,130,246,0.15)",
                        color: "#60a5fa",
                        border: "1px solid rgba(59,130,246,0.35)",
                      }}
                    >
                      <ExternalLink size={11} />
                      Investigate
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Intelligence Graph ── */}
      {activeTab === "graph" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
              Connections between modules, findings, Telegram channels,
              wallets, domains, banks, platforms, and evidence sources.
            </p>
          </div>

          <div className="card">
            {graphLoading ? (
              <div className="text-center py-12">
                <RefreshCcw
                  size={24}
                  className="animate-spin mx-auto mb-3"
                  style={{ color: "var(--soc-muted)" }}
                />
                <p className="text-sm" style={{ color: "var(--soc-muted)" }}>
                  Loading intelligence graph…
                </p>
              </div>
            ) : filteredGraphData.nodes?.length > 0 ? (
              <UnifiedIntelligenceGraph
                nodes={filteredGraphData.nodes || []}
                edges={filteredGraphData.edges || []}
                height={540}
              />
            ) : (
              <div className="text-center py-12">
                <Network
                  size={32}
                  className="mx-auto mb-3"
                  style={{ color: "var(--soc-border)" }}
                />
                <p className="text-sm" style={{ color: "var(--soc-muted)" }}>
                  {activeQuery
                    ? "No graph nodes match this search."
                    : "No graph data available. Run modules to populate the intelligence graph."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Entity Registry ── */}
      {activeTab === "registry" && (
        <div>
          <div className="mb-3">
            <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
              Shared entities detected across modules — Telegram handles,
              wallets, domains, banks, phones, and platforms.
            </p>
          </div>

          {loading ? (
            <div className="card text-center py-8">
              <p className="text-sm" style={{ color: "var(--soc-muted)" }}>
                Searching entity registry…
              </p>
            </div>
          ) : entities.length > 0 ? (
            <div className="space-y-2">
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  className="card flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <EntityTag entity={entity} />
                      {entity.source_modules.length > 1 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: "rgba(245,158,11,0.1)",
                            color: "var(--soc-amber)",
                          }}
                        >
                          Cross-Module
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {entity.source_modules.map((mod) => (
                        <ModulePill key={mod} moduleId={mod} />
                      ))}
                      <span
                        className="text-xs"
                        style={{ color: "var(--soc-muted)" }}
                      >
                        Risk {entity.risk_score}/100
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RiskScoreBadge score={entity.risk_score} size="sm" />
                    <Link
                      to={getEntityPath(entity)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                      style={{
                        background: "rgba(59,130,246,0.15)",
                        color: "#60a5fa",
                        border: "1px solid rgba(59,130,246,0.35)",
                      }}
                    >
                      <ExternalLink size={11} />
                      Investigate
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : activeQuery ? (
            <div className="card text-center py-8">
              <Database
                size={32}
                className="mx-auto mb-3"
                style={{ color: "var(--soc-border)" }}
              />
              <p className="text-sm" style={{ color: "var(--soc-muted)" }}>
                No registry entities match "{activeQuery}".
              </p>
            </div>
          ) : (
            <div className="card text-center py-8">
              <Database
                size={32}
                className="mx-auto mb-3"
                style={{ color: "var(--soc-border)" }}
              />
              <p className="text-sm" style={{ color: "var(--soc-muted)" }}>
                Search for an entity to browse the registry.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
