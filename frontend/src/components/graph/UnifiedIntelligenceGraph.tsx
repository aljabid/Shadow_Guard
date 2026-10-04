import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type cytoscape from "cytoscape";
import { Search, X, ExternalLink, ShieldAlert } from "lucide-react";
import { GraphNode, GraphEdge } from "@/api/intelligenceGraph.api";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  height?: number;
}

function nodeColor(type: string) {
  switch (type) {
    case "module":
      return "#38bdf8";
    case "finding":
      return "#e94560";
    case "telegram":
      return "#60a5fa";
    case "wallet":
      return "#f97316";
    case "domain":
      return "#a78bfa";
    case "phone":
      return "#22c55e";
    case "bank":
      return "#eab308";
    case "platform":
      return "#f43f5e";
    case "source":
      return "#94a3b8";
    default:
      return "#64748b";
  }
}

function safeText(value: any): string {
  return String(value || "").trim();
}

function isClickableUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function normalizeUrl(value: string): string {
  const clean = safeText(value);

  if (!clean) return "";

  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  if (clean.startsWith("@")) {
    return `https://t.me/${clean.slice(1)}`;
  }

  if (clean.includes("t.me/")) {
    return clean.startsWith("http") ? clean : `https://${clean}`;
  }

  if (clean.includes(".") && !clean.startsWith("darknet://")) {
    return `https://${clean}`;
  }

  return clean;
}

function riskLevel(score: number): string {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export default function UnifiedIntelligenceGraph({
  nodes,
  edges,
  height = 520,
}: Props) {
  const navigate = useNavigate();

  const graphRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedConnections = useMemo(() => {
    if (!selectedNode) return [];

    const selectedId = selectedNode.id;

    return edges
      .filter((edge: any) => edge.source === selectedId || edge.target === selectedId)
      .slice(0, 12);
  }, [selectedNode, edges]);

  const selectedEvidenceUrl = selectedNode
    ? normalizeUrl(
        selectedNode.source_url ||
          selectedNode.url ||
          selectedNode.link ||
          selectedNode.label
      )
    : "";

  function focusNode(nodeId: string) {
    const cy = cyRef.current;
    if (!cy) return;

    const node = cy.getElementById(nodeId);

    if (!node || node.empty()) return;

    cy.elements().removeClass("selected faded connected");

    cy.elements().addClass("faded");
    node.removeClass("faded").addClass("selected");

    const neighborhood = node.closedNeighborhood();
    neighborhood.removeClass("faded").addClass("connected");

    cy.animate({
      fit: {
        eles: neighborhood,
        padding: 80,
      },
      duration: 400,
    });
  }

  function resetGraphView() {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("selected faded connected");
    setSelectedNode(null);

    cy.animate({
      fit: {
        eles: cy.elements(),
        padding: 40,
      },
      duration: 300,
    });
  }

  function runSearch() {
    const query = searchQuery.trim().toLowerCase();
    const cy = cyRef.current;

    if (!query || !cy) return;

    const match = nodes.find((node: any) => {
      const label = safeText(node.label).toLowerCase();
      const id = safeText(node.id).toLowerCase();
      const type = safeText(node.type).toLowerCase();

      return label.includes(query) || id.includes(query) || type.includes(query);
    });

    if (!match) return;

    setSelectedNode(match);
    focusNode(match.id);
  }

  useEffect(() => {
    if (!graphRef.current || !nodes.length) return;

    let mounted = true;

    import("cytoscape").then((mod) => {
      if (!mounted || !graphRef.current) return;

      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }

      const cytoscapeFactory = mod.default;

      cyRef.current = cytoscapeFactory({
        container: graphRef.current,
        elements: [
          ...nodes.map((node: any) => ({
            data: {
              ...node,
              id: node.id,
              label: node.label,
              type: node.type,
              risk_score: Number(node.risk_score || 0),
            },
          })),
          ...edges.map((edge: any, index) => ({
            data: {
              ...edge,
              id: edge.id || `${edge.source}-${edge.target}-${index}`,
              source: edge.source,
              target: edge.target,
              label: edge.label || "",
            },
          })),
        ],
        style: [
          {
            selector: "node",
            style: {
              "background-color": (ele: any) => nodeColor(ele.data("type")),
              label: "data(label)",
              color: "#e5e7eb",
              "font-size": 8,
              "text-wrap": "wrap",
              "text-max-width": "90px",
              "text-valign": "bottom",
              "text-halign": "center",
              "border-width": 1,
              "border-color": "#020617",
              width: (ele: any) =>
                Math.max(18, Math.min(46, 18 + ele.data("risk_score") / 4)),
              height: (ele: any) =>
                Math.max(18, Math.min(46, 18 + ele.data("risk_score") / 4)),
              "transition-property": "opacity, border-width, border-color",
              "transition-duration": 150,
            },
          },
          {
            selector: "node[type = 'module']",
            style: {
              shape: "round-rectangle",
              width: 70,
              height: 32,
              "font-size": 10,
              "font-weight": "bold",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1,
              "line-color": "#334155",
              "target-arrow-color": "#334155",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              label: "data(label)",
              "font-size": 6,
              color: "#94a3b8",
              opacity: 0.75,
            },
          },
          {
            selector: ".selected",
            style: {
              "border-width": 4,
              "border-color": "#ffffff",
              "z-index": 999,
            },
          },
          {
            selector: ".connected",
            style: {
              opacity: 1,
              "line-color": "#60a5fa",
              "target-arrow-color": "#60a5fa",
            },
          },
          {
            selector: ".faded",
            style: {
              opacity: 0.15,
            },
          },
        ],
        layout: {
          name: "cose",
          animate: false,
          fit: true,
          padding: 40,
          nodeRepulsion: 9000,
          idealEdgeLength: 110,
        } as any,
      });

      cyRef.current.on("tap", "node", (event) => {
        const node = event.target;
        const data = node.data();

        setSelectedNode(data);
        focusNode(data.id);
      });

      cyRef.current.on("tap", (event) => {
        if (event.target === cyRef.current) {
          resetGraphView();
        }
      });
    });

    return () => {
      mounted = false;

      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [nodes, edges]);

  function handleInvestigateSelectedNode() {
    if (!selectedNode) return;

    const label = String(selectedNode.label || selectedNode.id || "").toLowerCase();
    const type = String(selectedNode.type || "").toLowerCase();

    if (type === "finding") {
      const moduleName =
        label.includes("raks") || label.includes("exchange")
          ? "kolkhoz"
          : label.includes("bet") || label.includes("1win") || label.includes("mostbet")
          ? "shadowbet"
          : label.includes("drop")
          ? "droper"
          : label.includes("invest") || label.includes("capital")
          ? "piramida"
          : "tengraf";

      navigate(`/investigation/${moduleName}/0`);
      return;
    }

    if (type === "telegram" || type === "domain" || type === "source" || type === "platform") {
      const query = encodeURIComponent(selectedNode.label || selectedNode.id || "");
      navigate(`/entities?search=${query}`);
      return;
    }

    navigate("/entities");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          ["Module", "module"],
          ["Finding", "finding"],
          ["Telegram", "telegram"],
          ["Wallet", "wallet"],
          ["Domain", "domain"],
          ["Bank", "bank"],
          ["Platform", "platform"],
          ["Source", "source"],
        ].map(([label, type]) => (
          <div
            key={type}
            className="text-xs px-2 py-1 rounded flex items-center gap-2"
            style={{
              background: "var(--soc-surface-2)",
              color: "var(--soc-muted)",
              border: "1px solid var(--soc-border)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: nodeColor(type),
                display: "inline-block",
              }}
            />
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-3">
        <div
          ref={graphRef}
          style={{
            height,
            background: "var(--soc-surface-2)",
            borderRadius: 8,
            border: "1px solid var(--soc-border)",
          }}
        />

        <div
          className="card"
          style={{
            minHeight: height,
            display: selectedNode ? "block" : "flex",
            alignItems: selectedNode ? "stretch" : "center",
            justifyContent: selectedNode ? "flex-start" : "center",
          }}
        >
          {!selectedNode ? (
            <div className="text-center">
              <ShieldAlert
                size={24}
                className="mx-auto mb-2"
                style={{ color: "var(--soc-muted)" }}
              />
              <p className="text-sm font-semibold" style={{ color: "var(--soc-text)" }}>
                Select a graph node
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--soc-muted)" }}>
                Click any Telegram, domain, wallet, platform, source, or finding
                to inspect its intelligence context.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p
                    className="text-xs uppercase mb-1"
                    style={{ color: "var(--soc-muted)" }}
                  >
                    Selected {selectedNode.type || "entity"}
                  </p>

                  <h3
                    className="text-sm font-bold break-words"
                    style={{ color: "var(--soc-text)" }}
                  >
                    {selectedNode.label || selectedNode.id}
                  </h3>
                </div>

                <button
                  onClick={resetGraphView}
                  className="p-1 rounded"
                  style={{
                    background: "var(--soc-surface-2)",
                    border: "1px solid var(--soc-border)",
                    color: "var(--soc-muted)",
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div
                  className="p-2 rounded"
                  style={{
                    background: "var(--soc-surface-2)",
                    border: "1px solid var(--soc-border)",
                  }}
                >
                  <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
                    Type
                  </p>
                  <p className="text-xs font-semibold uppercase" style={{ color: nodeColor(selectedNode.type) }}>
                    {selectedNode.type || "unknown"}
                  </p>
                </div>

                <div
                  className="p-2 rounded"
                  style={{
                    background: "var(--soc-surface-2)",
                    border: "1px solid var(--soc-border)",
                  }}
                >
                  <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
                    Risk
                  </p>
                  <p className="text-xs font-semibold" style={{ color: "var(--soc-accent)" }}>
                    {Number(selectedNode.risk_score || 0)}/100{" "}
                    {riskLevel(Number(selectedNode.risk_score || 0))}
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--soc-text)" }}>
                  Connected Evidence
                </p>

                {selectedConnections.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
                    No direct graph connections found.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {selectedConnections.map((edge: any, idx: number) => {
                      const otherId =
                        edge.source === selectedNode.id ? edge.target : edge.source;

                      const otherNode = nodes.find((n: any) => n.id === otherId);

                      return (
                        <div
                          key={idx}
                          className="text-xs p-2 rounded"
                          style={{
                            background: "var(--soc-surface-2)",
                            border: "1px solid var(--soc-border)",
                            color: "var(--soc-muted)",
                          }}
                        >
                          <span style={{ color: "var(--soc-text)" }}>
                            {edge.label || "connected_to"}
                          </span>{" "}
                          → {otherNode?.label || otherId}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedEvidenceUrl && (
                <div className="flex flex-wrap gap-2">
                  {isClickableUrl(selectedEvidenceUrl) ? (
                    <a
                      href={selectedEvidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs underline"
                      style={{ color: "var(--soc-accent)" }}
                    >
                      Open Source
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        color: "var(--soc-amber)",
                        border: "1px solid rgba(245,158,11,0.25)",
                      }}
                    >
                      Evidence: {selectedEvidenceUrl}
                    </span>
                  )}

                  <button
                    onClick={handleInvestigateSelectedNode}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{
                      background: "rgba(59,130,246,0.15)",
                      color: "#60a5fa",
                      border: "1px solid rgba(59,130,246,0.35)",
                      cursor: "pointer",
                    }}
                  >
                    Investigate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
          placeholder="Search wallets, domains, channels..."
          className="w-full px-3 py-2 rounded text-sm"
          style={{
            background: "var(--soc-surface-2)",
            border: "1px solid var(--soc-border)",
            color: "var(--soc-text)",
          }}
        />

        <button
          onClick={runSearch}
          className="px-4 rounded inline-flex items-center justify-center"
          style={{
            background: "var(--soc-accent)",
            color: "white",
          }}
        >
          <Search size={16} />
        </button>
      </div>
    </div>
  );
}