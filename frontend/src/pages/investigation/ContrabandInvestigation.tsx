import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileSearch,
  MapPin,
  Phone,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import RiskScoreBadge from "@/components/common/RiskScoreBadge";
import { useModulesStore } from "@/store";
import { ContrabandResult } from "@/modules/contraband/types";
import { formatCategory, shortenText } from "@/modules/contraband/utils/contrabandFormatters";
import { getContrabandCategoryColor } from "@/modules/contraband/utils/contrabandColors";

function uniqueUrls(finding: any): string[] {
  const sourceData = finding?.source_data || {};

  return Array.from(
    new Set(
      [
        finding?.source_url,
        finding?.url,
        ...(finding?.evidence_urls || []),
        ...(sourceData?.evidence_urls || []),
        ...(sourceData?.telegram_links || []),
        ...(sourceData?.web_links || []),
        ...(sourceData?.onion_links || []),
      ]
        .filter(Boolean)
        .map(String)
    )
  );
}

export default function InvestigationPage() {
  const { moduleId, findingIndex } = useParams();
  const { lastResult } = useModulesStore();

  const result = lastResult as ContrabandResult | null;
  const index = Number(findingIndex || 0);

  if (moduleId !== "contraband") {
    return (
      <div className="card">
        <p style={{ color: "var(--soc-muted)" }}>
          Investigation view is not implemented for module: {moduleId}
        </p>
      </div>
    );
  }

  const finding = result?.findings?.[index];

  if (!finding) {
    return (
      <div className="card">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs mb-4"
          style={{ color: "var(--soc-accent)" }}
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <h2 className="font-bold mb-2" style={{ color: "var(--soc-text)" }}>
          Finding not found
        </h2>

        <p className="text-sm" style={{ color: "var(--soc-muted)" }}>
          Run CONTRABAND-KZ first, then click Investigate again.
        </p>
      </div>
    );
  }

  const category = finding.crime_category || "CONTRABAND_INTELLIGENCE";
  const color = getContrabandCategoryColor(category);
  const riskScore = Number(finding.risk_score || 0);
  const entities = finding.entities || {};
  const urls = uniqueUrls(finding);

  return (
    <div className="space-y-4">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-xs"
        style={{ color: "var(--soc-accent)" }}
      >
        <ArrowLeft size={14} />
        Back to CONTRABAND dashboard
      </Link>

      <div
        className="card relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.72))",
        }}
      >
        <div
          className="absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl"
          style={{ background: `${color}33` }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p
              className="text-xs uppercase font-semibold mb-2"
              style={{ color }}
            >
              CONTRABAND-KZ Investigation Case
            </p>

            <h1
              className="text-xl font-bold mb-2"
              style={{ color: "var(--soc-text)" }}
            >
              {finding.title}
            </h1>

            <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
              Source: {finding.source_name || "unknown"} · Type:{" "}
              {finding.source_type || "unknown"} · City:{" "}
              {finding.city || "unknown"} · Country:{" "}
              {finding.country || "Kazakhstan"}
            </p>
          </div>

          <RiskScoreBadge score={riskScore} size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="card">
          <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
            Category
          </p>
          <p className="text-sm font-bold mt-1" style={{ color }}>
            {formatCategory(category)}
          </p>
        </div>

        <div className="card">
          <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
            Evidence URLs
          </p>
          <p className="text-lg font-bold mt-1" style={{ color: "var(--soc-text)" }}>
            {urls.length}
          </p>
        </div>

        <div className="card">
          <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
            Entity Count
          </p>
          <p className="text-lg font-bold mt-1" style={{ color: "var(--soc-text)" }}>
            {Object.values(entities).flat().length}
          </p>
        </div>

        <div className="card">
          <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
            Priority
          </p>
          <p className="text-sm font-bold mt-1" style={{ color: "var(--soc-amber)" }}>
            {finding.evidence_priority || "review"}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert size={15} style={{ color: "var(--soc-accent)" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--soc-text)" }}>
            Analyst Summary
          </h2>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: "var(--soc-muted)" }}>
          {finding.analyst_summary || "No analyst summary available."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-bold mb-3" style={{ color: "var(--soc-text)" }}>
            Entities
          </h2>

          <div className="space-y-2">
            {(entities.locations || []).map((v) => (
              <p key={v} className="text-xs flex items-center gap-2" style={{ color: "var(--soc-muted)" }}>
                <MapPin size={12} /> Location: {v}
              </p>
            ))}

            {(entities.phones || []).map((v) => (
              <p key={v} className="text-xs flex items-center gap-2" style={{ color: "var(--soc-muted)" }}>
                <Phone size={12} /> Phone: {v}
              </p>
            ))}

            {(entities.wallets || []).map((v) => (
              <p key={v} className="text-xs flex items-center gap-2" style={{ color: "var(--soc-muted)" }}>
                <Wallet size={12} /> Wallet: {v}
              </p>
            ))}

            {(entities.substances || []).map((v) => (
              <p key={v} className="text-xs flex items-center gap-2" style={{ color: "var(--soc-muted)" }}>
                <AlertTriangle size={12} /> Substance: {v}
              </p>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-bold mb-3" style={{ color: "var(--soc-text)" }}>
            Evidence
          </h2>

          <div className="space-y-2">
            {urls.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block text-xs"
                style={{ color: "var(--soc-accent)" }}
              >
                Evidence {i + 1}
                <ExternalLink size={10} className="inline ml-1" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <FileSearch size={15} style={{ color: "var(--soc-green)" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--soc-text)" }}>
            Recommended Actions
          </h2>
        </div>

        {(finding.recommended_actions || []).map((action, i) => (
          <p key={i} className="text-xs mb-1" style={{ color: "var(--soc-muted)" }}>
            {i + 1}. {action}
          </p>
        ))}
      </div>

      <div className="card">
        <h2 className="text-sm font-bold mb-2" style={{ color: "var(--soc-text)" }}>
          Raw Evidence Excerpt
        </h2>

        <p className="text-xs leading-relaxed" style={{ color: "var(--soc-muted)" }}>
          {shortenText(finding.raw_text_excerpt || "No raw excerpt available.", 800)}
        </p>
      </div>
    </div>
  );
}