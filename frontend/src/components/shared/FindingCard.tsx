import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import RiskScoreBadge from "@/components/common/RiskScoreBadge";
import { isClickableUrl } from "@/utils/evidence";

export interface FindingTag {
  label: string;
  color?: string;
  bg?: string;
}

export interface FindingCardProps {
  title: string;
  category: string;
  categoryColor?: string;
  riskScore: number;
  /** One-line key metrics summary shown in the collapsed card */
  subtitle: string;
  tags?: FindingTag[];
  analystSummary?: string;
  redFlags?: string[];
  recommendedActions?: string[];
  evidenceUrls?: string[];
  investigateHref?: string;
  onResolve?: () => void;
  isResolved?: boolean;
  /** Module-specific content shown between subtitle and action buttons (e.g. signal chart) */
  extra?: React.ReactNode;
}

export default function FindingCard({
  title,
  category,
  categoryColor,
  riskScore,
  subtitle,
  tags = [],
  analystSummary,
  redFlags,
  recommendedActions,
  evidenceUrls = [],
  investigateHref,
  onResolve,
  isResolved,
  extra,
}: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    !!analystSummary ||
    (redFlags && redFlags.length > 0) ||
    (recommendedActions && recommendedActions.length > 0) ||
    evidenceUrls.length > 1;

  const clickableEvidenceUrls = evidenceUrls.filter(isClickableUrl);
  const nonClickableRefs = evidenceUrls.filter((u) => !isClickableUrl(u));

  return (
    <div
      className="rounded overflow-hidden"
      style={{
        background: "var(--soc-surface-2)",
        border: "1px solid var(--soc-border)",
      }}
    >
      {/* COLLAPSED VIEW */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Category + tags row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span
                className="text-xs px-2 py-0.5 rounded font-semibold"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--soc-border)",
                  color: categoryColor || "var(--soc-muted)",
                  textTransform: "uppercase",
                }}
              >
                {category}
              </span>

              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: tag.bg || "rgba(245,158,11,0.1)",
                    color: tag.color || "var(--soc-amber)",
                  }}
                >
                  {tag.label}
                </span>
              ))}
            </div>

            {/* Title */}
            <p
              className="text-sm font-semibold leading-snug"
              style={{ color: "var(--soc-text)" }}
            >
              {title}
            </p>

            {/* Key metrics subtitle */}
            {subtitle && (
              <p className="text-xs mt-1" style={{ color: "var(--soc-muted)" }}>
                {subtitle}
              </p>
            )}

            {/* Module-specific extra content (charts etc.) */}
            {extra && <div className="mt-3">{extra}</div>}

            {/* ACTION BUTTONS */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Primary evidence link */}
              {clickableEvidenceUrls.length > 0 && (
                <a
                  href={clickableEvidenceUrls[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    color: "var(--soc-amber)",
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}
                >
                  <ExternalLink size={11} />
                  Evidence
                  {clickableEvidenceUrls.length > 1
                    ? ` (${clickableEvidenceUrls.length})`
                    : ""}
                </a>
              )}

              {/* Details toggle */}
              {hasDetails && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                  style={{
                    background: expanded
                      ? "rgba(59,130,246,0.2)"
                      : "rgba(59,130,246,0.08)",
                    color: "#60a5fa",
                    border: "1px solid rgba(59,130,246,0.3)",
                  }}
                >
                  {expanded ? (
                    <ChevronUp size={11} />
                  ) : (
                    <ChevronDown size={11} />
                  )}
                  {expanded ? "Collapse" : "Details"}
                </button>
              )}

              {/* Investigate */}
              {investigateHref && (
                <Link
                  to={investigateHref}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                  style={{
                    background: "rgba(59,130,246,0.12)",
                    color: "#60a5fa",
                    border: "1px solid rgba(59,130,246,0.3)",
                  }}
                >
                  <Search size={11} />
                  Investigate
                </Link>
              )}

              {/* Resolve / Resolved */}
              {onResolve && !isResolved ? (
                <button
                  onClick={onResolve}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                  style={{
                    background: "rgba(16,185,129,0.1)",
                    color: "var(--soc-green)",
                    border: "1px solid rgba(16,185,129,0.25)",
                  }}
                >
                  <CheckCircle2 size={11} />
                  Resolve
                </button>
              ) : isResolved ? (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                  style={{
                    background: "rgba(16,185,129,0.06)",
                    color: "var(--soc-green)",
                    border: "1px solid rgba(16,185,129,0.18)",
                    opacity: 0.8,
                  }}
                >
                  <CheckCircle2 size={11} />
                  Resolved
                </span>
              ) : null}
            </div>
          </div>

          {/* Risk badge — top right */}
          <div className="flex-shrink-0">
            <RiskScoreBadge score={riskScore} size="sm" />
          </div>
        </div>
      </div>

      {/* EXPANDED DETAILS PANEL */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-3"
          style={{ borderTop: "1px solid var(--soc-border)", background: "rgba(0,0,0,0.15)" }}
        >
          {/* Analyst Summary */}
          {analystSummary && (
            <div
              className="mb-4 p-3 rounded"
              style={{
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <p
                className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"
                style={{ color: "#60a5fa" }}
              >
                <ShieldAlert size={12} />
                Analyst Summary
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--soc-muted)" }}
              >
                {analystSummary}
              </p>
            </div>
          )}

          {/* Red Flags */}
          {redFlags && redFlags.length > 0 && (
            <div className="mb-4">
              <p
                className="text-xs font-semibold mb-2 flex items-center gap-1.5"
                style={{ color: "var(--soc-text)" }}
              >
                <AlertTriangle size={11} style={{ color: "var(--soc-accent)" }} />
                Red Flags
              </p>
              <ul className="space-y-1.5">
                {redFlags.map((flag, i) => (
                  <li
                    key={i}
                    className="text-xs flex items-start gap-2"
                    style={{ color: "var(--soc-muted)" }}
                  >
                    <span
                      className="text-xs font-bold flex-shrink-0 mt-px"
                      style={{ color: "var(--soc-accent)" }}
                    >
                      ›
                    </span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions */}
          {recommendedActions && recommendedActions.length > 0 && (
            <div className="mb-4">
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: "var(--soc-text)" }}
              >
                Recommended Actions
              </p>
              <ol className="space-y-1.5">
                {recommendedActions.map((action, i) => (
                  <li
                    key={i}
                    className="text-xs flex items-start gap-2"
                    style={{ color: "var(--soc-muted)" }}
                  >
                    <span
                      className="text-xs font-bold flex-shrink-0"
                      style={{ color: "var(--soc-amber)" }}
                    >
                      {i + 1}.
                    </span>
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* All evidence URLs */}
          {clickableEvidenceUrls.length > 0 && (
            <div className="mb-3">
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: "var(--soc-text)" }}
              >
                Evidence Sources ({clickableEvidenceUrls.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {clickableEvidenceUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: "var(--soc-accent)" }}
                  >
                    Source {i + 1}
                    <ExternalLink size={9} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Non-clickable refs (e.g. onion addresses) */}
          {nonClickableRefs.length > 0 && (
            <div>
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: "var(--soc-text)" }}
              >
                Reference Identifiers
              </p>
              <div className="flex flex-wrap gap-2">
                {nonClickableRefs.map((ref, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{
                      background: "var(--soc-surface)",
                      border: "1px solid var(--soc-border)",
                      color: "var(--soc-muted)",
                    }}
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
