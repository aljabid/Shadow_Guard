import {
  AlertTriangle,
  Beer,
  Cigarette,
  PackageSearch,
  Radar,
  ShieldAlert,
  Truck,
} from "lucide-react";

import { ContrabandResult } from "../types";

interface Props {
  result: ContrabandResult | null;
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="card relative overflow-hidden"
      style={{
        background: accent
          ? "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(15,23,42,0.4))"
          : "linear-gradient(135deg, rgba(255,255,255,0.035), rgba(15,23,42,0.35))",
      }}
    >
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl"
        style={{
          background: accent
            ? "rgba(239,68,68,0.25)"
            : "rgba(59,130,246,0.16)",
        }}
      />

      <div className="flex items-start justify-between gap-3 relative">
        <div>
          <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
            {label}
          </p>

          <p
            className="text-xl font-bold mt-1"
            style={{
              color: accent ? "var(--soc-red)" : "var(--soc-text)",
            }}
          >
            {value}
          </p>
        </div>

        <div
          className="p-2 rounded"
          style={{
            background: accent
              ? "rgba(239,68,68,0.12)"
              : "rgba(59,130,246,0.12)",
            color: accent ? "var(--soc-red)" : "var(--soc-accent)",
            border: "1px solid var(--soc-border)",
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function ContrabandStats({ result }: Props) {
  const findings = result?.findings || [];

  const sourcesScanned = result?.sources_scanned || 0;
  const findingsCount = result?.findings_count || findings.length || 0;
  const highRisk = result?.high_risk_findings || 0;
  const alerts = result?.alerts_fired || 0;

  const drugFindings = result?.drug_findings || 0;
  const vapeFindings = result?.vape_findings || 0;
  const alcoholFindings = result?.alcohol_findings || 0;
  const courierNetworks = result?.courier_networks || 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Sources Scanned"
          value={sourcesScanned}
          icon={<Radar size={15} />}
        />

        <StatCard
          label="Findings"
          value={findingsCount}
          icon={<PackageSearch size={15} />}
        />

        <StatCard
          label="High Risk"
          value={highRisk}
          icon={<ShieldAlert size={15} />}
          accent={highRisk > 0}
        />

        <StatCard
          label="Alerts"
          value={alerts}
          icon={<AlertTriangle size={15} />}
          accent={alerts > 0}
        />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Drug Indicators"
          value={drugFindings}
          icon={<ShieldAlert size={15} />}
          accent={drugFindings > 0}
        />

        <StatCard
          label="Vape Markets"
          value={vapeFindings}
          icon={<Cigarette size={15} />}
        />

        <StatCard
          label="Alcohol Markets"
          value={alcoholFindings}
          icon={<Beer size={15} />}
        />

        <StatCard
          label="Courier Networks"
          value={courierNetworks}
          icon={<Truck size={15} />}
        />
      </div>
    </div>
  );
}