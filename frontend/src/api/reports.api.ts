import client from "./client";

export const reportsApi = {
  generate: async (data: {
    module_id: string;
    task_id: string;
    title?: string;
    include_raw_data?: boolean;
  }) => {
    const resp = await client.post("/reports/generate", data);
    return resp.data as { id: string; module_id: string; title: string; created_at: string };
  },

  list: async (module_id?: string) => {
    const resp = await client.get("/reports/", { params: module_id ? { module_id } : {} });
    return resp.data as Array<{ id: string; module_id: string; title: string; summary?: string; file_path?: string; created_at: string }>;
  },

  download: async (reportId: string, filename?: string) => {
    const resp = await client.get(`/reports/${reportId}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([resp.data], { type: "text/html" }));
    const a   = document.createElement("a");
    a.href    = url;
    a.download = filename || `shadowguard_report_${reportId.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
