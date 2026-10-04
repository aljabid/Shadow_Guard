import client from "@/api/client";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  risk_score?: number;
}

export interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
}

export interface IntelligenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_count?: number;
  edge_count?: number;
  task_count?: number;
}

export const intelligenceGraphApi = {
  async getGraph(): Promise<IntelligenceGraph> {
    const response = await client.get("/modules/intelligence/graph");
    return response.data;
  },
};