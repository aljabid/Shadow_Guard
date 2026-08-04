import {
  Globe,
  Instagram,
  Play,
  Radio,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

interface Props {
  includeTelegram: boolean;
  includeWeb: boolean;
  includeDarknet: boolean;
  includeInstagram: boolean;
  setIncludeTelegram: (value: boolean) => void;
  setIncludeWeb: (value: boolean) => void;
  setIncludeDarknet: (value: boolean) => void;
  setIncludeInstagram: (value: boolean) => void;
  onRun: () => void;
  isRunning: boolean;
}

function SourceToggle({
  label,
  description,
  icon,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="rounded p-3 text-left"
      style={{
        background: checked
          ? "rgba(59,130,246,0.12)"
          : "var(--soc-surface-2)",
        border: checked
          ? "1px solid rgba(59,130,246,0.35)"
          : "1px solid var(--soc-border)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="flex items-center gap-2"
          style={{
            color: checked ? "var(--soc-accent)" : "var(--soc-muted)",
          }}
        >
          {icon}
          <span className="text-xs font-semibold">{label}</span>
        </div>

        <span
          className="text-[10px] px-2 py-0.5 rounded"
          style={{
            background: checked
              ? "rgba(16,185,129,0.12)"
              : "rgba(239,68,68,0.1)",
            color: checked ? "var(--soc-green)" : "var(--soc-red)",
          }}
        >
          {checked ? "ON" : "OFF"}
        </span>
      </div>

      <p className="text-[11px]" style={{ color: "var(--soc-muted)" }}>
        {description}
      </p>
    </button>
  );
}

export default function ContrabandSourceControls({
  includeTelegram,
  includeWeb,
  includeDarknet,
  includeInstagram,
  setIncludeTelegram,
  setIncludeWeb,
  setIncludeDarknet,
  setIncludeInstagram,
  onRun,
  isRunning,
}: Props) {
  return (
    <div className="card mb-4 relative overflow-hidden">
      <div
        className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl"
        style={{ background: "rgba(59,130,246,0.12)" }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3
              className="text-xs font-semibold uppercase"
              style={{ color: "var(--soc-text)" }}
            >
              Source Control Matrix
            </h3>

            <p className="text-xs mt-1" style={{ color: "var(--soc-muted)" }}>
              Select OSINT and DarkNet collectors for this scan.
            </p>
          </div>

          <button
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold"
            style={{
              background: "var(--soc-accent)",
              color: "white",
              opacity: isRunning ? 0.6 : 1,
            }}
          >
            {isRunning ? (
              <RotateCcw size={12} className="animate-spin" />
            ) : (
              <Play size={12} />
            )}
            {isRunning ? "Scanning..." : "Scan Sources"}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <SourceToggle
            label="Telegram"
            description="Channels, groups, sellers, couriers"
            icon={<Radio size={14} />}
            checked={includeTelegram}
            onChange={setIncludeTelegram}
          />

          <SourceToggle
            label="Open Web"
            description="Public sites, marketplaces, indexed pages"
            icon={<Globe size={14} />}
            checked={includeWeb}
            onChange={setIncludeWeb}
          />

          <SourceToggle
            label="DarkNet"
            description="Onion markets, vendor pages, hidden listings"
            icon={<ShieldAlert size={14} />}
            checked={includeDarknet}
            onChange={setIncludeDarknet}
          />

          <SourceToggle
            label="Instagram"
            description="Social selling pages and delivery accounts"
            icon={<Instagram size={14} />}
            checked={includeInstagram}
            onChange={setIncludeInstagram}
          />
        </div>
      </div>
    </div>
  );
}