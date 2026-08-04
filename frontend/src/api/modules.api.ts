import client from "./client";
import { ModuleMeta, TaskStatus } from "@/types";

export const modulesApi = {
  list: async (): Promise<ModuleMeta[]> => {
    const resp = await client.get("/modules/");
    return resp.data;
  },

  run: async (moduleId: string, inputData: Record<string, unknown>) => {
    const resp = await client.post(`/modules/${moduleId}/run`, {
      input_data: inputData,
    });
    return resp.data;
  },

  getTaskStatus: async (
    moduleId: string,
    taskId: string
  ): Promise<TaskStatus> => {
    const resp = await client.get(
      `/modules/${moduleId}/tasks/${taskId}`
    );
    return resp.data;
  },

  getLatestResults: async () => {
    const resp = await client.get("/modules/latest-results");
    return resp.data;
  },

  getHistory: async (moduleId?: string, limit = 50) => {
    const params: Record<string, unknown> = { limit };
    if (moduleId) params.module_id = moduleId;
    const resp = await client.get("/modules/history", { params });
    return resp.data;
  },
};