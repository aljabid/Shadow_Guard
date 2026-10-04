import { useInvestigationStore } from "@/store";
import { SharedEntity } from "@/types";

export function useInvestigation() {
  const { pinnedEntities, pinEntity, unpinEntity, clearAll } = useInvestigationStore();

  const isPinned = (entityId: string) => pinnedEntities.some((p) => p.entity.id === entityId);

  const togglePin = (entity: SharedEntity) => {
    if (isPinned(entity.id)) unpinEntity(entity.id);
    else pinEntity(entity);
  };

  return { pinnedEntities, isPinned, togglePin, clearAll };
}
