import { useState } from "react";
import { Network, RefreshCcw, AlertTriangle, Shield, Globe, Database, Radio, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useModulesStore } from "@/store";
import { useModuleTask } from "@/hooks/useModuleTask";

const CATEGORY_COLOR: Record<string, string> = {
  DATA_LEAK:                        "#ef4444",
  DROPPER_NETWORK:                  "#f97316",
  ILLEGAL_BETTING:                  "#a855f7",
  PYRAMID_SCHEME:                   "#eab308",
  CRYPTO_FINANCIAL_CRIME:           "#3b82f6",
  OSINT_FINDING:                    "#6b7280",
  SANCTIONS_HIT:                    "#dc2626",
  UNLICENSED_FINANCIAL_ACTIVITY:    "#f59e0b",
  DRUG_TRAFFICKING:                 "#10b981",
  CASHOUT_NETWORK:                  "#f97316",
  "Financial Fraud":                "#ef4444",
  "Cross-Module Correlation":       "#a855f7",
  "Infrastructure Threat":          "#3b82f6",
  "Dropper Recruitment":            "#f97316",
  "Illegal Marketplace":            "#10b981",
  "Crypto Laundering":              "#6366f1",
};

const SOURCE_ICON: Record<string, typeof Globe> = {
  darknet: Radio, paste_site: Database, leak_site: Database,
  code_repository: Database, github: Database, public_web: Globe,
  open_web: Globe, telegram: Shield, watchlist: AlertTriangle,
  kz_intelligence_feed: AlertTriangle, forum: Globe,
};

const DEMO_FINDINGS = [
  { title: "[KZ-CERT] Active Kaspi.kz phishing campaign — 23,000 victims", text: "KZ-CERT Advisory: Large-scale phishing campaign targeting Kaspi.kz users. Spoofed domains: kaspi-kz.info, kaspi-online.com. Harvested data: IIN, card number, CVV, mobile phone. Estimated victims: 23,000 Almaty and Astana residents. Threat actors via Telegram: @kz_phish_crew, @kaspi_grabber. USDT wallets: TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE.", source_type: "watchlist", crime_category: "DATA_LEAK", risk_score: 97, source_url: "https://kz-cert.kz/en/threats/kaspi-phishing-2024", kz_screening: { hit_count: 4 } },
  { title: "[AFSA] 156,000 KZ investor PII records sold on darknet forums", text: "AFSA Bulletin: Personal data of 156,000 Kazakhstan investment platform users found for sale on underground cybercrime forums. Data includes: full name, IIN, email, phone number, investment portfolio size, and bank account details. Sellers: @invest_kz_data, @findata_market. Price: 800 USDT per 10,000 records.", source_type: "watchlist", crime_category: "DATA_LEAK", risk_score: 91, source_url: "https://afsa.kz/en/news/investor-pii-breach-2024", kz_screening: { hit_count: 3 } },
  { title: "Telegram: KZ drop card recruitment — Kaspi/Halyk cash-out network", text: "Telegram channel @kz_dropper_hub offering 15–25% commission for Kaspi Gold and Halyk Bank card drops. Recruits sought in Almaty, Astana, Shymkent. USDT wallet for payouts: TJCnKsPa7y5okkXvQAidZijX6TaQe7dWTd. 847 members. 47 active card recruiters. 12 active cashout chains.", source_type: "telegram", crime_category: "DROPPER_NETWORK", risk_score: 88, source_url: "https://t.me/drop_kz_recruiter", kz_screening: { hit_count: 5 } },
  { title: "GitHub: Exposed Kaspi payment gateway API keys (3 repositories)", text: "GitHub Code Search reveals 3 public repositories containing Kaspi Business API keys. Repos: kz-startup/payment-app, almaty-ecom/shop-backend. Exposed: KASPI_API_KEY=kp_live_XXXX, KASPI_SHOP_ID=12345. Also found: Halyk eCommerce secret key.", source_type: "code_repository", crime_category: "DATA_LEAK", risk_score: 82, source_url: "https://github.com/search?q=KASPI_API_KEY", kz_screening: { hit_count: 2 } },
  { title: "1win.kz / MostBet — illegal gambling funnel via Kaspi P2P", text: "Monitoring of Telegram channels reveals 1win.kz and MostBet actively accepting deposits via Kaspi P2P transfers. Monthly transaction volume estimated at $2.3M. 14 unlicensed betting domains identified. Kaspi payment processing accounts flagged: +7 701 xxx xxxx series.", source_type: "open_web", crime_category: "ILLEGAL_BETTING", risk_score: 79, source_url: "https://1win.kz", kz_screening: { hit_count: 2 } },
  { title: "Underground forum: egov.kz employee access for sale (insider threat)", text: "Underground cybercrime forum listing: access to egov.kz employee accounts. Capability: view citizen IIN records, tax filings, property registrations. Seller: @egov_insider. Gov email samples: pension_dept@enpf.kz, tax_almaty@kgd.gov.kz. Price: 2 BTC for persistent access.", source_type: "forum", crime_category: "DATA_LEAK", risk_score: 97, source_url: "", kz_screening: { hit_count: 6 } },
];

function RiskBadge({ score }: { score: number }) {
  const color = score >= 85 ? "#ef4444" : score >= 70 ? "#f97316" : score >= 40 ? "#eab308" : "#6b7280";
  const label = score >= 85 ? "CRITICAL" : score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  return (
    <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`,
      padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
      {label} {score}
    </span>
  );
}

type Finding = {
  title?: string; text?: string; description?: string; raw_excerpt?: string;
  analyst_summary?: string; source_type?: string; crime_category?: string;
  risk_score?: number; url?: string; source_url?: string;
  kz_screening?: { hit_count: number };
  _originalIndex?: number;
};

function findingText(f: Finding): string {
  return f.text || f.description || f.raw_excerpt || f.analyst_summary || "";
}

export default function DarkNetFeedPage() {
  const navigate = useNavigate();
  const tengrafResult = useModulesStore((s) => s.resultsByModule["tengraf"]);
  const isRunning = useModulesStore((s) => !!s.runningModules["tengraf"]);
  const { run } = useModuleTask("tengraf");
  const [scanMode, setScanMode] = useState<"demo" | "live">(() => {
    try { return (localStorage.getItem("sm_tengraf") as "demo" | "live") || "demo"; } catch { return "demo"; }
  });
  const handleScanModeChange = (mode: "demo" | "live") => {
    setScanMode(mode); try { localStorage.setItem("sm_tengraf", mode); } catch {}
  };
  const [filter, setFilter] = useState<string>("all");
  const [searchQ, setSearchQ] = useState("");

  const rawFindings = ((tengrafResult?.findings as Finding[]) || []).map((f, i) => ({ ...f, _originalIndex: i }));
  const hasReal = rawFindings.length > 0;
  const findings: Finding[] = hasReal ? rawFindings : DEMO_FINDINGS.map((f, i) => ({ ...f, _originalIndex: i }));
  const isDemo = !hasReal;

  const categories = Array.from(new Set(findings.map((f) => f.crime_category || "OSINT_FINDING")));

  const filtered = findings.filter((f) => {
    const cat = f.crime_category || "OSINT_FINDING";
    if (filter !== "all" && cat !== filter) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!`${f.title || ""} ${findingText(f)} ${cat}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  const timeline: Array<{ date: string; findings_count: number; avg_risk_score: number }> =
    (tengrafResult?.temporal_timeline as any[]) || [];

  const handleRun = () => run({ demo_mode: scanMode === "demo", max_items: 30 });

  return (
    <div style={{ padding: "24px 28px", background: "#080d18", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#3b82f618",
            border: "1px solid #3b82f630", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Network size={16} style={{ color: "#3b82f6" }} />
          </div>
          <div>
            <h1 style={{ color: "#f0f4f8", fontSize: 16, fontWeight: 800, margin: 0 }}>DarkNet Intelligence Feed</h1>
            <p style={{ color: "#4b5563", fontSize: 11, marginTop: 2 }}>
              {findings.length} findings · TENGRAF OSINT/DarkNet/Leak sources
              {isDemo && <span style={{ color: "#f97316", marginLeft: 8, fontWeight: 700 }}>· DEMO DATA</span>}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Demo / Live toggle */}
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
          <button onClick={handleRun} disabled={isRunning}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827",
              border: "1px solid #1f2937", color: isRunning ? "#4b5563" : "#9ca3af",
              borderRadius: 6, padding: "7px 14px", fontSize: 11, cursor: isRunning ? "not-allowed" : "pointer" }}>
            <RefreshCcw size={11} style={{ animation: isRunning ? "spin 1s linear infinite" : "none" }} />
            {isRunning ? "Scanning…" : `Run ${scanMode === "live" ? "Live" : "Demo"} Scan`}
          </button>
        </div>
      </div>

      {/* Temporal timeline */}
      {timeline.length > 0 && (
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10,
          padding: "14px 16px", marginBottom: 16 }}>
          <p style={{ color: "#6b7280", fontSize: 10, fontWeight: 700, marginBottom: 10, letterSpacing: "0.1em" }}>TEMPORAL ACTIVITY</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
            {timeline.slice(-14).map((t) => {
              const maxC = Math.max(...timeline.map((x) => x.findings_count), 1);
              const h = Math.max(4, Math.round((t.findings_count / maxC) * 48));
              const color = t.avg_risk_score >= 70 ? "#ef4444" : t.avg_risk_score >= 40 ? "#f97316" : "#3b82f6";
              return <div key={t.date} title={`${t.date}: ${t.findings_count}`}
                style={{ flex: 1, background: color, height: h, borderRadius: 2, opacity: 0.8 }} />;
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#111827",
          border: "1px solid #1f2937", borderRadius: 6, padding: "0 10px", gap: 6 }}>
          <Search size={10} style={{ color: "#4b5563" }} />
          <input placeholder="Search findings…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
            style={{ background: "transparent", border: "none", color: "#e5e7eb", fontSize: 11,
              outline: "none", width: 180, padding: "6px 0" }} />
        </div>
        {["all", ...categories].map((cat) => {
          const active = filter === cat;
          const color = CATEGORY_COLOR[cat] || "#6b7280";
          return (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ background: active ? `${color}22` : "#111827",
                border: `1px solid ${active ? color + "44" : "#1f2937"}`,
                color: active ? color : "#6b7280", borderRadius: 5, padding: "4px 10px",
                fontSize: 10, fontWeight: 600, cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {cat === "all" ? "ALL" : cat.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>

      {/* Findings */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((f, i) => {
          const cat     = f.crime_category || "OSINT_FINDING";
          const color   = CATEGORY_COLOR[cat] || "#6b7280";
          const SrcIcon = SOURCE_ICON[f.source_type || ""] || Globe;
          const link    = f.source_url || f.url;
          const kzHits  = f.kz_screening?.hit_count || 0;
          const body    = findingText(f);
          const canInvestigate = hasReal && f._originalIndex !== undefined;

          return (
            <div key={i} style={{ background: "#111827", border: "1px solid #1f2937",
              borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "14px 16px",
              display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                background: `${color}18`, border: `1px solid ${color}30`,
                display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                <SrcIcon size={13} style={{ color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <p style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 700, margin: 0, flex: 1 }}>
                    {f.title || "Untitled Finding"}
                  </p>
                  <RiskBadge score={f.risk_score || 0} />
                  <span style={{ background: `${color}18`, color, border: `1px solid ${color}30`,
                    padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
                    {cat.replace(/_/g, " ")}
                  </span>
                  {kzHits > 0 && (
                    <span style={{ background: "#ef444418", color: "#ef4444", border: "1px solid #ef444430",
                      padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
                      {kzHits} KZ HIT{kzHits > 1 ? "S" : ""}
                    </span>
                  )}
                  <button
                    onClick={() => canInvestigate && navigate(`/investigation/tengraf/${f._originalIndex}`)}
                    disabled={!canInvestigate}
                    title={!canInvestigate ? "Run a live scan first to enable investigation" : "Open full investigation"}
                    style={{ display: "flex", alignItems: "center", gap: 4,
                      background: canInvestigate ? `${color}18` : "#1f2937",
                      border: `1px solid ${canInvestigate ? color + "40" : "#374151"}`,
                      color: canInvestigate ? color : "#374151",
                      borderRadius: 4, padding: "2px 8px", fontSize: 9,
                      fontWeight: 700, cursor: canInvestigate ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap", flexShrink: 0 }}>
                    Investigate →
                  </button>
                </div>
                {body ? (
                  <p style={{ color: "#6b7280", fontSize: 11, marginTop: 6, lineHeight: 1.6,
                    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as any }}>
                    {body}
                  </p>
                ) : (
                  <p style={{ color: "#374151", fontSize: 11, marginTop: 6, fontStyle: "italic" }}>
                    No excerpt — view source for full content.
                  </p>
                )}
                {link && !link.startsWith("osint://") && link.startsWith("http") && (
                  <a href={link} target="_blank" rel="noopener noreferrer"
                    style={{ color: "#3b82f6", fontSize: 10, marginTop: 4, display: "block",
                      textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {link}
                  </a>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12,
            padding: 48, textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: 14 }}>No findings match current filter</p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
