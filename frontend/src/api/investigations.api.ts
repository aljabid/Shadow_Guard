import client from "./client";

export interface InvestigationSummary {
  id: string;
  title: string;
  description?: string;
  module_ids: string[];
  status: "open" | "in_progress" | "closed" | "archived";
  risk_level: "critical" | "high" | "medium" | "low";
  tags: string[];
  findings_count: number;
  linked_task_ids: string[];
  created_by: string;
  created_by_username?: string;
  assigned_to?: string;
  analyst_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface InvestigationDetail extends InvestigationSummary {
  findings_snapshot: Record<string, unknown>[];
  entity_summary?: Record<string, unknown>;
  evidence_package_path?: string;
}

export const investigationsApi = {
  list: async (params?: { status?: string; module_id?: string; risk_level?: string }) => {
    const resp = await client.get("/investigations/", { params });
    return resp.data as { investigations: InvestigationSummary[]; total: number };
  },

  create: async (body: {
    title: string;
    description?: string;
    module_ids?: string[];
    risk_level?: string;
    tags?: string[];
    findings_snapshot?: Record<string, unknown>[];
    linked_task_ids?: string[];
    entity_summary?: Record<string, unknown>;
    analyst_notes?: string;
  }) => {
    const resp = await client.post("/investigations/", body);
    return resp.data;
  },

  get: async (id: string) => {
    const resp = await client.get(`/investigations/${id}`);
    return resp.data as InvestigationDetail;
  },

  update: async (id: string, body: Partial<InvestigationSummary> & { findings_snapshot?: unknown[] }) => {
    const resp = await client.put(`/investigations/${id}`, body);
    return resp.data;
  },

  delete: async (id: string) => {
    const resp = await client.delete(`/investigations/${id}`);
    return resp.data;
  },

  close: async (id: string) => {
    const resp = await client.post(`/investigations/${id}/close`);
    return resp.data;
  },

  addFinding: async (id: string, finding: Record<string, unknown>, moduleId: string) => {
    const resp = await client.post(`/investigations/${id}/add-finding`, { finding, module_id: moduleId });
    return resp.data;
  },
};
