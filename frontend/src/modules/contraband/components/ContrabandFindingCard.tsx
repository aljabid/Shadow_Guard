import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ExternalLink,
  FileSearch,
  MapPin,
  Phone,
  Search,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import RiskScoreBadge from "@/components/common/RiskScoreBadge";
import MLBadge from "@/components/shared/MLBadge";
import { ContrabandFinding } from "../types";
import { getContrabandCategoryColor } from "../utils/contrabandColors";
import { formatCategory, shortenText } from "../utils/contrabandFormatters";
import { getEvidenceCount } from "../utils/contrabandEvidence";
import { getRecommendedPriority } from "../utils/contrabandRisk";

interface Props {
  finding: ContrabandFinding;
  index: number;
}

function getEvidenceUrls(finding: ContrabandFinding): string[] {
  const sourceData = finding.source_data || {};

  return Array.from(
    new Set(
      [
        finding.source_url,
        finding.url,
        ...(finding.evidence_urls || []),
        ...(sourceData.evidence_urls || []),
        ...(sourceData.telegram_links || []),
        ...(sourceData.web_links || []),
        ...(sourceData.onion_links || []),
        ...(sourceData.github_links || []),
        ...(sourceData.reddit_links || []),
      ]
        .filter(Boolean)
        .map((url) => String(url))
    )
  );
}

export default function ContrabandFindingCard({ finding, index }: Props) {
  const category = finding.crime_category || "CONTRABAND_INTELLIGENCE";
  const categoryColor = getContrabandCategoryColor(category);
  const entities = finding.entities || {};
  const evidenceUrls = getEvidenceUrls(finding);
  const evidenceCount = getEvidenceCount(finding);
  const riskScore = Number(finding.risk_score || 0);

  return (
    <div
      className="relative overflow-hidden rounded p-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.72))",
        border: "1px solid var(--soc-border)",
      }}
    >
      <div
        className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl"
        style={{ background: `${categoryColor}33` }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className="text-xs px-2 py-0.5 rounded font-semibold uppercase"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--soc-border)",
                  color: categoryColor,
                }}
              >
                {formatCategory(category)}
              </span>

              <span
                className="text-xs px-2 py-0.5 rounded uppercase"
                style={{
                  background: "rgba(59,130,246,0.12)",
                  color: "#60a5fa",
                }}
              >
                {finding.source_type || "unknown source"}
              </span>

              <span
                className="text-xs px-2 py-0.5 rounded uppercase"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  color: "var(--soc-amber)",
                }}
              >
                Priority: {getRecommendedPriority(riskScore)}
              </span>

              {finding.evidence_priority && (
                <span
                  className="text-xs px-2 py-0.5 rounded uppercase"
                  style={{
                    background: "rgba(16,185,129,0.1)",
                    color: "var(--soc-green)",
                  }}
                >
                  Evidence: {finding.evidence_priority}
                </span>
              )}
            </div>

            <h3
              className="text-sm font-bold"
              style={{ color: "var(--soc-text)" }}
            >
              {finding.title || "Unknown contraband finding"}
            </h3>

            <p className="text-xs mt-1" style={{ color: "var(--soc-muted)" }}>
              Source: {finding.source_name || finding.source || "unknown"} ·
              City: {finding.city || "unknown"} · Country:{" "}
              {finding.country || "Kazakhstan"}
            </p>
          </div>

          <RiskScoreBadge score={riskScore} size="sm" />
        </div>

        {finding.analyst_summary && (
          <div
            className="mt-4 p-3 rounded"
            style={{
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.18)",
            }}
          >
            <p
              className="text-xs font-semibold mb-1 flex items-center gap-1"
              style={{ color: "#60a5fa" }}
            >
              <ShieldAlert size={12} />
              Analyst Summary
            </p>

            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--soc-muted)" }}
            >
              {shortenText(finding.analyst_summary, 260)}
            </p>
          </div>
        )}

        <MLBadge ml={finding.ml_classification} />

        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="rounded p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[10px]" style={{ color: "var(--soc-muted)" }}>
              Telegram
            </p>
            <p className="text-xs font-semibold" style={{ color: "var(--soc-text)" }}>
              {(entities.telegram_handles || []).length}
            </p>
          </div>

          <div className="rounded p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[10px]" style={{ color: "var(--soc-muted)" }}>
              Phones
            </p>
            <p className="text-xs font-semibold" style={{ color: "var(--soc-text)" }}>
              {(entities.phones || []).length}
            </p>
          </div>

          <div className="rounded p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[10px]" style={{ color: "var(--soc-muted)" }}>
              Wallets
            </p>
            <p className="text-xs font-semibold" style={{ color: "var(--soc-text)" }}>
              {(entities.wallets || []).length}
            </p>
          </div>

          <div className="rounded p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[10px]" style={{ color: "var(--soc-muted)" }}>
              Evidence
            </p>
            <p className="text-xs font-semibold" style={{ color: "var(--soc-text)" }}>
              {evidenceCount}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(entities.locations || []).slice(0, 4).map((location) => (
            <span
              key={location}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{
                background: "rgba(59,130,246,0.1)",
                color: "#60a5fa",
              }}
            >
              <MapPin size={11} />
              {location}
            </span>
          ))}

          {(entities.wallets || []).slice(0, 2).map((wallet) => (
            <span
              key={wallet}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{
                background: "rgba(16,185,129,0.1)",
                color: "var(--soc-green)",
              }}
            >
              <Wallet size={11} />
              {shortenText(wallet, 18)}
            </span>
          ))}

          {(entities.phones || []).slice(0, 2).map((phone) => (
            <span
              key={phone}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{
                background: "rgba(245,158,11,0.1)",
                color: "var(--soc-amber)",
              }}
            >
              <Phone size={11} />
              {phone}
            </span>
          ))}
        </div>

        {Array.isArray(finding.red_flags) && finding.red_flags.length > 0 && (
          <div className="mt-4">
            <p
              className="text-xs font-semibold mb-2 flex items-center gap-1"
              style={{ color: "var(--soc-red)" }}
            >
              <AlertTriangle size={12} />
              Red Flags
            </p>

            <div className="space-y-1">
              {finding.red_flags.slice(0, 4).map((flag, idx) => (
                <p
                  key={idx}
                  className="text-xs"
                  style={{ color: "var(--soc-muted)" }}
                >
                  {idx + 1}. {flag}
                </p>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(finding.recommended_actions) &&
          finding.recommended_actions.length > 0 && (
            <div className="mt-4">
              <p
                className="text-xs font-semibold mb-2 flex items-center gap-1"
                style={{ color: "var(--soc-text)" }}
              >
                <FileSearch size={12} />
                Recommended Actions
              </p>

              <div className="space-y-1">
                {finding.recommended_actions.slice(0, 4).map((action, idx) => (
                  <p
                    key={idx}
                    className="text-xs"
                    style={{ color: "var(--soc-muted)" }}
                  >
                    {idx + 1}. {action}
                  </p>
                ))}
              </div>
            </div>
          )}

        <div className="mt-4 flex flex-wrap gap-2">
          {evidenceUrls.slice(0, 5).map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: "var(--soc-accent)" }}
            >
              Open Evidence {idx + 1}
              <ExternalLink size={10} />
            </a>
          ))}

          <Link
            to={`/investigation/contraband/${index}`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
            style={{
              background: "rgba(59,130,246,0.15)",
              color: "#60a5fa",
              border: "1px solid rgba(59,130,246,0.35)",
            }}
          >
            <Search size={12} />
            Investigate
          </Link>
        </div>
      </div>
    </div>
  );
}