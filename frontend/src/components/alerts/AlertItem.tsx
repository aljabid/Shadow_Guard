import { Link } from "react-router-dom";
import { Alert } from "@/types";
import { getRiskColor } from "@/styles/theme";
import { Search, CheckCircle2 } from "lucide-react";

interface Props {
  alert: Alert;
  onDismiss: () => void;
}

function getInvestigationPath(alert: Alert): string {
  const metadata: any = alert.metadata || {};

  const findingIndex =
    metadata.finding_index ?? metadata.result_index ?? metadata.index ?? 0;

  return `/investigation/${alert.module_id}/${findingIndex}`;
}

export default function AlertItem({ alert, onDismiss }: Props) {
  const color = getRiskColor(alert.risk_score);
  const investigationPath = getInvestigationPath(alert);

  return (
    <div
      className="p-3 flex gap-2"
      style={{
        borderBottom: "1px solid var(--soc-border)",
        opacity: alert.is_dismissed ? 0.45 : 1,
      }}
    >
      <div
        style={{
          width: 3,
          borderRadius: 2,
          background: alert.is_dismissed ? "var(--soc-muted)" : color,
          flexShrink: 0,
        }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p
            className="text-xs font-medium leading-tight"
            style={{ color: "var(--soc-text)" }}
          >
            {alert.title}
          </p>

          {alert.is_dismissed && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                color: "var(--soc-green)",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.25)",
                fontSize: 10,
                flexShrink: 0,
              }}
            >
              Resolved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs" style={{ color }}>
            {alert.risk_score}/100
          </span>

          <span className="text-xs" style={{ color: "var(--soc-muted)" }}>
            {alert.module_id}
          </span>

          {alert.is_cross_module && (
            <span
              className="text-xs px-1 rounded"
              style={{
                background: "rgba(245,158,11,0.1)",
                color: "var(--soc-amber)",
              }}
            >
              cross
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <p
            className="text-xs"
            style={{ color: "var(--soc-muted)", fontSize: 10 }}
          >
            {new Date(alert.created_at).toLocaleTimeString()}
          </p>

          <div className="flex items-center gap-1">
            <Link
              to={investigationPath}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
              style={{
                background: "rgba(59,130,246,0.12)",
                color: "#60a5fa",
                border: "1px solid rgba(59,130,246,0.3)",
                fontSize: 10,
              }}
            >
              <Search size={10} />
              Investigate
            </Link>

            {!alert.is_dismissed && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                style={{
                  background: "rgba(16,185,129,0.1)",
                  color: "var(--soc-green)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  fontSize: 10,
                }}
                title="Resolve alert"
              >
                <CheckCircle2 size={10} />
                Resolve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}