import { useState } from "react";
import { Database, AlertTriangle, Shield, RefreshCcw, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useModulesStore } from "@/store";
import { useModuleTask } from "@/hooks/useModuleTask";

const LEAK_TYPE_COLOR: Record<string, string> = {
  DATA_LEAK:                        "#ef4444",
  SANCTIONS_HIT:                    "#dc2626",
  UNLICENSED_FINANCIAL_ACTIVITY:    "#f59e0b",
  DRUG_TRAFFICKING:                 "#10b981",
  ILLEGAL_GAMBLING:                 "#a855f7",
  CASHOUT_NETWORK:                  "#f97316",
  UNLICENSED_CRYPTO_EXCHANGE:       "#3b82f6",
};

// Matches the actual data produced by backend _active_leak_campaigns() + kz_intelligence
const DEMO_LEAK_FINDINGS = [
  {
    title: "Underground forum: egov.kz employee access for sale",
    text: "Underground cybercrime forum listing: access to egov.kz employee accounts. Advertised capability: view citizen IIN records, tax filings, property registrations. Seller: @egov_insider (Telegram). Samples provided: admin@enbek.kz credentials. Gov email samples: pension_dept@enpf.kz, tax_almaty@kgd.gov.kz. Price: 2 BTC for persistent access. This represents a critical insider threat to Kazakhstan government infrastructure.",
    crime_category: "DATA_LEAK", risk_score: 97, source: "forum_osint", source_type: "forum",
    afsa_ref: "AFSA-OSINT-2024-001",
    leak_signals: { iin_count: 0, phone_count: 0, card_count: 0, email_count: 2, gov_email_count: 2, bank_log_count: 0, credential_count: 1 },
  },
  {
    title: "[KZ-CERT] Active phishing campaign harvesting Kaspi credentials — 23,000 victims",
    text: "KZ-CERT Advisory: Large-scale phishing campaign targeting Kaspi.kz users. Spoofed domains: kaspi-kz.info, kaspi.kz.login-secure.ru, kaspi-online.com. Harvested data: IIN, card number, CVV, mobile phone (+7 70x). Estimated victims: 23,000 Almaty and Astana residents. Threat actors via Telegram: @kz_phish_crew, @kaspi_grabber. USDT payment wallets: TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE.",
    crime_category: "DATA_LEAK", risk_score: 91, source: "kz_cert_advisory", source_type: "leak_site",
    afsa_ref: "KZ-CERT-2024-085",
    leak_signals: { iin_count: 23000, phone_count: 23000, card_count: 23000, email_count: 0, gov_email_count: 0, bank_log_count: 1, credential_count: 0 },
  },
  {
    title: "[AFSA] 156,000 KZ investor PII sold on underground forums",
    text: "AFSA Bulletin: Personal data of 156,000 Kazakhstan investment platform users found for sale on underground cybercrime forums. Data includes: full name, IIN, email (@mail.kz, @gmail.com), phone number, investment portfolio size, and bank account details. Sources: compromised CRM of three unregulated investment platforms. Sellers: @invest_kz_data, @findata_market. Price: 800 USDT per 10,000 records.",
    crime_category: "DATA_LEAK", risk_score: 87, source: "afsa_bulletin", source_type: "leak_site",
    afsa_ref: "AFSA-BREACH-2024-022",
    leak_signals: { iin_count: 156000, phone_count: 156000, card_count: 0, email_count: 156000, gov_email_count: 0, bank_log_count: 0, credential_count: 0 },
  },
  {
    title: "GitHub: Exposed Kaspi payment gateway credentials (3 repositories)",
    text: "GitHub Code Search reveals 3 public repositories containing Kaspi Business API keys. Repos: kz-startup/payment-app, almaty-ecom/shop-backend, kazakh-dev/fintech-demo. Exposed: KASPI_API_KEY=kp_live_XXXX, KASPI_SHOP_ID=12345, kaspi_merchant_token. Risk: Full payment processing capability for attackers. Also found: Halyk eCommerce secret key and 1win.kz affiliate tracking pixels. Recommended action: Rotate all exposed credentials immediately.",
    crime_category: "DATA_LEAK", risk_score: 82, source: "osint_github_scan", source_type: "code_repository",
    afsa_ref: "OSINT-GH-2024-017",
    leak_signals: { iin_count: 0, phone_count: 0, card_count: 0, email_count: 0, gov_email_count: 0, bank_log_count: 0, credential_count: 3 },
  },
  {
    title: "AFSA Watchlist — TechInvestKZ: unlicensed financial activity",
    text: "TechInvestKZ operating without AFM license. Offering guaranteed 18% monthly returns. 12,400 investors affected. AFSA case ref AFSA-2024-0847.",
    crime_category: "UNLICENSED_FINANCIAL_ACTIVITY", risk_score: 78,
    source: "kz_intelligence_feed", source_type: "watchlist",
    afsa_ref: "AFSA-2024-0847", list: "AFSA Watchlist",
    leak_signals: undefined,
  },
  {
    title: "NCA Pattern — Alpha-PVP / 'Bath Salts' synthetic stimulant distribution",
    text: "Telegram channels using code terms: 'соль', 'крисы', 'скорость'. Supply chains active in Almaty, Astana, Shymkent. Wallet transactions via USDT TRC20. NCA pattern ref NCA-KZ-DRUG-001.",
    crime_category: "DRUG_TRAFFICKING", risk_score: 88,
    source: "kz_intelligence_feed", source_type: "watchlist",
    afsa_ref: "NCA-KZ-DRUG-001", list: "NCA Kazakhstan",
    leak_signals: undefined,
  },
];

type LeakSignals = {
  iin_count?: number; phone_count?: number; card_count?: number;
  email_count?: number; gov_email_count?: number; bank_log_count?: number;
  credential_count?: number;
};
type LeakFinding = {
  title?: string; text?: string; crime_category?: string;
  risk_score?: number; source?: string; source_type?: string;
  leak_signals?: LeakSignals; violation?: string; list?: string; afsa_ref?: string;
};

const LEAK_TYPES = new Set([
  "DATA_LEAK", "SANCTIONS_HIT", "UNLICENSED_FINANCIAL_ACTIVITY",
  "DRUG_TRAFFICKING", "ILLEGAL_GAMBLING", "CASHOUT_NETWORK",
  "UNLICENSED_CRYPTO_EXCHANGE",
]);

function groupByCategory(findings: LeakFinding[]): Record<string, LeakFinding[]> {
  const groups: Record<string, LeakFinding[]> = {};
  for (const f of findings) {
    const cat = f.crime_category || "DATA_LEAK";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(f);
  }
  return groups;
}

function MaskPII({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const masked = text
    .replace(/\b\d{12}\b/g, "IIN:●●●●●●●●●●●●")
    .replace(/\+7\s?7\d{2}[\s\-]?\d{3}[\s\-]?\d{4}/g, "+7 7●● ●●● ●●●●")
    .replace(/\b4[0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b/g, "CARD: ●●●● ●●●● ●●●● ●●●●");
  return (
    <div>
      <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5,
        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical" as any, marginTop: 6 }}>
        {show ? text.slice(0, 600) : masked.slice(0, 600)}
      </p>
      <button onClick={() => setShow(!show)}
        style={{ background: "none", border: "none", color: "#4b5563",
          cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center",
          gap: 4, marginTop: 4, padding: 0 }}>
        {show ? <EyeOff size={10} /> : <Eye size={10} />}
        {show ? "Mask PII" : "Show raw text"}
      </button>
    </div>
  );
}

export default function LeakMonitorPage() {
  const navigate = useNavigate();
  const tengrafResult = useModulesStore((s) => s.resultsByModule["tengraf"]);
  const isRunning = useModulesStore((s) => !!s.runningModules["tengraf"]);
  const { run } = useModuleTask("tengraf");
  const [expandedCat, setExpandedCat] = useState<string | null>("DATA_LEAK");
  const [scanMode, setScanMode] = useState<"demo" | "live">(() => {
    try { return (localStorage.getItem("sm_tengraf") as "demo" | "live") || "demo"; } catch { return "demo"; }
  });
  const handleScanModeChange = (mode: "demo" | "live") => {
    setScanMode(mode); try { localStorage.setItem("sm_tengraf", mode); } catch {}
  };

  const rawFindings: LeakFinding[] = (tengrafResult?.findings as LeakFinding[]) || [];
  // keep original index for investigation navigation
  const filteredWithIndex = rawFindings
    .map((f, i) => ({ ...f, _originalIndex: i }))
    .filter((f) => LEAK_TYPES.has(f.crime_category || ""));
  const hasReal = filteredWithIndex.length > 0;
  const leakFindings: (LeakFinding & { _originalIndex?: number })[] =
    hasReal ? filteredWithIndex : DEMO_LEAK_FINDINGS.map((f, i) => ({ ...f, _originalIndex: i }));
  const isDemo = !hasReal;

  const grouped = groupByCategory(leakFindings);

  const totalIINs   = leakFindings.reduce((s, f) => s + (f.leak_signals?.iin_count || 0), 0);
  const totalCards  = leakFindings.reduce((s, f) => s + (f.leak_signals?.card_count || 0), 0);
  const totalEmails = leakFindings.reduce((s, f) => s + (f.leak_signals?.email_count || 0), 0);
  const govHits     = leakFindings.reduce((s, f) => s + (f.leak_signals?.gov_email_count || 0), 0);

  return (
    <div style={{ padding: "24px 28px", background: "#080d18", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#ef444418",
            border: "1px solid #ef444430", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Database size={16} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <h1 style={{ color: "#f0f4f8", fontSize: 16, fontWeight: 800, margin: 0 }}>Leak Monitor</h1>
            <p style={{ color: "#4b5563", fontSize: 11, marginTop: 2 }}>
              KZ data breach detection · Sanctions screening · AFSA/NCA watchlists
              {isDemo && <span style={{ color: "#f97316", marginLeft: 8, fontWeight: 700 }}>· DEMO DATA</span>}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", background: "#111827", border: "1px solid #1f2937", borderRadius: 6, overflow: "hidden" }}>
            {(["demo", "live"] as const).map((m) => (
              <button key={m} onClick={() => handleScanModeChange(m)} disabled={isRunning}
                style={{ padding: "6px 14px", fontSize: 11, fontWeight: 700, border: "none",
                  background: scanMode === m ? (m === "live" ? "#ef4444" : "#1f2937") : "transparent",
                  color: scanMode === m ? "#fff" : "#6b7280", cursor: "pointer", textTransform: "capitalize" }}>
                {m}
              </button>
            ))}
          </div>
          <button onClick={() => run({ demo_mode: scanMode === "demo", max_items: 30 })} disabled={isRunning}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827",
              border: "1px solid #1f2937", color: isRunning ? "#4b5563" : "#9ca3af",
              borderRadius: 6, padding: "7px 14px", fontSize: 11, cursor: isRunning ? "not-allowed" : "pointer" }}>
            <RefreshCcw size={11} style={{ animation: isRunning ? "spin 1s linear infinite" : "none" }} />
            {isRunning ? "Scanning…" : `Run ${scanMode === "live" ? "Live" : "Demo"} Scan`}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "IINs Exposed",      value: totalIINs.toLocaleString(),   color: "#ef4444", icon: AlertTriangle },
          { label: "Cards Exposed",     value: totalCards.toLocaleString(),  color: "#f97316", icon: Database },
          { label: "Emails Exposed",    value: totalEmails.toLocaleString(), color: "#eab308", icon: Database },
          { label: "Gov.kz Credentials",value: govHits.toLocaleString(),     color: "#dc2626", icon: Shield },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "#111827", border: `1px solid ${kpi.color}22`,
            borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <kpi.icon size={11} style={{ color: kpi.color }} />
              <p style={{ color: "#4b5563", fontSize: 9, fontWeight: 700, margin: 0, letterSpacing: "0.1em" }}>
                {kpi.label.toUpperCase()}
              </p>
            </div>
            <p style={{ color: kpi.color, fontSize: 20, fontWeight: 800, margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Grouped findings */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(grouped)
          .sort((a, b) => {
            const aMax = Math.max(...a[1].map((f) => f.risk_score || 0));
            const bMax = Math.max(...b[1].map((f) => f.risk_score || 0));
            return bMax - aMax;
          })
          .map(([cat, items]) => {
            const color  = LEAK_TYPE_COLOR[cat] || "#6b7280";
            const isOpen = expandedCat === cat;
            const maxRisk = Math.max(...items.map((f) => f.risk_score || 0));
            return (
              <div key={cat} style={{ background: "#111827", border: `1px solid ${color}25`,
                borderRadius: 10, overflow: "hidden" }}>
                <button onClick={() => setExpandedCat(isOpen ? null : cat)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7,
                    background: `${color}18`, border: `1px solid ${color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <AlertTriangle size={13} style={{ color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 700, margin: 0 }}>
                      {cat.replace(/_/g, " ")}
                    </p>
                    <p style={{ color: "#4b5563", fontSize: 10, marginTop: 2 }}>
                      {items.length} finding{items.length > 1 ? "s" : ""} · Max risk {maxRisk}/100
                    </p>
                  </div>
                  <span style={{ color: "#374151", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div style={{ borderTop: `1px solid ${color}18`, padding: "4px 0" }}>
                    {items.map((f, i) => (
                      <div key={i} style={{ padding: "14px 18px",
                        borderBottom: i < items.length - 1 ? "1px solid #1f2937" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <p style={{ color: "#e5e7eb", fontSize: 12, fontWeight: 700, margin: 0, flex: 1 }}>
                            {f.title || f.violation || "Untitled"}
                          </p>
                          <span style={{ background: `${color}18`, color, border: `1px solid ${color}30`,
                            padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, whiteSpace: "nowrap" }}>
                            RISK {f.risk_score || 0}
                          </span>
                          {f.list && (
                            <span style={{ background: "#1f2937", color: "#9ca3af",
                              padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600 }}>
                              {f.list}
                            </span>
                          )}
                          {(() => {
                            const canInv = hasReal && (f as any)._originalIndex !== undefined;
                            return (
                              <button
                                onClick={() => canInv && navigate(`/investigation/tengraf/${(f as any)._originalIndex}`)}
                                disabled={!canInv}
                                title={!canInv ? "Run a live scan first to enable investigation" : "Open full investigation"}
                                style={{ display: "flex", alignItems: "center", gap: 4,
                                  background: canInv ? `${color}18` : "#1f2937",
                                  border: `1px solid ${canInv ? color + "40" : "#374151"}`,
                                  color: canInv ? color : "#374151",
                                  borderRadius: 4, padding: "2px 8px", fontSize: 9,
                                  fontWeight: 700, cursor: canInv ? "pointer" : "not-allowed",
                                  whiteSpace: "nowrap", flexShrink: 0 }}>
                                Investigate →
                              </button>
                            );
                          })()}
                        </div>

                        {f.leak_signals && (
                          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                            {[
                              { label: "IINs",     val: f.leak_signals.iin_count },
                              { label: "Cards",    val: f.leak_signals.card_count },
                              { label: "Phones",   val: f.leak_signals.phone_count },
                              { label: "Emails",   val: f.leak_signals.email_count },
                              { label: "Gov.kz",   val: f.leak_signals.gov_email_count },
                              { label: "Bank Logs",val: f.leak_signals.bank_log_count },
                              { label: "Creds",    val: f.leak_signals.credential_count },
                            ].filter((s) => s.val && s.val > 0).map((s) => (
                              <div key={s.label} style={{ background: "#0d1520",
                                border: "1px solid #1f2937", borderRadius: 5, padding: "4px 10px" }}>
                                <p style={{ color: "#4b5563", fontSize: 9, fontWeight: 700, margin: 0 }}>{s.label}</p>
                                <p style={{ color: "#ef4444", fontSize: 14, fontWeight: 800, margin: 0 }}>
                                  {s.val!.toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {f.text && <MaskPII text={f.text} />}

                        {f.afsa_ref && (
                          <p style={{ color: "#374151", fontSize: 10, marginTop: 6 }}>
                            Ref: <span style={{ color: "#9ca3af" }}>{f.afsa_ref}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
