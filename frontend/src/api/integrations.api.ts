import client from "./client";

export interface ApiIntegration {
  id: string;
  name: string;
  integration_type: "telegram" | "blockchain" | "osint" | "search" | "darknet" | "internal";
  display_name: string;
  description?: string;
  is_enabled: boolean;
  status: "connected" | "error" | "not_configured" | "configured" | "testing";
  last_tested?: string;
  last_sync?: string;
  health_score?: number;
  rate_limit_remaining?: number;
  usage_count: number;
  has_config: boolean;
  config_keys: string[];
  notes?: string;
}

export const integrationsApi = {
  list: async () => {
    const resp = await client.get("/integrations/");
    return resp.data as { integrations: ApiIntegration[] };
  },

  update: async (id: string, body: { config?: Record<string, string>; is_enabled?: boolean; notes?: string }) => {
    const resp = await client.put(`/integrations/${id}`, body);
    return resp.data;
  },

  test: async (id: string) => {
    const resp = await client.post(`/integrations/${id}/test`);
    return resp.data as { success: boolean; message: string; status: string; health_score?: number };
  },
};
