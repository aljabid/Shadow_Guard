import {
  AlertTriangle,
  Clock,
  ExternalLink,
  PackageSearch,
  ShieldAlert,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { ContrabandFinding } from "../types";
import { getContrabandCategoryColor } from "../utils/contrabandColors";
import { formatCategory, shortenText } from "../utils/contrabandFormatters";
import { getRiskLabel } from "../utils/contrabandRisk";

interface Props {
  findings?: ContrabandFinding[];
}

function getFindingTime(finding: ContrabandFinding, index: number): string {
  const raw =
    (finding as any).created_at ||
    (finding as any).timestamp ||
    (finding as any).detected_at ||
    null;

  if (raw) {
    try {
      return new Date(raw).toLocaleTimeString();
    } catch {
      return String(raw);
    }
  }

  return `T+${index + 1}`;
}

function getSourceUrl(finding: ContrabandFinding): string | null {
  return finding.source_url || finding.url || finding.source_data?.source_url || null;
}

export default function ContrabandTimeline({ findings = [] }: Props) {
  const navigate = useNavigate();

  const sorted = [...findings].sort(
    (a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0)
  );

  return (
    <div className="card relative overflow-hidden">
      <div
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
        style={{ background: "rgba(245,158,11,0.1)" }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={15} style={{ color: "var(--soc-amber)" }} />

            <h3
              className="text-xs font-semibold uppercase"
              style={{ color: "var(--soc-text)" }}
            >
              Intelligence Timeline
            </h3>
          </div>

          <span className="text-xs" style={{ color: "var(--soc-muted)" }}>
            {sorted.length} event{sorted.length === 1 ? "" : "s"}
          </span>
        </div>

        {sorted.length === 0 ? (
          <div
            className="rounded p-6 text-center"
            style={{
              background: "var(--soc-surface-2)",
              border: "1px dashed var(--soc-border)",
            }}
          >
            <PackageSearch
              size={28}
              className="mx-auto mb-3"
              style={{ color: "var(--soc-muted)" }}
            />

            <p className="text-sm" style={{ color: "var(--soc-muted)" }}>
              No timeline events available yet.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {sorted.slice(0, 12).map((finding, index) => {
              const category = finding.crime_category || "CONTRABAND_INTELLIGENCE";
              const color = getContrabandCategoryColor(category);
              const sourceUrl = getSourceUrl(finding);
              const score = Number(finding.risk_score || 0);

              return (
                <div key={index} className="relative pl-8 pb-5">
                  <div
                    className="absolute left-2 top-0 bottom-0 w-px"
                    style={{ background: "var(--soc-border)" }}
                  />

                  <div
                    className="absolute left-0 top-1 flex items-center justify-center rounded-full"
                    style={{
                      width: 18,
                      height: 18,
                      background: `${color}22`,
                      border: `1px solid ${color}`,
                      color,
                    }}
                  >
                    {score >= 85 ? (
                      <AlertTriangle size={10} />
                    ) : (
                      <ShieldAlert size={10} />
                    )}
                  </div>

                  <div
                    className="rounded p-3 cursor-pointer transition-all hover:scale-[1.01]"
                    onClick={() => navigate(`/investigation/contraband/${index}`)}
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.035), rgba(15,23,42,0.35))",
                      border: "1px solid var(--soc-border)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded uppercase font-semibold"
                            style={{
                              background: `${color}18`,
                              color,
                              border: `1px solid ${color}33`,
                            }}
                          >
                            {formatCategory(category)}
                          </span>

                          <span
                            className="text-[10px] px-2 py-0.5 rounded uppercase"
                            style={{
                              background: "rgba(59,130,246,0.12)",
                              color: "#60a5fa",
                            }}
                          >
                            {finding.source_type || "source"}
                          </span>
                        </div>

                        <p
                          className="text-xs font-semibold"
                          style={{ color: "var(--soc-text)" }}
                        >
                          {finding.title || "Contraband intelligence event"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p
                          className="text-[10px]"
                          style={{ color: "var(--soc-muted)" }}
                        >
                          {getFindingTime(finding, index)}
                        </p>

                        <p
                          className="text-[10px] font-semibold"
                          style={{
                            color:
                              score >= 85
                                ? "var(--soc-red)"
                                : score >= 70
                                ? "var(--soc-amber)"
                                : "var(--soc-accent)",
                          }}
                        >
                          {getRiskLabel(score)}
                        </p>
                      </div>
                    </div>

                    {finding.analyst_summary && (
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--soc-muted)" }}
                      >
                        {shortenText(finding.analyst_summary, 180)}
                      </p>
                    )}

                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "var(--soc-accent)" }}
                      >
                        Open Source
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}