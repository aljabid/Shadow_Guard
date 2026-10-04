import { useState } from "react";
import { Wallet, Link, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useModulesStore } from "@/store";
import { useModuleTask } from "@/hooks/useModuleTask";

const CHAIN_COLOR: Record<string, string> = {
  TRON: "#ef4444", ETH: "#6366f1", BTC: "#f59e0b", UNKNOWN: "#6b7280",
};

type WalletResult = {
  address: string; chain: string; is_dirty: boolean; cluster_label?: string;
  balance_usd: number; tx_count_7d: number; outflow_ratio: number;
  p2p_bridge_detected: boolean; kz_payment_detected: boolean;
  flags: string[]; risk_score: number; risk_level: string;
};
type Cluster = {
  cluster_id: string; member_count: number; addresses: string[];
  max_risk_score: number; chains: string[]; has_dirty_member: boolean; cluster_risk: string;
};
type WalletIntel = {
  wallet_results?: WalletResult[]; clusters?: Cluster[];
  wallets_analyzed?: number; dirty_wallets?: number;
  high_risk_wallets?: number; p2p_bridges?: number;
};

const DEMO_INTEL: WalletIntel = {
  wallets_analyzed: 14, dirty_wallets: 6, high_risk_wallets: 9, p2p_bridges: 4,
  wallet_results: [
    { address: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE", chain: "TRON", is_dirty: true,
      cluster_label: "kz_cards_shop", balance_usd: 487200, tx_count_7d: 312,
      outflow_ratio: 8.4, p2p_bridge_detected: true, kz_payment_detected: true,
      flags: ["known_dirty", "high_volume", "p2p_bridge", "kaspi_memo"], risk_score: 97, risk_level: "critical" },
    { address: "TJCnKsPa7y5okkXvQAidZijX6TaQe7dWTd", chain: "TRON", is_dirty: true,
      cluster_label: "kz_dropper_network", balance_usd: 192400, tx_count_7d: 187,
      outflow_ratio: 6.1, p2p_bridge_detected: true, kz_payment_detected: true,
      flags: ["known_dirty", "dropper_network", "p2p_bridge"], risk_score: 92, risk_level: "critical" },
    { address: "0x4e9ce36e442e55ecd9025b9a6e0d88485d628a9", chain: "ETH", is_dirty: true,
      cluster_label: "afsa_flagged_exchange", balance_usd: 1340000, tx_count_7d: 89,
      outflow_ratio: 4.2, p2p_bridge_detected: false, kz_payment_detected: false,
      flags: ["afsa_flagged", "high_balance", "high_volume"], risk_score: 87, risk_level: "critical" },
    { address: "TAzsQ9Gx8eqFNFSKbeXrbi45CuVPHzA8aq", chain: "TRON", is_dirty: true,
      cluster_label: "kz_pyramid_scheme", balance_usd: 67800, tx_count_7d: 54,
      outflow_ratio: 3.8, p2p_bridge_detected: false, kz_payment_detected: true,
      flags: ["known_dirty", "pyramid_scheme", "kaspi_memo"], risk_score: 83, risk_level: "critical" },
    { address: "TNaRAoLUyYEV2uF7GsKTxFbBpBKqmAkHJo", chain: "TRON", is_dirty: true,
      cluster_label: "kz_betting_payment", balance_usd: 234100, tx_count_7d: 276,
      outflow_ratio: 9.1, p2p_bridge_detected: true, kz_payment_detected: true,
      flags: ["known_dirty", "betting_payment", "high_volume"], risk_score: 91, risk_level: "critical" },
    { address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf", chain: "BTC", is_dirty: true,
      cluster_label: "flagged_exchange", balance_usd: 2100000, tx_count_7d: 14,
      outflow_ratio: 1.2, p2p_bridge_detected: false, kz_payment_detected: false,
      flags: ["known_dirty", "flagged_exchange"], risk_score: 72, risk_level: "high" },
    { address: "TGzc87vEBKgHPDfSsRjQ7e5Kw2dNqXsYHA", chain: "TRON", is_dirty: false,
      cluster_label: undefined, balance_usd: 18400, tx_count_7d: 43,
      outflow_ratio: 2.1, p2p_bridge_detected: true, kz_payment_detected: true,
      flags: ["p2p_bridge", "kaspi_memo"], risk_score: 58, risk_level: "medium" },
    { address: "0x00000000219ab540356cbb839cbe05303d7705fa", chain: "ETH", is_dirty: true,
      cluster_label: "eth2_deposit_launder", balance_usd: 890000, tx_count_7d: 3,
      outflow_ratio: 0.3, p2p_bridge_detected: false, kz_payment_detected: false,
      flags: ["known_dirty", "high_balance"], risk_score: 65, risk_level: "high" },
  ],
  clusters: [
    { cluster_id: "KZ-DROPPER-CLUSTER-001", member_count: 3,
      addresses: ["TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE","TJCnKsPa7y5okkXvQAidZijX6TaQe7dWTd","TGzc87vEBKgHPDfSsRjQ7e5Kw2dNqXsYHA"],
      max_risk_score: 97, chains: ["TRON"], has_dirty_member: true, cluster_risk: "critical" },
    { cluster_id: "KZ-BETTING-CLUSTER-002", member_count: 2,
      addresses: ["TNaRAoLUyYEV2uF7GsKTxFbBpBKqmAkHJo","TAzsQ9Gx8eqFNFSKbeXrbi45CuVPHzA8aq"],
      max_risk_score: 91, chains: ["TRON"], has_dirty_member: true, cluster_risk: "critical" },
    { cluster_id: "ETH-LAUNDER-CLUSTER-003", member_count: 2,
      addresses: ["0x4e9ce36e442e55ecd9025b9a6e0d88485d628a9","0x00000000219ab540356cbb839cbe05303d7705fa"],
      max_risk_score: 87, chains: ["ETH"], has_dirty_member: true, cluster_risk: "critical" },
  ],
};

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#6b7280",
  };
  const c = colors[level] || "#6b7280";
  return (
    <span style={{ background: `${c}22`, color: c, border: `1px solid ${c}44`,
      padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>
      {level}
    </span>
  );
}

export default function WalletTrackerPage() {
  const navigate = useNavigate();
  const kolkhozResult = useModulesStore((s) => s.resultsByModule["kolkhoz"]);
  const isRunning = useModulesStore((s) => !!s.runningModules["kolkhoz"]);
  const { run } = useModuleTask("kolkhoz");
  const [manualAddr, setManualAddr] = useState("");
  const [scanMode, setScanMode] = useState<"demo" | "live">(() => {
    try { return (localStorage.getItem("sm_kolkhoz") as "demo" | "live") || "demo"; } catch { return "demo"; }
  });
  const handleScanModeChange = (mode: "demo" | "live") => {
    setScanMode(mode); try { localStorage.setItem("sm_kolkhoz", mode); } catch {}
  };

  const rawIntel = (kolkhozResult?.wallet_intelligence as WalletIntel) || null;
  const walletIntel: WalletIntel = (rawIntel?.wallets_analyzed) ? rawIntel : DEMO_INTEL;
  const isDemo = !rawIntel?.wallets_analyzed;

  const wallets: WalletResult[] = walletIntel.wallet_results || [];
  const clusters: Cluster[]     = walletIntel.clusters || [];

  const hasRealData = !!rawIntel?.wallets_analyzed;

  const handleScan = () => {
    const addrs = manualAddr.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    run({ demo_mode: scanMode === "demo", wallet_addresses: addrs.length ? addrs : undefined });
  };

  return (
    <div style={{ padding: "24px 28px", background: "#080d18", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#ef444418",
            border: "1px solid #ef444430", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={16} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <h1 style={{ color: "#f0f4f8", fontSize: 16, fontWeight: 800, margin: 0 }}>Wallet Tracker</h1>
            <p style={{ color: "#4b5563", fontSize: 11, marginTop: 2 }}>
              Multi-chain intelligence: BTC · ETH · TRON/USDT · P2P bridge detection
              {isDemo && <span style={{ color: "#f97316", marginLeft: 8, fontWeight: 700 }}>· DEMO DATA</span>}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Wallets Analyzed", value: walletIntel.wallets_analyzed || 0, color: "#3b82f6" },
          { label: "Dirty Wallets",    value: walletIntel.dirty_wallets || 0,    color: "#ef4444" },
          { label: "High Risk",        value: walletIntel.high_risk_wallets || 0, color: "#f97316" },
          { label: "P2P Bridges",      value: walletIntel.p2p_bridges || 0,      color: "#a855f7" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "#111827", border: "1px solid #1f2937",
            borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ color: "#4b5563", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
              {kpi.label.toUpperCase()}
            </p>
            <p style={{ color: kpi.color, fontSize: 22, fontWeight: 800, margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Manual trace input */}
      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10,
        padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ color: "#6b7280", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>
            TRACE ADDRESSES
          </p>
          {/* Demo / Live toggle */}
          <div style={{ display: "flex", background: "#0d1520", border: "1px solid #1f2937", borderRadius: 6, overflow: "hidden" }}>
            {(["demo", "live"] as const).map((m) => (
              <button key={m} onClick={() => handleScanModeChange(m)} disabled={isRunning}
                style={{ padding: "5px 12px", fontSize: 10, fontWeight: 700, border: "none",
                  background: scanMode === m ? (m === "live" ? "#ef4444" : "#1f2937") : "transparent",
                  color: scanMode === m ? "#fff" : "#6b7280", cursor: "pointer", textTransform: "capitalize" }}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <textarea rows={3}
            placeholder={"Paste wallet addresses (one per line or comma-separated):\nTRC20: T...\nETH: 0x...\nBTC: bc1..."}
            value={manualAddr} onChange={(e) => setManualAddr(e.target.value)}
            style={{ flex: 1, background: "#0d1520", border: "1px solid #1f2937", color: "#e5e7eb",
              borderRadius: 6, padding: "8px 12px", fontSize: 11, outline: "none",
              resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }} />
          <button onClick={handleScan} disabled={isRunning}
            style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#ef4444",
              borderRadius: 6, padding: "8px 16px", fontSize: 11, fontWeight: 700,
              cursor: isRunning ? "not-allowed" : "pointer", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCcw size={11} style={{ animation: isRunning ? "spin 1s linear infinite" : "none" }} />
            {isRunning ? "Scanning…" : `Run ${scanMode === "live" ? "Live" : "Demo"} Trace`}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Wallet list */}
        <div>
          <p style={{ color: "#6b7280", fontSize: 10, fontWeight: 700, marginBottom: 10, letterSpacing: "0.1em" }}>
            WALLET INTELLIGENCE ({wallets.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {wallets.slice(0, 15).map((w, i) => {
              const cc = CHAIN_COLOR[w.chain] || "#6b7280";
              return (
                <div key={i} style={{ background: "#111827", border: "1px solid #1f2937",
                  borderLeft: `3px solid ${cc}`, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ background: `${cc}22`, color: cc, border: `1px solid ${cc}44`,
                      padding: "1px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{w.chain}</span>
                    <RiskBadge level={w.risk_level} />
                    {w.is_dirty && (
                      <span style={{ background: "#ef444418", color: "#ef4444", border: "1px solid #ef444430",
                        padding: "1px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>DIRTY</span>
                    )}
                    {w.p2p_bridge_detected && (
                      <span style={{ background: "#a855f718", color: "#a855f7", border: "1px solid #a855f730",
                        padding: "1px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>P2P</span>
                    )}
                    {w.kz_payment_detected && (
                      <span style={{ background: "#10b98118", color: "#10b981", border: "1px solid #10b98130",
                        padding: "1px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>KASPI</span>
                    )}
                  </div>
                  <p style={{ color: "#9ca3af", fontSize: 10, fontFamily: "monospace", margin: "0 0 4px 0",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w.address}
                  </p>
                  {w.cluster_label && (
                    <p style={{ color: "#6b7280", fontSize: 10, margin: "2px 0" }}>
                      Cluster: <span style={{ color: "#ef4444" }}>{w.cluster_label}</span>
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                    <span style={{ color: "#4b5563", fontSize: 10 }}>
                      Balance: <span style={{ color: "#e5e7eb" }}>${w.balance_usd?.toLocaleString()}</span>
                    </span>
                    <span style={{ color: "#4b5563", fontSize: 10 }}>
                      7d TXs: <span style={{ color: "#e5e7eb" }}>{w.tx_count_7d}</span>
                    </span>
                    {w.outflow_ratio > 1 && (
                      <span style={{ color: "#4b5563", fontSize: 10 }}>
                        Outflow: <span style={{ color: "#f97316" }}>{w.outflow_ratio}x</span>
                      </span>
                    )}
                  </div>
                  {w.flags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {w.flags.map((flag) => (
                        <span key={flag} style={{ background: "#1f2937", color: "#6b7280",
                          padding: "1px 6px", borderRadius: 3, fontSize: 9 }}>
                          {flag.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                  {hasRealData && (
                    <button onClick={() => navigate("/investigation/kolkhoz/0")}
                      style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4,
                        background: `${cc}18`, border: `1px solid ${cc}40`, color: cc,
                        borderRadius: 4, padding: "3px 10px", fontSize: 9,
                        fontWeight: 700, cursor: "pointer" }}>
                      Investigate via KOLKHOZ →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Clusters */}
        <div>
          <p style={{ color: "#6b7280", fontSize: 10, fontWeight: 700, marginBottom: 10, letterSpacing: "0.1em" }}>
            WALLET CLUSTERS ({clusters.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {clusters.map((c) => {
              const rc = c.cluster_risk === "critical" ? "#ef4444"
                : c.cluster_risk === "high" ? "#f97316"
                : c.cluster_risk === "medium" ? "#eab308" : "#6b7280";
              return (
                <div key={c.cluster_id} style={{ background: "#111827", border: `1px solid ${rc}30`,
                  borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Link size={12} style={{ color: rc }} />
                    <span style={{ color: "#e5e7eb", fontSize: 12, fontWeight: 700 }}>{c.cluster_id}</span>
                    <RiskBadge level={c.cluster_risk} />
                    {c.has_dirty_member && (
                      <span style={{ background: "#ef444418", color: "#ef4444", border: "1px solid #ef444430",
                        padding: "1px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>DIRTY MEMBER</span>
                    )}
                  </div>
                  <p style={{ color: "#6b7280", fontSize: 11, margin: "2px 0" }}>
                    {c.member_count} wallets · Chains: {c.chains.join(", ")} · Max risk: {c.max_risk_score}
                  </p>
                  <div style={{ marginTop: 8 }}>
                    {c.addresses.slice(0, 3).map((addr) => (
                      <p key={addr} style={{ color: "#374151", fontSize: 9, fontFamily: "monospace",
                        margin: "2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {addr}
                      </p>
                    ))}
                    {c.addresses.length > 3 && (
                      <p style={{ color: "#374151", fontSize: 9, margin: "2px 0" }}>
                        +{c.addresses.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
