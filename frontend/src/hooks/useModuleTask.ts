import { useCallback, useRef } from "react";
import { modulesApi } from "@/api/modules.api";
import { alertsApi } from "@/api/alerts.api";
import { useModulesStore, useAlertsStore } from "@/store";

type ModuleTaskStatus = "queued" | "started" | "success" | "failure" | "revoked";

function normalizeStatus(status: string): ModuleTaskStatus {
  if (status === "completed") return "success";
  if (status === "failed") return "failure";

  if (
    status === "queued" ||
    status === "started" ||
    status === "success" ||
    status === "failure" ||
    status === "revoked"
  ) {
    return status;
  }

  return "queued";
}

function isFinished(status: string) {
  const normalized = normalizeStatus(status);
  return normalized === "success" || normalized === "failure";
}

export function useModuleTask(moduleId: string) {
  const { setTask, setRunning, setLastResult } = useModulesStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const refreshAlerts = async () => {
    try {
      const alerts = await alertsApi.list({ limit: 50 });
      useAlertsStore.getState().setAlerts(Array.isArray(alerts) ? alerts : []);
    } catch (err) {
      console.error("Failed to refresh alerts after task:", err);
    }
  };

  const run = useCallback(
    async (inputData: Record<string, unknown> = {}) => {
      setRunning(moduleId, true);
      setTask(moduleId, null);
      stopPolling();

      try {
        const response = await modulesApi.run(moduleId, inputData);
        const normalizedResponseStatus = normalizeStatus(response.status);

        setTask(moduleId, {
          task_id: response.task_id,
          module_id: response.module_id,
          status: normalizedResponseStatus,
          result: response.result || null,
          error: null,
          created_at: response.result?.created_at || new Date().toISOString(),
          completed_at: response.result?.completed_at || null,
        });

        if (response.result) {
          setLastResult(moduleId, response.result || {});
          await refreshAlerts();
          setRunning(moduleId, false);
          stopPolling();
          return response;
        }

        const taskId = response.task_id;

        pollRef.current = setInterval(async () => {
          try {
            const statusResponse = await modulesApi.getTaskStatus(
              moduleId,
              taskId
            );

            const normalizedStatus = normalizeStatus(statusResponse.status);

            const normalizedTask = {
              ...statusResponse,
              status: normalizedStatus,
            };

            setTask(moduleId, normalizedTask);

            if (isFinished(normalizedStatus)) {
              if (normalizedStatus === "success") {
                setLastResult(moduleId, statusResponse.result || {});
              }

              await refreshAlerts();
              setRunning(moduleId, false);
              stopPolling();
            }
          } catch (err) {
            console.error("Task polling failed:", err);
            setRunning(moduleId, false);
            stopPolling();
          }
        }, 2000);

        return response;
      } catch (err) {
        setRunning(moduleId, false);
        stopPolling();
        throw err;
      }
    },
    [moduleId, setTask, setRunning, setLastResult]
  );

  const cancel = useCallback(() => {
    stopPolling();
    setRunning(moduleId, false);
  }, [moduleId, setRunning]);

  return { run, cancel };
}