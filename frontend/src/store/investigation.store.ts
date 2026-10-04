import { create } from "zustand";
import { InvestigationState, PinnedEntity, SharedEntity } from "@/types";

interface InvestigationStore extends InvestigationState {
  pinEntity: (entity: SharedEntity) => void;
  unpinEntity: (entityId: string) => void;
  clearAll: () => void;
}

export const useInvestigationStore = create<InvestigationStore>((set) => ({
  pinnedEntities: [],
  activeInvestigationId: null,
  pinEntity: (entity) => set((state) => {
    if (state.pinnedEntities.find((p) => p.entity.id === entity.id)) return state;
    return { pinnedEntities: [...state.pinnedEntities, { entity, pinned_at: new Date().toISOString() }] };
  }),
  unpinEntity: (entityId) => set((state) => ({
    pinnedEntities: state.pinnedEntities.filter((p) => p.entity.id !== entityId),
  })),
  clearAll: () => set({ pinnedEntities: [] }),
}));
