import { useInvestigation } from "@/hooks/useInvestigation";
import EntityTag from "@/components/entities/EntityTag";
import { X, Pin } from "lucide-react";

export default function InvestigationBar() {
  const { pinnedEntities, togglePin, clearAll } = useInvestigation();
  if (pinnedEntities.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
      style={{ background: "rgba(59,130,246,0.06)", borderBottom: "1px solid var(--soc-border)", flexShrink: 0 }}>
      <Pin size={11} style={{ color: "var(--soc-blue)", flexShrink: 0 }} />
      <span className="text-xs mr-1" style={{ color: "var(--soc-blue)", flexShrink: 0 }}>Investigation:</span>
      {pinnedEntities.map((p) => (
        <div key={p.entity.id} className="flex items-center gap-1 flex-shrink-0">
          <EntityTag entity={p.entity} />
          <button onClick={() => togglePin(p.entity)} style={{ color: "var(--soc-muted)" }}>
            <X size={10} />
          </button>
        </div>
      ))}
      <button onClick={clearAll} className="text-xs ml-auto flex-shrink-0" style={{ color: "var(--soc-muted)" }}>
        Clear all
      </button>
    </div>
  );
}
