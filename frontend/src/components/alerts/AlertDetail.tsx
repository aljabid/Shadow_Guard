import { Alert } from "@/types";
import { getRiskColor } from "@/styles/theme";
import RiskScoreBadge from "@/components/common/RiskScoreBadge";

interface Props { alert: Alert; onClose: () => void; }

export default function AlertDetail({ alert, onClose }: Props) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--soc-text)" }}>{alert.title}</h3>
        <RiskScoreBadge score={alert.risk_score} />
      </div>
      {alert.description && (
        <p className="text-xs mb-3" style={{ color: "var(--soc-muted)" }}>{alert.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--soc-muted)" }}>
        <span>Module: {alert.module_id}</span>
        <span>Severity: {alert.severity}</span>
        {alert.entity_value && <span>Entity: {alert.entity_value}</span>}
      </div>
    </div>
  );
}
