import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  Phone,
  Globe,
  Wallet,
  MapPin,
  MessageCircle,
  PackageSearch,
  ShieldAlert,
  Link2,
  X,
} from "lucide-react";

interface Props {
  nodes?: any[];
  edges?: any[];
}

function getNodeIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "wallet":
      return <Wallet size={14} />;
    case "phone":
      return <Phone size={14} />;
    case "telegram":
      return <MessageCircle size={14} />;
    case "location":
      return <MapPin size={14} />;
    case "finding":
      return <ShieldAlert size={14} />;
    case "category":
      return <PackageSearch size={14} />;
    case "domain":
      return <Globe size={14} />;
    default:
      return <Globe size={14} />;
  }
}

function getNodeColor(type: string) {
  switch (type?.toLowerCase()) {
    case "finding":
      return "#ef4444";
    case "category":
      return "#a855f7";
    case "wallet":
      return "#10b981";
    case "phone":
      return "#f59e0b";
    case "telegram":
      return "#3b82f6";
    case "location":
      return "#8b5cf6";
    case "domain":
      return "#06b6d4";
    case "substance":
      return "#fb7185";
    case "brand":
      return "#22c55e";
    default:
      return "#94a3b8";
  }
}

function getNodeTier(type: string) {
  const t = type?.toLowerCase();

  if (t === "finding") return 1;
  if (t === "category") return 2;
  return 3;
}

function buildConnections(nodes: any[], edges: any[]) {
  const map: Record<string, number> = {};

  nodes.forEach((node) => {
    map[node.id] = 0;
  });

  edges.forEach((edge) => {
    const source = edge.source || edge.from;
    const target = edge.target || edge.to;

    if (source) map[source] = (map[source] || 0) + 1;
    if (target) map[target] = (map[target] || 0) + 1;
  });

  return map;
}

export default function ContrabandGraph({ nodes = [], edges = [] }: Props) {
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const connectionCounts = useMemo(
    () => buildConnections(nodes, edges),
    [nodes, edges]
  );

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;

  const nodeTypes = useMemo(() => {
    return Array.from(new Set(nodes.map((node) => node.type || "entity")));
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    return nodes
      .filter((node) => filterType === "all" || node.type === filterType)
      .sort((a, b) => {
        const tierA = getNodeTier(a.type);
        const tierB = getNodeTier(b.type);

        if (tierA !== tierB) return tierA - tierB;

        return (
          (connectionCounts[b.id] || 0) -
          (connectionCounts[a.id] || 0)
        );
      });
  }, [nodes, filterType, connectionCounts]);

  const selectedEdges = useMemo(() => {
    if (!selectedNodeId) return edges.slice(0, 8);

    return edges.filter(
      (edge) =>
        (edge.source || edge.from) === selectedNodeId ||
        (edge.target || edge.to) === selectedNodeId
    );
  }, [edges, selectedNodeId]);

  const networkRisk =
    nodes.length > 35 ? "CRITICAL" : nodes.length > 20 ? "HIGH" : nodes.length > 10 ? "MED" : "LOW";

  const openNodeInvestigation = (node: any) => {
    if (!node) return;

    if (node.type === "finding") {
      const index = String(node.id || "").replace("finding_", "");
      navigate(`/investigation/contraband/${index}`);
      return;
    }

    navigate(
      `/entities?module=contraband&type=${encodeURIComponent(
        node.type || "entity"
      )}&value=${encodeURIComponent(node.label || node.id)}`
    );
  };

  return (
    <div className="card" style={{ minHeight: 520 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network size={16} style={{ color: "var(--soc-accent)" }} />

          <h3
            className="text-xs font-semibold uppercase"
            style={{ color: "var(--soc-text)" }}
          >
            Interactive Entity Graph
          </h3>
        </div>

        {selectedNode && (
          <button
            onClick={() => setSelectedNodeId(null)}
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: "var(--soc-muted)" }}
          >
            <X size={12} />
            Clear node
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
            Nodes
          </p>
          <p className="text-lg font-bold" style={{ color: "var(--soc-text)" }}>
            {nodes.length}
          </p>
        </div>

        <div className="rounded p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
            Relationships
          </p>
          <p className="text-lg font-bold" style={{ color: "var(--soc-text)" }}>
            {edges.length}
          </p>
        </div>

        <div className="rounded p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
            Network Risk
          </p>
          <p
            className="text-lg font-bold"
            style={{
              color:
                networkRisk === "CRITICAL" || networkRisk === "HIGH"
                  ? "var(--soc-red)"
                  : "var(--soc-amber)",
            }}
          >
            {networkRisk}
          </p>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded"
          style={{
            height: 320,
            border: "1px dashed var(--soc-border)",
          }}
        >
          <Network size={40} style={{ color: "var(--soc-muted)", opacity: 0.5 }} />

          <p className="mt-3 text-sm" style={{ color: "var(--soc-muted)" }}>
            No graph data available
          </p>

          <p className="text-xs mt-1" style={{ color: "var(--soc-muted)" }}>
            Run a CONTRABAND-KZ scan to build entity relationships.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType("all")}
              className="px-2 py-1 rounded text-xs"
              style={{
                background:
                  filterType === "all"
                    ? "rgba(59,130,246,0.18)"
                    : "var(--soc-surface-2)",
                color:
                  filterType === "all"
                    ? "var(--soc-accent)"
                    : "var(--soc-muted)",
                border:
                  filterType === "all"
                    ? "1px solid var(--soc-accent)"
                    : "1px solid var(--soc-border)",
              }}
            >
              All
            </button>

            {nodeTypes.map((type) => {
              const active = filterType === type;
              const color = getNodeColor(type);

              return (
                <button
                  key={type}
                  onClick={() => setFilterType(active ? "all" : type)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs capitalize"
                  style={{
                    background: active ? `${color}22` : "var(--soc-surface-2)",
                    color: active ? color : "var(--soc-muted)",
                    border: active
                      ? `1px solid ${color}`
                      : "1px solid var(--soc-border)",
                  }}
                >
                  {getNodeIcon(type)}
                  {type}
                </button>
              );
            })}
          </div>

          <div
            className="rounded p-4"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 35%), linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.62))",
              border: "1px solid var(--soc-border)",
            }}
          >
            <div className="grid grid-cols-3 gap-3">
              {filteredNodes.slice(0, 36).map((node) => {
                const color = getNodeColor(node.type);
                const active = selectedNodeId === node.id;
                const connections = connectionCounts[node.id] || 0;

                return (
                  <button
                    key={node.id}
                    onClick={() => { setSelectedNodeId(active ? null : node.id); }}
                    onDoubleClick={() => openNodeInvestigation(node)}
                    title={`Click to select · Double-click to investigate ${node.label || node.id}`}
                    className="rounded p-3 text-left transition-all hover:scale-[1.02]"
                    style={{
                      border: active
                        ? `1px solid ${color}`
                        : `1px solid ${color}33`,
                      background: active ? `${color}24` : `${color}12`,
                      boxShadow: active ? `0 0 0 1px ${color}55` : "none",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center rounded"
                        style={{
                          width: 28,
                          height: 28,
                          background: `${color}22`,
                          color,
                        }}
                      >
                        {getNodeIcon(node.type)}
                      </div>

                      <div className="min-w-0">
                        <p
                          className="text-xs font-semibold truncate"
                          style={{ color: "var(--soc-text)" }}
                        >
                          {node.label || node.value || node.id}
                        </p>

                        <p className="text-[11px]" style={{ color }}>
                          {node.type || "entity"} · {connections} links
                        </p>
                      </div>
                    </div>

                    {node.risk_score ? (
                      <p className="text-[11px] mt-1" style={{ color }}>
                        Risk: {node.risk_score}/100
                      </p>
                    ) : null}
                    <div
                      onClick={(e) => { e.stopPropagation(); openNodeInvestigation(node); }}
                      className="mt-1.5 text-[10px] font-semibold flex items-center gap-1"
                      style={{ color, opacity: 0.75 }}>
                      <Link2 size={9} /> Investigate
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredNodes.length > 36 && (
              <p
                className="text-xs mt-3 text-center"
                style={{ color: "var(--soc-muted)" }}
              >
                Showing first 36 of {filteredNodes.length} nodes. Use filters to narrow the graph.
              </p>
            )}
          </div>

          {selectedNode && (
            <div
              className="rounded p-4"
              style={{
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.22)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p
                    className="text-xs uppercase font-semibold"
                    style={{ color: getNodeColor(selectedNode.type) }}
                  >
                    Selected Node
                  </p>

                  <h4
                    className="text-sm font-bold"
                    style={{ color: "var(--soc-text)" }}
                  >
                    {selectedNode.label || selectedNode.id}
                  </h4>
                </div>

                <span
                  className="px-2 py-1 rounded text-xs capitalize"
                  style={{
                    background: `${getNodeColor(selectedNode.type)}22`,
                    color: getNodeColor(selectedNode.type),
                  }}
                >
                  {selectedNode.type || "entity"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
                    Node ID
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--soc-text)" }}>
                    {selectedNode.id}
                  </p>
                </div>

                <div>
                  <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
                    Risk
                  </p>
                  <p className="text-xs" style={{ color: "var(--soc-text)" }}>
                    {selectedNode.risk_score || 0}/100
                  </p>
                </div>

                <div>
                  <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
                    Links
                  </p>
                  <p className="text-xs" style={{ color: "var(--soc-text)" }}>
                    {connectionCounts[selectedNode.id] || 0}
                  </p>
                </div>
              </div>

              <button
                onClick={() => openNodeInvestigation(selectedNode)}
                className="mt-4 px-3 py-1.5 rounded text-xs font-semibold"
                style={{
                  background: "rgba(59,130,246,0.16)",
                  border: "1px solid rgba(59,130,246,0.35)",
                  color: "var(--soc-accent)",
                }}
              >
                {selectedNode.type === "finding"
                  ? "Open Finding Investigation"
                  : "Open Entity Pivot"}
              </button>
            </div>
          )}

          {selectedEdges.length > 0 && (
            <div className="rounded p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p
                className="text-xs font-semibold mb-2 flex items-center gap-1"
                style={{ color: "var(--soc-text)" }}
              >
                <Link2 size={12} />
                {selectedNode ? "Selected Node Relationships" : "Relationship Samples"}
              </p>

              <div className="space-y-2">
                {selectedEdges.slice(0, 12).map((edge, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs"
                  >
                    <span className="truncate" style={{ color: "var(--soc-muted)" }}>
                      {edge.source || edge.from}
                    </span>

                    <span style={{ color: "var(--soc-accent)" }}>→</span>

                    <span className="truncate" style={{ color: "var(--soc-muted)" }}>
                      {edge.target || edge.to}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}