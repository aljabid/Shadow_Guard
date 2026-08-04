import client from "./client";
import { Alert } from "@/types";

export const alertsApi = {
  list: async (params?: {
    module_id?: string;
    severity?: string;
    dismissed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Alert[]> => {
    const resp = await client.get("/alerts/", { params });
    return resp.data;
  },

  dismiss: async (alertId: string, reason?: string): Promise<Alert> => {
    const resp = await client.patch(`/alerts/${alertId}/dismiss`, { reason });
    return resp.data;
  },

  resolve: async (alertId: string): Promise<Alert> => {
    const resp = await client.patch(`/alerts/${alertId}/resolve`);
    return resp.data;
  },

  resolveModule: async (moduleId: string): Promise<{
    message: string;
    module_id: string;
    resolved_count: number;
  }> => {
    const resp = await client.patch(`/alerts/module/${moduleId}/resolve`);
    return resp.data;
  },

  resolveAll: async (): Promise<{
    message: string;
    resolved_count: number;
  }> => {
    const resp = await client.patch("/alerts/resolve-all");
    return resp.data;
  },
};