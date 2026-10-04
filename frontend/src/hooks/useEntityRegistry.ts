import { useState, useCallback } from "react";
import { entitiesApi } from "@/api/entities.api";
import { SharedEntity } from "@/types";

export function useEntityRegistry() {
  const [entities, setEntities] = useState<SharedEntity[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, entityType?: string) => {
    setLoading(true);
    try {
      const results = await entitiesApi.search({ q: query, entity_type: entityType });
      setEntities(results);
    } finally { setLoading(false); }
  }, []);

  const getCrossModule = useCallback(async () => {
    setLoading(true);
    try {
      const results = await entitiesApi.getCrossModule();
      setEntities(results);
    } finally { setLoading(false); }
  }, []);

  return { entities, loading, search, getCrossModule };
}
