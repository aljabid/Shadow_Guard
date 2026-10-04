/**
 * InvestigationPage — SOC / AFM Financial Intelligence Investigation Console
 * Route: /investigation/:moduleId/:findingIndex
 * Data source: useModulesStore (Zustand, in-memory from last scan result)
 */
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useModulesStore, useAlertsStore } from "@/store";
import { investigationsApi } from "@/api/investigations.api";
import { reportsApi } from "@/api/reports.api";
import { ArrowLeft, ExternalLink, FileJson, Download, FolderPlus, Zap } from "lucide-react";

// ─── Existing Helpers (all preserved) ────────────────────────────────────────

function asArray(value: any): any[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getResultItems(moduleId: string, result: any): any[] {
  if (!result) return [];
  if (moduleId === "kolkhoz")   return asArray(result.results);
  if (moduleId === "droper")    return asArray(result.top_channels);
  if (moduleId === "piramida")  return asArray(result.results);
  if (moduleId === "shadowbet") return [...asArray(result.results), ...asArray(result.operator_networks)];
  if (moduleId === "tengraf")   return asArray(result.findings);
  if (moduleId === "contraband")return asArray(result.findings);
  return [];
}

function getTitle(item: any, moduleId: string): string {
  return (
    item?.title ||
    item?.exchange_name ||
    item?.scheme_name ||
    item?.platform_name ||
    item?.operator_name ||
    item?.channel_name ||
    item?.username ||
    item?.channel ||
    `${moduleId.toUpperCase()} Finding`
  );
}

function getRisk(item: any): number {
  return Number(item?.risk_score || item?.threat_score || item?.score || 0);
}

function normalizeUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("@")) return `https://t.me/${value.slice(1)}`;
  if (!value.includes(".") && !value.includes("/")) return `https://t.me/${value}`;
  return value;
}

function getEvidenceUrls(item: any): string[] {
  const sd = item?.source_data || {};
  const urls = [
    item?.url, item?.source_url, item?.link, item?.website, item?.telegram,
    sd?.source_url,
    ...(item?.evidence_urls || []),
    ...(sd?.evidence_urls || []),
    ...(sd?.telegram_links || []),
    ...(sd?.web_links || []),
    ...(sd?.github_links || []),
    ...(sd?.reddit_links || []),
    ...(sd?.onion_links || []),
  ]
    .filter(Boolean)
    .map((u) => normalizeUrl(String(u)));
  return Array.from(new Set(urls));
}

function labelEvidence(url: string, index: number): string {
  if (url.startsWith("darknet://"))    return `DarkNet Ref ${index + 1}`;
  if (url.startsWith("osint://"))      return `OSINT Ref ${index + 1}`;
  if (url.includes(".onion"))          return `Tor Onion ${index + 1}`;
  if (url.includes("t.me/"))           return `Telegram ${index + 1}`;
  if (url.includes("github.com"))      return `GitHub ${index + 1}`;
  if (url.includes("reddit.com"))      return `Reddit ${index + 1}`;
  if (url.startsWith("http"))          return `Web Source ${index + 1}`;
  return `Evidence ${index + 1}`;
}

/** Extract meaningful search keywords from an internal reference URL */
function osintKeywords(url: string): string {
  const path = url.replace(/^(osint|darknet):\/\//, "").replace(/[-_/]/g, " ").trim();
  return encodeURIComponent(path);
}

function osintSearchUrl(url: string): string {
  const kw = osintKeywords(url);
  return `https://www.google.com/search?q=${kw}+site%3Apastebin.com+OR+site%3Agithub.com+OR+site%3Aleakix.net`;
}

function getEntities(item: any) {
  const e = item?.entities || {};
  const sd = item?.source_data || {};
  return {
    banks:     asArray(e.banks     || item?.banks     || sd.banks),
    wallets:   asArray(e.wallets   || item?.wallets   || item?.wallet_addresses || sd.wallets),
    telegram:  asArray(e.telegram_handles || item?.telegram_handles || item?.telegram_links || item?.username || item?.channel || sd.telegram_links),
    domains:   asArray(e.domains   || item?.domains   || item?.domains_found || sd.domains),
    phones:    asArray(e.phones    || item?.phones    || sd.phones),
    platforms: asArray(e.platforms || item?.platforms || item?.platforms_mentioned || item?.platform_name),
  };
}

function getWhyFlagged(item: any): string[] {
  const reasons: string[] = [];
  const e = item?.entities || {};
  const sc = item?.scoring_details || {};
  const matched = item?.matched_keywords || sc?.matched_keywords || [];
  if (matched.length)                               reasons.push(`Matched keywords: ${matched.join(", ")}`);
  if ((e.wallets || []).length || sc.wallet_count > 0)  reasons.push("Crypto wallet or payment indicator detected.");
  if ((e.banks || []).length || sc.bank_count > 0)      reasons.push("Kazakhstan banking entities detected.");
  if ((e.telegram_handles || []).length || sc.telegram_count > 0) reasons.push("Telegram handles or channels extracted for follow-up.");
  if ((e.domains || []).length || sc.domain_count > 0)  reasons.push("Domains or web infrastructure extracted.");
  if (item?.risk_level)                             reasons.push(`Risk level classified as ${item.risk_level}.`);
  if (!reasons.length)                              reasons.push("Flagged by module-specific scoring logic.");
  return reasons;
}

function getRecommendedActions(moduleId: string, item: any): string[] {
  const risk = getRisk(item);
  const e = item?.entities || {};
  const actions: string[] = [];
  if (risk >= 80)      actions.push("Escalate to analyst review immediately.");
  else if (risk >= 50) actions.push("Queue for manual verification.");
  else                 actions.push("Keep for monitoring and correlation.");
  if (moduleId === "tengraf")    actions.push("Verify source authenticity and preserve evidence links.");
  if (moduleId === "kolkhoz")    actions.push("Review timeline for withdrawal complaints and wallet movement.");
  if (moduleId === "droper")     actions.push("Map Telegram operators, phones, wallets, and related channels.");
  if (moduleId === "piramida")   actions.push("Check registration status and estimate victim exposure.");
  if (moduleId === "shadowbet")  actions.push("Check license status, domains, payment methods, and influencers.");
  if (moduleId === "contraband") {
    actions.push("Preserve Telegram, web, Instagram, and DarkNet evidence URLs.");
    actions.push("Correlate phones, Telegram handles, domains, wallets, and locations.");
  }
  if ((e.wallets || []).length)           actions.push("Send extracted wallets to crypto-flow investigation.");
  if ((e.telegram_handles || []).length)  actions.push("Open Telegram evidence and capture screenshots.");
  return actions;
}

function getDetailText(item: any): string {
  if (item.analyst_summary) return String(item.analyst_summary);
  if (item.description)     return String(item.description);
  if (item.event_details)   return String(item.event_details);
  const raw = item.text || item.source_data?.raw_excerpt || "";
  if (typeof raw === "string" && raw.trim().startsWith("{")) return "";
  if (typeof raw === "object") return "";
  return String(raw || "");
}

// ─── New Helpers ──────────────────────────────────────────────────────────────

function sevColor(severity: string | undefined, risk: number): string {
  const s = (severity || "").toLowerCase();
  if (s === "critical" || risk >= 85) return "#ef4444";
  if (s === "high"     || risk >= 70) return "#f97316";
  if (s === "medium"   || risk >= 40) return "#eab308";
  return "#22c55e";
}

function sevLabel(severity: string | undefined, risk: number): string {
  const s = (severity || "").toLowerCase();
  if (s === "critical" || risk >= 85) return "CRITICAL";
  if (s === "high"     || risk >= 70) return "HIGH";
  if (s === "medium"   || risk >= 40) return "MEDIUM";
  return "LOW";
}

function getEntityType(moduleId: string, item: any): string {
  return (
    item?.source_type?.replace(/_/g, " ") ||
    item?.crime_category?.replace(/_/g, " ") ||
    item?.scheme_category?.replace(/_/g, " ") ||
    item?.platform_category?.replace(/_/g, " ") ||
    item?.exchange_type?.replace(/_/g, " ") ||
    (moduleId === "kolkhoz"    ? "Crypto Exchange" :
     moduleId === "droper"     ? "Recruitment Channel" :
     moduleId === "piramida"   ? "Financial Scheme" :
     moduleId === "shadowbet"  ? "Gambling Platform" :
     moduleId === "tengraf"    ? "OSINT Finding" :
     moduleId === "contraband" ? "Contraband Network" :
     "Intelligence Finding")
  );
}

function getTags(item: any, moduleId: string): string[] {
  const tags: string[] = [];
  if (item?.risk_level)   tags.push(item.risk_level.toUpperCase());
  if (moduleId)           tags.push(moduleId.toUpperCase());
  if (item?.crime_category)    tags.push(item.crime_category.replace(/_/g, " "));
  if (item?.is_licensed === false) tags.push("Unlicensed");
  if (item?.confidence)   tags.push(`Conf: ${item.confidence}`);
  const country = item?.country || item?.region;
  if (country)            tags.push(country);
  const kws: string[] = item?.matched_keywords || item?.scoring_details?.matched_keywords || [];
  kws.slice(0, 3).forEach((k) => tags.push(k));
  return [...new Set(tags)].slice(0, 8);
}

function getRedFlags(item: any): string[] {
  return asArray(item?.red_flags || item?.scoring_details?.red_flags || []);
}

function fmtDate(ts: string | undefined): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ts; }
}

function fmtDateShort(ts: string | undefined): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  } catch { return ts; }
}

function totalEntityCount(entities: ReturnType<typeof getEntities>): number {
  return Object.values(entities).reduce((s, a) => s + a.length, 0);
}

function getRiskIndicators(item: any, entities: ReturnType<typeof getEntities>, risk: number) {
  type Sev = "critical" | "high" | "medium" | "low";
  const list: { label: string; description: string; severity: Sev }[] = [];
  if (risk >= 85)
    list.push({ label: "Critical Risk Score",     description: `Score ${risk}/100 exceeds critical threshold (85)`, severity: "critical" });
  if (entities.wallets.length > 0)
    list.push({ label: "Crypto Payment Indicators", description: `${entities.wallets.length} wallet address(es) extracted`, severity: "high" });
  if (item?.sanctions_hit || item?.sanctions_screening_hit)
    list.push({ label: "Sanctions Screening Hit", description: "Entity matches AFM / international sanctions watchlist", severity: "critical" });
  if (entities.telegram.length > 0)
    list.push({ label: "Telegram Infrastructure", description: `${entities.telegram.length} channel(s)/handle(s) mapped`, severity: "medium" });
  if (entities.banks.length > 0)
    list.push({ label: "KZ Banking Links",        description: `${entities.banks.length} Kazakhstan bank(s) associated`, severity: "high" });
  if (entities.domains.length > 0)
    list.push({ label: "Domain Infrastructure",   description: `${entities.domains.length} domain(s) registered`, severity: "medium" });
  if (entities.phones.length > 0)
    list.push({ label: "Phone Indicators",        description: `${entities.phones.length} phone number(s) found`, severity: "low" });
  if ((item?.estimated_victims || 0) > 100)
    list.push({ label: "Large Victim Pool",       description: `Est. ${Number(item.estimated_victims).toLocaleString()} potential victims`, severity: "critical" });
  if ((item?.estimated_funds_at_risk_kzt || 0) > 0)
    list.push({ label: "Financial Exposure",      description: `${Number(item.estimated_funds_at_risk_kzt).toLocaleString()} KZT at risk`, severity: "high" });
  if (item?.is_licensed === false)
    list.push({ label: "Unlicensed Operation",    description: "No valid operating license detected", severity: "high" });
  if (list.length === 0)
    list.push({ label: "Module Risk Scoring",     description: "Flagged by module-specific analysis rules", severity: risk >= 50 ? "high" : "medium" });
  return list;
}

// ─── AI Classification Panel ─────────────────────────────────────────────────

const ML_LABEL_DISPLAY: Record<string, string> = {
  dropper_recruitment: "Dropper Recruitment",
  exchange_complaint:  "Exchange Complaint",
  pyramid_promo:       "Pyramid Scheme",
  gambling_promo:      "Gambling Promotion",
  contraband_sale:     "Contraband Sale",
  leak_sale:           "Data Leak Sale",
  normal:              "Normal / Benign",
};

const ML_LABEL_DESC: Record<string, string> = {
  dropper_recruitment: "Money mule / card drop recruitment activity",
  exchange_complaint:  "Illicit crypto exchange or withdrawal fraud",
  pyramid_promo:       "Ponzi scheme or investment pyramid promotion",
  gambling_promo:      "Unlicensed gambling or betting platform",
  contraband_sale:     "Drug or contraband trade via digital channels",
  leak_sale:           "Stolen data or credential leak marketplace",
  normal:              "No illicit indicators detected",
};

function mlFormatLabel(raw: string): string {
  return ML_LABEL_DISPLAY[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function CircularConfidence({ pct, color }: { pct: number; color: string }) {
  const r = 34, cx = 42, cy = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={84} height={84} style={{ display: "block" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a2640" strokeWidth={6} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={`${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="15" fontWeight="800" fontFamily="monospace">
        {pct}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={`${color}88`} fontSize="8" fontFamily="sans-serif">
        CONF.
      </text>
    </svg>
  );
}

interface MLClassification {
  enabled: boolean;
  label?: string;
  confidence?: number;
  low_confidence?: boolean;
  model_name?: string;
  model_version?: string;
  scores?: Record<string, number>;
}

function AIClassificationPanel({ ml }: { ml?: MLClassification | null }) {
  if (!ml || !ml.enabled || !ml.label) return null;

  const pct        = ml.confidence != null ? Math.round(ml.confidence * 100) : null;
  const lowConf    = ml.low_confidence || (pct != null && pct < 50);
  const confColor  = lowConf ? "#f59e0b" : pct != null && pct >= 80 ? "#10b981" : "#60a5fa";
  const label      = ml.label;
  const displayLbl = mlFormatLabel(label);
  const desc       = ML_LABEL_DESC[label] ?? "";
  const scores     = ml.scores;

  return (
    <div style={{
      background: "rgba(139,92,246,0.06)",
      border: "1px solid rgba(139,92,246,0.28)",
      borderRadius: 8,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: "1px solid rgba(139,92,246,0.18)",
        background: "rgba(139,92,246,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🤖</span>
          <span style={{ color: "#a78bfa", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            AI Prediction
          </span>
          <span style={{
            fontSize: 8, padding: "1px 6px", borderRadius: 3, fontWeight: 700,
            background: "rgba(139,92,246,0.14)", color: "#7c3aed",
            border: "1px solid rgba(139,92,246,0.3)",
          }}>
            LOCAL MODEL
          </span>
        </div>
        {lowConf && (
          <span style={{
            fontSize: 8.5, padding: "2px 7px", borderRadius: 4, fontWeight: 700,
            background: "rgba(245,158,11,0.14)", color: "#f59e0b",
            border: "1px solid rgba(245,158,11,0.3)", letterSpacing: "0.05em",
          }}>
            LOW CONFIDENCE
          </span>
        )}
      </div>

      {/* Main body */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* Left — label */}
          <div style={{ flex: 1 }}>
            <p style={{ color: "#6b7280", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Predicted Category
            </p>
            <p style={{ color: "#a78bfa", fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginBottom: 5 }}>
              {displayLbl}
            </p>
            {desc && (
              <p style={{ color: "#4b5563", fontSize: 10, lineHeight: 1.5 }}>{desc}</p>
            )}
          </div>

          {/* Right — circular confidence */}
          {pct != null && (
            <div style={{ flexShrink: 0, textAlign: "center" }}>
              <p style={{ color: "#6b7280", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, textAlign: "center" }}>
                Confidence
              </p>
              <CircularConfidence pct={pct} color={confColor} />
            </div>
          )}
        </div>

        {/* Model meta */}
        <div style={{ display: "flex", gap: 24, marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(139,92,246,0.12)" }}>
          <div>
            <p style={{ color: "#374151", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Model Used</p>
            <p style={{ color: "#6b7280", fontSize: 10, fontFamily: "monospace" }}>{ml.model_name ?? "TF-IDF + Logistic Regression"}</p>
          </div>
          <div>
            <p style={{ color: "#374151", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Model Version</p>
            <p style={{ color: "#6b7280", fontSize: 10, fontFamily: "monospace" }}>{ml.model_version ? `v${ml.model_version}` : "v1.0.0"}</p>
          </div>
          <div>
            <p style={{ color: "#374151", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Accuracy</p>
            <p style={{ color: "#10b981", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>96.7%</p>
          </div>
        </div>

        {/* Class score distribution */}
        {scores && Object.keys(scores).length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(139,92,246,0.12)" }}>
            <p style={{ color: "#374151", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
              Class Probability Distribution
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {Object.entries(scores)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([cls, score]) => {
                  const pctVal  = Math.round((score as number) * 100);
                  const isTop   = cls === label;
                  const barColor = isTop ? confColor : "#1a2640";
                  const textCol  = isTop ? confColor : "#374151";
                  return (
                    <div key={cls} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 140, fontSize: 9, color: textCol, fontFamily: "monospace",
                        fontWeight: isTop ? 700 : 400, flexShrink: 0,
                      }}>
                        {mlFormatLabel(cls)}
                      </span>
                      <div style={{ flex: 1, height: 4, background: "#0d1420", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          width: `${pctVal}%`, height: "100%",
                          background: isTop ? confColor : "#1e293b",
                          borderRadius: 2,
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                      <span style={{
                        width: 30, fontSize: 9, color: textCol, fontFamily: "monospace",
                        fontWeight: isTop ? 700 : 400, textAlign: "right", flexShrink: 0,
                      }}>
                        {pctVal}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <div style={{ padding: "10px 14px", marginTop: 10 }}>
        <p style={{ color: "#1f2937", fontSize: 8.5, fontStyle: "italic" }}>
          This prediction is generated by ShadowGuard AI Model (local) and does not use any external AI service.
        </p>
      </div>
    </div>
  );
}

// ─── Module accents ───────────────────────────────────────────────────────────

const MODULE_ACCENT: Record<string, string> = {
  kolkhoz:    "#ef4444",
  droper:     "#f97316",
  piramida:   "#eab308",
  shadowbet:  "#a855f7",
  tengraf:    "#3b82f6",
  contraband: "#10b981",
};

// ─── Severity palette ─────────────────────────────────────────────────────────

const SEV_COLORS = {
  critical: { dot: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.35)",  text: "#ef4444" },
  high:     { dot: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.35)", text: "#f97316" },
  medium:   { dot: "#eab308", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.35)",  text: "#eab308" },
  low:      { dot: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.35)",  text: "#22c55e" },
};

// ─── SVG Mini Intelligence Graph ──────────────────────────────────────────────

type NodeType = "center" | "telegram" | "wallet" | "domain" | "phone" | "bank" | "platform" | "evidence";

const NODE_STYLE: Record<NodeType, { fill: string; stroke: string }> = {
  center:   { fill: "#ef4444", stroke: "#dc2626" },
  telegram: { fill: "#3b82f6", stroke: "#2563eb" },
  wallet:   { fill: "#f59e0b", stroke: "#d97706" },
  domain:   { fill: "#22c55e", stroke: "#16a34a" },
  phone:    { fill: "#a855f7", stroke: "#9333ea" },
  bank:     { fill: "#f97316", stroke: "#ea580c" },
  platform: { fill: "#06b6d4", stroke: "#0891b2" },
  evidence: { fill: "#6b7280", stroke: "#4b5563" },
};

interface GNode { id: string; label: string; type: NodeType; x: number; y: number; }

function trunc(s: string, n = 14): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function safeHost(url: string): string {
  try { return new URL(url).hostname; } catch { return url.slice(0, 18); }
}

function MiniIntelGraph({
  title, entities, evidenceUrls,
}: {
  title: string;
  entities: ReturnType<typeof getEntities>;
  evidenceUrls: string[];
}) {
  const W = 560, H = 320, cx = W / 2, cy = H / 2;

  const raw: Omit<GNode, "x" | "y">[] = [
    ...entities.telegram.slice(0, 4).map((t, i) => ({ id: `tg${i}`, label: String(t), type: "telegram" as NodeType })),
    ...entities.wallets.slice(0, 3).map((w, i)  => ({ id: `wl${i}`, label: String(w).slice(0, 14), type: "wallet" as NodeType })),
    ...entities.domains.slice(0, 3).map((d, i)  => ({ id: `dm${i}`, label: String(d).slice(0, 16), type: "domain" as NodeType })),
    ...entities.phones.slice(0, 2).map((p, i)   => ({ id: `ph${i}`, label: String(p), type: "phone" as NodeType })),
    ...entities.banks.slice(0, 2).map((b, i)    => ({ id: `bk${i}`, label: String(b).slice(0, 14), type: "bank" as NodeType })),
    ...entities.platforms.slice(0, 2).map((pl, i) => ({ id: `pt${i}`, label: String(pl).slice(0, 14), type: "platform" as NodeType })),
  ];

  if (raw.length < 3) {
    evidenceUrls.slice(0, 4 - raw.length).forEach((url, i) => {
      raw.push({ id: `ev${i}`, label: safeHost(url).slice(0, 16), type: "evidence" });
    });
  }
  if (raw.length === 0) {
    raw.push({ id: "ev0", label: "Source Data", type: "evidence" });
    raw.push({ id: "ev1", label: "Intelligence", type: "evidence" });
  }

  const n = raw.length;
  const nodes: GNode[] = raw.map((node, i) => {
    const innerMax = Math.min(n, 7);
    const isOuter  = n > 7 && i >= 7;
    const R = isOuter ? 155 : 120;
    const count = isOuter ? n - 7 : innerMax;
    const idx   = isOuter ? i - 7 : i;
    const angle = (2 * Math.PI * idx / count) - Math.PI / 2;
    return { ...node, x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });

  const usedTypes = [...new Set(nodes.map((n) => n.type))];

  return (
    <div style={{ background: "#060d1a", borderRadius: 6, overflow: "hidden" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          <pattern id="ig-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0a1628" strokeWidth="0.5" />
          </pattern>
          {nodes.map((n) => (
            <radialGradient key={`rg-${n.id}`} id={`rg-${n.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={NODE_STYLE[n.type].fill} stopOpacity="0.25" />
              <stop offset="100%" stopColor={NODE_STYLE[n.type].fill} stopOpacity="0" />
            </radialGradient>
          ))}
          <radialGradient id="rg-ctr" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grid background */}
        <rect width={W} height={H} fill="url(#ig-grid)" />

        {/* Concentric rings */}
        <circle cx={cx} cy={cy} r={80}  fill="none" stroke="#ef4444" strokeWidth="0.4" strokeDasharray="5 7"  opacity="0.15" />
        <circle cx={cx} cy={cy} r={130} fill="none" stroke="#1a2640" strokeWidth="0.5" strokeDasharray="3 9"  opacity="0.4" />
        <circle cx={cx} cy={cy} r={160} fill="none" stroke="#111827" strokeWidth="0.5" strokeDasharray="2 12" opacity="0.3" />

        {/* Center glow */}
        <circle cx={cx} cy={cy} r={65} fill="url(#rg-ctr)" />

        {/* Edges */}
        {nodes.map((n) => (
          <line
            key={`e-${n.id}`}
            x1={cx} y1={cy} x2={n.x} y2={n.y}
            stroke={NODE_STYLE[n.type].fill}
            strokeWidth="1.5"
            strokeOpacity="0.3"
            strokeDasharray={n.type === "evidence" ? "4 3" : undefined}
          />
        ))}

        {/* Outer node halos */}
        {nodes.map((n) => (
          <circle key={`h-${n.id}`} cx={n.x} cy={n.y} r={22} fill={`url(#rg-${n.id})`} />
        ))}

        {/* Outer nodes */}
        {nodes.map((n) => {
          const labelY = n.y > cy ? n.y + 28 : n.y - 22;
          return (
            <g key={`g-${n.id}`}>
              <circle cx={n.x} cy={n.y} r={13}
                fill={NODE_STYLE[n.type].fill} fillOpacity="0.15"
                stroke={NODE_STYLE[n.type].stroke} strokeWidth="1.5"
              />
              <text x={n.x} y={labelY} textAnchor="middle"
                fill="#9ca3af" fontSize="8.5" fontFamily="monospace">
                {trunc(n.label, 14)}
              </text>
            </g>
          );
        })}

        {/* Center node */}
        <circle cx={cx} cy={cy} r={30} fill="#ef4444" fillOpacity="0.1" stroke="#ef4444" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={25} fill="#ef4444" fillOpacity="0.06" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
        <text x={cx} y={cy - 5}  textAnchor="middle" fill="#ef4444" fontSize="9.5" fontWeight="bold" fontFamily="sans-serif">
          {trunc(title, 17)}
        </text>
        <text x={cx} y={cy + 9}  textAnchor="middle" fill="#ef444488" fontSize="7.5" fontFamily="monospace">
          SUBJECT NODE
        </text>

        {/* Legend */}
        {usedTypes.slice(0, 5).map((type, i) => (
          <g key={`l-${type}`} transform={`translate(12, ${H - 86 + i * 16})`}>
            <circle cx={5} cy={5} r={4} fill={NODE_STYLE[type].fill} fillOpacity="0.9" />
            <text x={14} y={9} fill="#4b5563" fontSize="8" fontFamily="sans-serif">{type}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#0d1420", border: "1px solid #1a2640", borderRadius: 8, padding: "10px 12px" }}>
      <p style={{ color: "#4b5563", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ color: color || "#e5e7eb", fontSize: 15, fontWeight: 800, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ color: "#374151", fontSize: 9, marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function Panel({ title, children, noPad }: { title?: string; children: React.ReactNode; noPad?: boolean }) {
  return (
    <div style={{ background: "#0d1420", border: "1px solid #1a2640", borderRadius: 8, overflow: "hidden" }}>
      {title && (
        <div style={{ borderBottom: "1px solid #1a2640", padding: "8px 14px" }}>
          <p style={{ color: "#6b7280", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {title}
          </p>
        </div>
      )}
      <div style={noPad ? undefined : { padding: 14 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvestigationPage() {
  const navigate = useNavigate();
  const { moduleId, findingIndex } = useParams();
  const [showJson, setShowJson] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [moduleId, findingIndex]);

  const getModuleResult = useModulesStore((s) => s.getModuleResult);
  const setActiveModule = useModulesStore((s) => s.setActiveModule);
  const result = moduleId ? getModuleResult(moduleId) : null;
  const alerts = useAlertsStore((s) => s.alerts);

  const items = useMemo(() => {
    if (!moduleId || !result) return [];
    return getResultItems(moduleId, result);
  }, [moduleId, result]);

  const index = Number(findingIndex || 0);
  const item  = items[index];

  // ── empty state ─────────────────────────────────────────────────────────────
  if (!moduleId || !result || !item) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => navigate(-1)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0d1420",
            border: "1px solid #1a2640", color: "#9ca3af", borderRadius: 6, padding: "5px 12px",
            fontSize: 11, cursor: "pointer", marginBottom: 16 }}>
          <ArrowLeft size={11} /> Back
        </button>
        <div style={{ background: "#0d1420", border: "1px solid #1a2640", borderRadius: 8, padding: 28 }}>
          <h2 style={{ color: "#e5e7eb", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
            Investigation not found
          </h2>
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            Run the module again — results are held in memory per session.
          </p>
        </div>
      </div>
    );
  }

  // ── derive data ──────────────────────────────────────────────────────────────
  const accent      = MODULE_ACCENT[moduleId] || "#ef4444";
  const title       = getTitle(item, moduleId);
  const risk        = getRisk(item);
  const evidenceUrls = getEvidenceUrls(item);
  const entities    = getEntities(item);
  const whyFlagged  = getWhyFlagged(item);
  const actions     = getRecommendedActions(moduleId, item);
  const detailText  = getDetailText(item);
  const sc          = sevColor(item?.risk_level, risk);
  const sl          = sevLabel(item?.risk_level, risk);
  const entityType  = getEntityType(moduleId, item);
  const tags        = getTags(item, moduleId);
  const redFlags    = getRedFlags(item);
  const indicators  = getRiskIndicators(item, entities, risk);
  const entityCount = totalEntityCount(entities);
  const linkedAlerts = (alerts as any[]).filter((a) => a.module_id === moduleId).slice(0, 5);
  const clickable   = evidenceUrls.filter((u) => u.startsWith("http://") || u.startsWith("https://"));
  const darknet     = evidenceUrls.filter((u) => u.startsWith("darknet://"));
  const firstSeen   = item?.first_seen || item?.timestamp || item?.created_at;
  const lastSeen    = item?.last_seen  || item?.updated_at;

  // ── export report ────────────────────────────────────────────────────────────
  async function handleExportReport() {
    if (exporting) return;
    setExporting(true);
    try {
      // 1. Download finding-specific JSON immediately
      const reportData = {
        generated_at: new Date().toISOString(),
        platform: "ShadowGuard AFM Intelligence Platform",
        report_version: "1.0",
        finding: {
          id: `${moduleId}_${String(index + 1).padStart(3, "0")}`,
          module: (moduleId as string).toUpperCase(),
          title,
          risk_score: risk,
          severity: sl,
        },
        analyst_summary: detailText,
        tags,
        red_flags: redFlags,
        why_flagged: whyFlagged,
        recommended_actions: actions,
        risk_indicators: indicators,
        entities,
        evidence_urls: evidenceUrls,
        linked_alerts: linkedAlerts,
        first_seen: firstSeen,
        last_seen: lastSeen,
        raw_finding: item,
      };
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `shadowguard_${moduleId}_${String(index + 1).padStart(3, "0")}_report_${Date.now()}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);

      // 2. Generate full evidence package on backend (appears in Reports section)
      const taskId = (result as any)?.task_id || null;
      if (taskId) {
        await reportsApi.generate({
          module_id: moduleId as string,
          task_id: taskId,
          title: `${(moduleId as string).toUpperCase()} — ${title} (Risk ${risk}/100)`,
          include_raw_data: true,
        });
      }
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  }

  // ── run deep scan ────────────────────────────────────────────────────────────
  function handleRunDeepScan() {
    if (!moduleId) return;
    const deepParams = { demo_mode: false, max_channels: 50, max_items: 50, max_findings: 50 };
    localStorage.setItem(`sg_autorun_${moduleId}`, JSON.stringify(deepParams));
    setActiveModule(moduleId);
    navigate("/dashboard");
  }

  // ── add to case ──────────────────────────────────────────────────────────────
  async function handleAddToCase() {
    if (saving || saved) return;
    setSaving(true);
    try {
      await investigationsApi.create({
        title,
        description: detailText || `${(moduleId as string).toUpperCase()} intelligence finding — risk ${risk}/100`,
        module_ids: [moduleId as string],
        risk_level: sl.toLowerCase() as any,
        tags,
        findings_snapshot: [item],
      });
      setSaved(true);
    } catch (e) { console.error(e); }
    finally     { setSaving(false); }
  }

  // ── btn style helpers ─────────────────────────────────────────────────────────
  const btnBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer",
  };

  return (
    <div style={{ background: "#080d18", minHeight: "100%", padding: "16px 20px 48px" }}>

      {/* ══════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 14 }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
          <button onClick={() => navigate(-1)}
            style={{ ...btnBase, padding: "4px 10px", background: "#0d1420", border: "1px solid #1a2640", color: "#9ca3af" }}>
            <ArrowLeft size={11} /> Back
          </button>
          <span style={{ color: "#1f2937", fontSize: 11 }}>/</span>
          <span style={{ color: "#6b7280", fontSize: 11 }}>Investigation</span>
          <span style={{ color: "#1f2937", fontSize: 11 }}>/</span>
          <span style={{ color: "#6b7280", fontSize: 11 }}>Nodes</span>
          <span style={{ color: "#1f2937", fontSize: 11 }}>/</span>
          <span style={{ color: accent, fontSize: 11, fontWeight: 700 }}>
            {moduleId.toUpperCase()}_{String(index + 1).padStart(3, "0")}
          </span>
        </div>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{
                padding: "2px 10px", borderRadius: 4, fontSize: 9.5, fontWeight: 700,
                background: `${accent}18`, color: accent, border: `1px solid ${accent}40`, letterSpacing: "0.1em",
              }}>
                {moduleId.toUpperCase()}
              </span>
              <span style={{
                padding: "2px 10px", borderRadius: 4, fontSize: 9.5, fontWeight: 700,
                background: `${sc}18`, color: sc, border: `1px solid ${sc}40`, letterSpacing: "0.08em",
              }}>
                {sl}
              </span>
            </div>
            <h1 style={{ color: "#f0f4f8", fontSize: 21, fontWeight: 800, lineHeight: 1.2, margin: 0 }}>
              {title}
            </h1>
          </div>

          {/* Action buttons + risk orb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button onClick={handleExportReport} disabled={exporting}
              style={{ ...btnBase, background: "#0d1420", border: "1px solid #1a2640", color: exporting ? "#4b5563" : "#9ca3af", cursor: exporting ? "not-allowed" : "pointer" }}>
              <Download size={12} /> {exporting ? "Exporting…" : "Export Report"}
            </button>
            <button onClick={handleAddToCase}
              style={{
                ...btnBase,
                background: saved ? "rgba(34,197,94,0.1)" : "#0d1420",
                border: `1px solid ${saved ? "rgba(34,197,94,0.4)" : "#1a2640"}`,
                color: saved ? "#22c55e" : "#9ca3af",
              }}>
              <FolderPlus size={12} />
              {saved ? "Saved" : saving ? "Saving…" : "Add to Case"}
            </button>
            <button onClick={handleRunDeepScan}
              style={{ ...btnBase, background: `${accent}18`, border: `1px solid ${accent}40`, color: accent }}>
              <Zap size={12} /> Run Deep Scan
            </button>
            {/* Risk score orb */}
            <div style={{
              width: 58, height: 58, borderRadius: "50%", flexShrink: 0,
              background: `radial-gradient(circle, ${sc}20 0%, transparent 70%)`,
              border: `2px solid ${sc}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: sc, fontWeight: 900, fontSize: 16, lineHeight: 1 }}>{risk}</span>
              <span style={{ color: `${sc}99`, fontSize: 7, fontWeight: 600 }}>/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          KPI STRIP  (7 cards)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 14 }}>
        <KpiCard label="Module"      value={moduleId.toUpperCase()}         color={accent} />
        <KpiCard label="Entity Type" value={entityType}                                    />
        <KpiCard label="Risk Score"  value={`${risk}/100`}                  color={sc}     />
        <KpiCard label="Severity"    value={sl}                             color={sc}     />
        <KpiCard label="Evidence"    value={evidenceUrls.length}            sub="source links" />
        <KpiCard label="Entities"    value={entityCount}                    sub="extracted" />
        <KpiCard label="First Seen"  value={fmtDateShort(firstSeen)}        sub={lastSeen ? `Last: ${fmtDateShort(lastSeen)}` : undefined} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3-COLUMN BODY
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "310px 1fr 290px", gap: 12, alignItems: "start" }}>

        {/* ══ LEFT — Entity profile, entities, metrics, timeline ══════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Node Information */}
          <Panel title="Node Information">
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {([
                ["Entity Name",   title],
                ["Type",          entityType],
                ["Module",        moduleId.toUpperCase()],
                ["Status",        "Active"],
                ["Risk Score",    `${risk}/100`],
                ["Confidence",    item?.confidence],
                ["Source",        item?.source_name || item?.source_type],
                ["City / Region", item?.city || item?.region || item?.location],
              ] as [string, any][]).map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: "#4b5563", fontSize: 10, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: "#d1d5db", fontSize: 10.5, fontWeight: 500, textAlign: "right", wordBreak: "break-all" }}>
                    {String(val || "—")}
                  </span>
                </div>
              ))}
              {(item?.description || item?.event_details) && (
                <div style={{ marginTop: 6, paddingTop: 8, borderTop: "1px solid #1a2640" }}>
                  <p style={{ color: "#6b7280", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
                    Description
                  </p>
                  <p style={{ color: "#9ca3af", fontSize: 10.5, lineHeight: 1.5 }}>
                    {String(item.description || item.event_details || "").slice(0, 200)}
                    {String(item.description || "").length > 200 ? "…" : ""}
                  </p>
                </div>
              )}
            </div>
          </Panel>

          {/* Extracted Entities */}
          <Panel title="Extracted Entities">
            {entityCount === 0 ? (
              <p style={{ color: "#374151", fontSize: 11 }}>No entities extracted from this finding.</p>
            ) : (
              Object.entries(entities).map(([key, values]) => {
                if (values.length === 0) return null;
                const typeColors: Record<string, string> = {
                  telegram: "#3b82f6", wallets: "#f59e0b", domains: "#22c55e",
                  phones: "#a855f7", banks: "#f97316", platforms: "#06b6d4",
                };
                const c = typeColors[key] || "#6b7280";
                return (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <p style={{ color: "#374151", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
                      {key} ({values.length})
                    </p>
                    {values.slice(0, 4).map((v: any, i: number) => (
                      <div key={i} style={{
                        fontSize: 10, padding: "2px 7px", borderRadius: 4, marginBottom: 3,
                        background: `${c}0d`, color: c, border: `1px solid ${c}22`,
                        wordBreak: "break-all", lineHeight: 1.4,
                      }}>
                        {String(v)}
                      </div>
                    ))}
                    {values.length > 4 && (
                      <p style={{ color: "#374151", fontSize: 9, marginTop: 2 }}>+{values.length - 4} more</p>
                    )}
                  </div>
                );
              })
            )}
          </Panel>

          {/* Tags */}
          {tags.length > 0 && (
            <Panel title="Tags">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {tags.map((t, i) => (
                  <span key={i} style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 10,
                    background: `${accent}14`, color: accent, border: `1px solid ${accent}28`,
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </Panel>
          )}

          {/* Key Metrics */}
          <Panel title="Key Metrics">
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {([
                ["Risk Score",         `${risk}/100`,              sc],
                ["Evidence Sources",   String(evidenceUrls.length), "#3b82f6"],
                ["Total Entities",     String(entityCount),         "#22c55e"],
                ["Telegram Handles",   String(entities.telegram.length), "#3b82f6"],
                ["Wallet Addresses",   String(entities.wallets.length),  "#f59e0b"],
                ["Domains",            String(entities.domains.length),  "#22c55e"],
                ["Phone Numbers",      String(entities.phones.length),   "#a855f7"],
                ["Red Flags",          String(redFlags.length),           "#ef4444"],
              ] as [string, string, string][]).map(([label, val, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6b7280", fontSize: 9.5 }}>{label}</span>
                  <span style={{ color, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{val}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Timeline */}
          {(firstSeen || lastSeen) && (
            <Panel title="Timeline">
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {firstSeen && (
                  <div>
                    <p style={{ color: "#374151", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>First Seen</p>
                    <p style={{ color: "#9ca3af", fontSize: 10, fontFamily: "monospace" }}>{fmtDate(firstSeen)}</p>
                  </div>
                )}
                {lastSeen && (
                  <div>
                    <p style={{ color: "#374151", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Last Seen</p>
                    <p style={{ color: "#9ca3af", fontSize: 10, fontFamily: "monospace" }}>{fmtDate(lastSeen)}</p>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>

        {/* ══ CENTER — Graph, signals, evidence ═══════════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Entity Relationship Graph */}
          <Panel title="Entity Relationship Graph" noPad>
            <div style={{ padding: "0 0 2px" }}>
              <MiniIntelGraph title={title} entities={entities} evidenceUrls={clickable} />
            </div>
            {/* Legend row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "8px 14px", borderTop: "1px solid #0f1a2e" }}>
              {(Object.entries(NODE_STYLE).filter(([t]) => t !== "center") as [NodeType, {fill: string; stroke: string}][]).map(([type, c]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.fill }} />
                  <span style={{ color: "#374151", fontSize: 8.5 }}>{type}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Detection Signal (Why flagged) */}
          <Panel title="Detection Signal">
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {whyFlagged.map((reason, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#3b82f6", fontSize: 8.5, fontWeight: 800,
                  }}>
                    {i + 1}
                  </div>
                  <p style={{ color: "#9ca3af", fontSize: 11, lineHeight: 1.5, paddingTop: 2 }}>{reason}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Intelligence Summary */}
          {detailText && (
            <Panel title="Intelligence Summary">
              <p style={{ color: "#9ca3af", fontSize: 11.5, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {detailText}
              </p>
            </Panel>
          )}

          {/* AI Classification */}
          <AIClassificationPanel ml={item?.ml_classification} />

          {/* Evidence Table */}
          <Panel title={`Evidence Sources  ·  ${evidenceUrls.length} records`} noPad>
            {evidenceUrls.length === 0 ? (
              <p style={{ padding: 14, color: "#374151", fontSize: 11 }}>No evidence links attached to this finding.</p>
            ) : (
              <div>
                {/* Table header */}
                <div style={{
                  display: "grid", gridTemplateColumns: "160px 1fr 140px",
                  gap: 8, padding: "5px 14px",
                  borderBottom: "1px solid #0f1a2e",
                  background: "#060d1a",
                }}>
                  {["Source", "URL / Reference", "Action"].map((h) => (
                    <span key={h} style={{ color: "#1f2937", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {h}
                    </span>
                  ))}
                </div>
                {evidenceUrls.map((url, idx) => {
                  const label       = labelEvidence(url, idx);
                  const isHttp      = url.startsWith("http://") || url.startsWith("https://");
                  const isOnion     = url.includes(".onion");
                  const isDarkRef   = url.startsWith("darknet://");
                  const isOsintRef  = url.startsWith("osint://");
                  const rowColor    = isDarkRef || isOnion ? "#f59e0b" : isOsintRef ? "#a78bfa" : isHttp ? "#3b82f6" : "#6b7280";
                  return (
                    <div key={idx} style={{
                      display: "grid", gridTemplateColumns: "160px 1fr 140px",
                      gap: 8, padding: "7px 14px", alignItems: "center",
                      borderBottom: "1px solid #0a1220",
                      background: idx % 2 === 1 ? "#060d1a" : "transparent",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: rowColor, flexShrink: 0 }} />
                        <span style={{ color: "#9ca3af", fontSize: 10 }}>{label}</span>
                      </div>
                      <span style={{
                        color: "#4b5563", fontSize: 9, fontFamily: "monospace",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {url}
                      </span>
                      {/* Action column — three-way logic */}
                      {isHttp && !isOnion ? (
                        <a href={url} target="_blank" rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: rowColor, fontSize: 9, textDecoration: "none" }}>
                          <ExternalLink size={9} /> Open
                        </a>
                      ) : isOnion ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 8, color: "#f59e0b", fontWeight: 700 }}>Requires Tor</span>
                          <a href="https://www.torproject.org/download/" target="_blank" rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#f59e0b", fontSize: 8, textDecoration: "none", opacity: 0.8 }}>
                            <ExternalLink size={7} /> Get Tor Browser
                          </a>
                        </div>
                      ) : isDarkRef ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 8, color: "#f59e0b", fontWeight: 700 }}>DarkNet Ref</span>
                          <a href={`https://www.google.com/search?q=${osintKeywords(url)}`} target="_blank" rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#9ca3af", fontSize: 8, textDecoration: "none", opacity: 0.8 }}>
                            <ExternalLink size={7} /> Search OSINT
                          </a>
                        </div>
                      ) : isOsintRef ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 8, color: "#a78bfa", fontWeight: 700 }}>OSINT Ref</span>
                          <a href={osintSearchUrl(url)} target="_blank" rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#a78bfa", fontSize: 8, textDecoration: "none", opacity: 0.8 }}>
                            <ExternalLink size={7} /> Search Intel
                          </a>
                        </div>
                      ) : (
                        <span style={{ color: "#374151", fontSize: 9 }}>Internal ref</span>
                      )}
                    </div>
                  );
                })}

                {/* Navigation Guide — shown only when non-HTTP evidence exists */}
                {evidenceUrls.some(u => !u.startsWith("http") || u.includes(".onion")) && (
                  <div style={{ padding: "10px 14px", borderTop: "1px solid #0f1a2e", background: "#04080f" }}>
                    <p style={{ color: "#374151", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                      Navigation Guide
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                      {/* OSINT Ref guidance */}
                      {evidenceUrls.some(u => u.startsWith("osint://")) && (
                        <div style={{ padding: "8px 10px", borderRadius: 5, background: "#0d0a1f", border: "1px solid #2e1065" }}>
                          <p style={{ color: "#a78bfa", fontSize: 9, fontWeight: 700, marginBottom: 5 }}>
                            OSINT References — Manual Investigation Steps
                          </p>
                          <ol style={{ margin: 0, paddingLeft: 14, color: "#7c3aed", fontSize: 8.5, lineHeight: 1.7 }}>
                            <li>Use the finding title and tagged entities as search terms</li>
                            <li>Search <strong style={{ color: "#a78bfa" }}>VirusTotal</strong> (virustotal.com) — paste domains, IPs, or hashes</li>
                            <li>Search <strong style={{ color: "#a78bfa" }}>Shodan</strong> (shodan.io) — pivot on IP addresses or hostnames</li>
                            <li>Search <strong style={{ color: "#a78bfa" }}>LeakIX</strong> (leakix.net) — database exposure and credential leaks</li>
                            <li>Search <strong style={{ color: "#a78bfa" }}>IntelX</strong> (intelx.io) — darkweb pastes and breach archives</li>
                            <li>Check <strong style={{ color: "#a78bfa" }}>KZ-CERT</strong> (kz-cert.kz) for Kazakhstan-specific threat advisories</li>
                            <li>Check <strong style={{ color: "#a78bfa" }}>AFSA</strong> (afsa.kz) for financial intelligence reports</li>
                            <li>Cross-reference with <strong style={{ color: "#a78bfa" }}>abuse.ch</strong> for malware indicators</li>
                          </ol>
                          <p style={{ color: "#4c1d95", fontSize: 8, marginTop: 5, fontStyle: "italic" }}>
                            The "Search Intel" button above opens a pre-filled Google search for the reference path.
                          </p>
                        </div>
                      )}

                      {/* DarkNet Ref guidance */}
                      {evidenceUrls.some(u => u.startsWith("darknet://")) && (
                        <div style={{ padding: "8px 10px", borderRadius: 5, background: "#0d0f0a", border: "1px solid #713f12" }}>
                          <p style={{ color: "#f59e0b", fontSize: 9, fontWeight: 700, marginBottom: 5 }}>
                            DarkNet References — Tor Access Guide
                          </p>
                          <ol style={{ margin: 0, paddingLeft: 14, color: "#a16207", fontSize: 8.5, lineHeight: 1.7 }}>
                            <li>Download and install <strong style={{ color: "#f59e0b" }}>Tor Browser</strong> from torproject.org</li>
                            <li>Launch Tor Browser and wait for the circuit to connect</li>
                            <li>Copy the full <code style={{ background: "#1c1000", padding: "0 3px", borderRadius: 2, color: "#fbbf24", fontSize: 8 }}>.onion</code> address from the reference field above</li>
                            <li>Paste the address into the Tor Browser URL bar and press Enter</li>
                            <li>If the page is unreachable, the site may be offline — check <strong style={{ color: "#f59e0b" }}>Ahmia.fi</strong> for cached versions</li>
                            <li style={{ color: "#dc2626", fontWeight: 700 }}>OPSEC: never access .onion sites from your regular browser or home IP address</li>
                            <li>For passive intel, use <strong style={{ color: "#f59e0b" }}>DarkSearch.io</strong> to search dark web content without direct access</li>
                          </ol>
                        </div>
                      )}

                      {/* Onion URL guidance */}
                      {evidenceUrls.some(u => u.includes(".onion")) && !evidenceUrls.some(u => u.startsWith("darknet://")) && (
                        <div style={{ padding: "8px 10px", borderRadius: 5, background: "#0d0f0a", border: "1px solid #713f12" }}>
                          <p style={{ color: "#f59e0b", fontSize: 9, fontWeight: 700, marginBottom: 5 }}>
                            .onion URL — Tor Browser Required
                          </p>
                          <ol style={{ margin: 0, paddingLeft: 14, color: "#a16207", fontSize: 8.5, lineHeight: 1.7 }}>
                            <li>Download <strong style={{ color: "#f59e0b" }}>Tor Browser</strong> at torproject.org (free, open-source)</li>
                            <li>Open Tor Browser and connect to the Tor network (takes ~30 seconds)</li>
                            <li>Paste the full <code style={{ background: "#1c1000", padding: "0 3px", borderRadius: 2, color: "#fbbf24", fontSize: 8 }}>.onion</code> URL into the address bar</li>
                            <li>Document findings and screenshots before the site goes offline</li>
                            <li style={{ color: "#dc2626", fontWeight: 700 }}>Never use a regular browser — .onion sites require the Tor network</li>
                          </ol>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* ══ RIGHT — Risk, actions, red flags, alerts ════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Risk Indicators */}
          <Panel title="Risk Indicators">
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {indicators.map((ind, i) => {
                const c = SEV_COLORS[ind.severity];
                return (
                  <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ color: "#e5e7eb", fontSize: 10.5, fontWeight: 600 }}>{ind.label}</span>
                        <span style={{
                          fontSize: 7.5, padding: "1px 5px", borderRadius: 3, fontWeight: 700,
                          background: c.bg, color: c.text, border: `1px solid ${c.border}`, textTransform: "uppercase",
                        }}>
                          {ind.severity}
                        </span>
                      </div>
                      <p style={{ color: "#6b7280", fontSize: 9.5, lineHeight: 1.4 }}>{ind.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Recommended AFM Actions */}
          <Panel title="Recommended AFM Actions">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {actions.map((action, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    background: `${accent}18`, border: `1px solid ${accent}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: accent, fontSize: 8, fontWeight: 800,
                  }}>
                    {i + 1}
                  </div>
                  <p style={{ color: "#9ca3af", fontSize: 10.5, lineHeight: 1.45, paddingTop: 1 }}>{action}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Red Flags */}
          {redFlags.length > 0 && (
            <Panel title="Red Flags">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {redFlags.map((flag, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <span style={{ color: "#ef4444", fontSize: 13, flexShrink: 0, lineHeight: 1.2 }}>›</span>
                    <p style={{ color: "#d1d5db", fontSize: 10.5, lineHeight: 1.4 }}>{String(flag)}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Linked Alerts */}
          <Panel title={`Linked Alerts  ·  ${linkedAlerts.length}`}>
            {linkedAlerts.length === 0 ? (
              <p style={{ color: "#374151", fontSize: 10.5 }}>No alerts for this module in current session.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {linkedAlerts.map((alert: any, i: number) => {
                  const sev = (alert.severity || "medium") as keyof typeof SEV_COLORS;
                  const c   = SEV_COLORS[sev] || SEV_COLORS.medium;
                  return (
                    <div key={i} style={{ padding: "7px 8px", borderRadius: 6, background: "#111827", border: "1px solid #1a2640" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ color: "#c9d3e0", fontSize: 9.5, fontWeight: 600, flex: 1, marginRight: 6, lineHeight: 1.3 }}>
                          {String(alert.title || "Alert").slice(0, 45)}{String(alert.title || "").length > 45 ? "…" : ""}
                        </span>
                        <span style={{
                          fontSize: 7.5, padding: "1px 5px", borderRadius: 3, flexShrink: 0, fontWeight: 700,
                          background: c.bg, color: c.text, border: `1px solid ${c.border}`, textTransform: "uppercase",
                        }}>
                          {sev}
                        </span>
                      </div>
                      <p style={{ color: "#374151", fontSize: 8.5, fontFamily: "monospace" }}>
                        {alert.created_at
                          ? new Date(alert.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })
                          : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Evidence Summary */}
          <Panel title="Evidence Summary">
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {([
                ["Telegram Links",  evidenceUrls.filter((u) => u.includes("t.me")).length],
                ["Web Sources",     evidenceUrls.filter((u) => u.startsWith("http") && !u.includes("t.me")).length],
                ["DarkNet Refs",    darknet.length],
                ["GitHub Links",    evidenceUrls.filter((u) => u.includes("github.com")).length],
                ["Reddit Links",    evidenceUrls.filter((u) => u.includes("reddit.com")).length],
              ] as [string, number][]).map(([label, count]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6b7280", fontSize: 9.5 }}>{label}</span>
                  <span style={{
                    background: "#111827", border: "1px solid #1a2640",
                    borderRadius: 4, padding: "1px 8px", color: "#9ca3af", fontSize: 10, fontFamily: "monospace",
                  }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TECHNICAL RECORD (collapsible JSON)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: 14 }}>
        <div style={{ background: "#0d1420", border: "1px solid #1a2640", borderRadius: 8, overflow: "hidden" }}>
          <button
            onClick={() => setShowJson((v) => !v)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "9px 14px",
              background: "transparent", border: "none", cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileJson size={13} color="#374151" />
              <span style={{ color: "#4b5563", fontSize: 10.5, fontWeight: 600 }}>
                Technical Intelligence Record
              </span>
              <span style={{
                fontSize: 8.5, padding: "1px 6px", borderRadius: 3, fontWeight: 600,
                background: "#111827", color: "#374151", border: "1px solid #1a2640",
              }}>
                JSON
              </span>
            </div>
            <span style={{ color: "#374151", fontSize: 9.5 }}>
              {showJson ? "▲ Collapse" : "▼ Show Technical JSON"}
            </span>
          </button>

          {showJson && (
            <pre style={{
              margin: 0, padding: "12px 14px",
              background: "#060c17", color: "#4b5563",
              borderTop: "1px solid #1a2640",
              fontSize: 9.5, fontFamily: "monospace",
              overflow: "auto", maxHeight: 420, lineHeight: 1.55,
            }}>
              {JSON.stringify(item, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
