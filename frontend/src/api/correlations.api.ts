import client from "@/api/client";

export interface CrossModuleCorrelation {
  entity_type: string;
  entity_value: string;
  normalized_value: string;
  modules: string[];
  module_count: number;
  risk_score: number;
  confidence: number;
  evidence_count: number;
  evidence: {
    module_id: string;
    title: string;
    risk_score: number;
  }[];
}

export interface CorrelationResponse {
  correlations: CrossModuleCorrelation[];
  correlation_count: number;
  entities_indexed: number;
  tasks_indexed: number;
}

export const correlationsApi = {
  async getCorrelations(): Promise<CorrelationResponse> {
    const response = await client.get("/modules/intelligence/correlations");
    return response.data;
  },
};