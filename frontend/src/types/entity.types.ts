export interface SharedEntity {
  id: string;
  entity_type: string;
  entity_value: string;
  source_modules: string[];
  risk_score: number;
  tags: string[];
  metadata: Record<string, unknown> | null;
  first_seen: string;
  last_seen: string | null;
  occurrence_count: number;
}

export interface PinnedEntity {
  entity: SharedEntity;
  pinned_at: string;
}

export interface InvestigationState {
  pinnedEntities: PinnedEntity[];
  activeInvestigationId: string | null;
}
