import { SharedEntity } from "@/types";
import EntityTag from "./EntityTag";

interface Props { entity: SharedEntity; }

export default function EntityTimeline({ entity }: Props) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <EntityTag entity={entity} />
        <span className="text-xs" style={{ color: "var(--soc-muted)" }}>
          Seen {entity.occurrence_count}x across {entity.source_modules.length} module(s)
        </span>
      </div>
      <div className="space-y-1">
        {entity.source_modules.map((mod) => (
          <div key={mod} className="flex items-center gap-2 text-xs" style={{ color: "var(--soc-muted)" }}>
            <span className="px-1 rounded" style={{ background: "var(--soc-surface-2)", color: "var(--soc-accent)" }}>
              {mod}
            </span>
            <span>flagged this entity</span>
          </div>
        ))}
      </div>
    </div>
  );
}
