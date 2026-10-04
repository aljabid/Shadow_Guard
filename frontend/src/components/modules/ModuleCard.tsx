import { ModuleMeta } from "@/types";

interface Props { module: ModuleMeta; isActive: boolean; onClick: () => void; }

const MODULE_ACCENT: Record<string, string> = {
  kolkhoz: "#60a5fa", droper: "#ef4444", piramida: "#a855f7",
  shadowbet: "#f97316", tengraf: "#eab308", contraband: "#10b981",
};

export default function ModuleCard({ module, isActive, onClick }: Props) {
  const accent = MODULE_ACCENT[module.id] || "var(--soc-accent)";
  return (
    <button onClick={onClick} className="w-full text-left px-2 py-1.5 rounded mb-0.5 flex items-center gap-2.5"
      style={{
        background: isActive ? `${accent}15` : "transparent",
        border: isActive ? `1px solid ${accent}30` : "1px solid transparent",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = `${accent}08`; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
      <span className="text-xs font-semibold flex-1 min-w-0 truncate"
        style={{ color: isActive ? accent : "var(--soc-text)" }}>
        {module.name}
      </span>
    </button>
  );
}
