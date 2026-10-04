import { useEffect } from "react";
import { modulesApi } from "@/api/modules.api";
import { useModulesStore } from "@/store";

export function useHydrateModuleResults() {
  const hydrateFromBackend = useModulesStore(
    (state) => state.hydrateFromBackend
  );

  useEffect(() => {
    let cancelled = false;

    async function loadLatestResults() {
      try {
        const payload = await modulesApi.getLatestResults();

        if (!cancelled && payload) {
          hydrateFromBackend(payload);
        }
      } catch (err) {
        console.error("Failed to hydrate latest module results:", err);
      }
    }

    loadLatestResults();

    return () => {
      cancelled = true;
    };
  }, [hydrateFromBackend]);
}