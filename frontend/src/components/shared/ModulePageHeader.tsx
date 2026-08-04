import EvidencePackageButton from "@/components/reporting/EvidencePackageButton";

type ModuleMode = "live" | "playback" | "demo" | null;

interface Props {
  moduleId: string;
  name: string;
  description: string;
  mode?: ModuleMode;
  taskId?: string | null;
}

const MODE_STYLES: Record<NonNullable<ModuleMode>, { bg: string; color: string; label: string }> = {
  live:     { bg: "rgba(16,185,129,0.12)",  color: "var(--soc-green)", label: "LIVE"     },
  playback: { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa",          label: "PLAYBACK" },
  demo:     { bg: "rgba(245,158,11,0.12)",  color: "var(--soc-amber)", label: "DEMO"     },
};

export default function ModulePageHeader({ moduleId, name, description, mode, taskId }: Props) {
  const modeStyle = mode ? MODE_STYLES[mode] : null;

  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-base font-bold tracking-wide" style={{ color: "var(--soc-accent)" }}>
            {name}
          </h2>
          {modeStyle && (
            <span
              className="text-xs px-2 py-0.5 rounded font-semibold"
              style={{
                background: modeStyle.bg,
                color: modeStyle.color,
                border: `1px solid ${modeStyle.color}40`,
                letterSpacing: "0.05em",
              }}
            >
              {modeStyle.label}
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
          {description}
        </p>
      </div>

      <EvidencePackageButton moduleId={moduleId} taskId={taskId || null} />
    </div>
  );
}
