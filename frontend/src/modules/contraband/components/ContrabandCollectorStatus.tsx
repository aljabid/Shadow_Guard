import {
  CheckCircle2,
  Globe,
  Instagram,
  Radio,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { formatCollectorName } from "../utils/contrabandFormatters";
import {
  getCollectorStatusBackground,
  getCollectorStatusColor,
} from "../utils/contrabandColors";

interface Props {
  collectorStatus?: Record<string, boolean>;
  error?: string;
}

function getCollectorIcon(name: string) {
  const value = name.toLowerCase();

  if (value.includes("telegram")) return <Radio size={13} />;
  if (value.includes("instagram")) return <Instagram size={13} />;
  if (value.includes("darknet")) return <ShieldAlert size={13} />;
  if (value.includes("web")) return <Globe size={13} />;

  return <Globe size={13} />;
}

export default function ContrabandCollectorStatus({
  collectorStatus = {},
  error,
}: Props) {
  const entries = Object.entries(collectorStatus);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="card relative overflow-hidden">
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl"
        style={{
          background: "rgba(59,130,246,0.12)",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-xs font-semibold uppercase"
            style={{ color: "var(--soc-text)" }}
          >
            Collector Status
          </h3>

          <span className="text-xs" style={{ color: "var(--soc-muted)" }}>
            OSINT / DarkNet source health
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {entries.map(([name, enabled]) => (
            <div
              key={name}
              className="rounded p-2"
              style={{
                background: getCollectorStatusBackground(enabled),
                border: "1px solid var(--soc-border)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex items-center gap-2 min-w-0"
                  style={{
                    color: getCollectorStatusColor(enabled),
                  }}
                >
                  {getCollectorIcon(name)}

                  <span className="text-xs font-medium truncate">
                    {formatCollectorName(name)}
                  </span>
                </div>

                {enabled ? (
                  <CheckCircle2
                    size={13}
                    style={{ color: "var(--soc-green)" }}
                  />
                ) : (
                  <XCircle
                    size={13}
                    style={{ color: "var(--soc-red)" }}
                  />
                )}
              </div>

              <p
                className="text-[10px] mt-1"
                style={{
                  color: enabled ? "var(--soc-green)" : "var(--soc-red)",
                }}
              >
                {enabled ? "Enabled" : "Disabled / Missing config"}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div
            className="mt-3 p-2 rounded text-xs"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "var(--soc-red)",
            }}
          >
            Runtime note: {error}
          </div>
        )}
      </div>
    </div>
  );
}