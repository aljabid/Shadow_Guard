import { Alert } from "@/types";
import { AlertTriangle } from "lucide-react";

interface Props { alert: Alert; }

export default function CrossModuleAlert({ alert }: Props) {
  return (
    <div className="p-3 rounded" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle size={12} style={{ color: "var(--soc-amber)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--soc-amber)" }}>Cross-Module Alert</span>
      </div>
      <p className="text-xs" style={{ color: "var(--soc-muted)" }}>{alert.title}</p>
    </div>
  );
}
