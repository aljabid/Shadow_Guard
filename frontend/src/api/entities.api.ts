import client from "./client";
import { SharedEntity } from "@/types";

export const entitiesApi = {
  search: async (params?: {
    q?: string;
    entity_type?: string;
    cross_module_only?: boolean;
    limit?: number;
  }): Promise<SharedEntity[]> => {
    const resp = await client.get("/entities/", { params });
    return resp.data;
  },
  getById: async (entityId: string): Promise<SharedEntity> => {
    const resp = await client.get(`/entities/${entityId}`);
    return resp.data;
  },
  getCrossModule: async (): Promise<SharedEntity[]> => {
    const resp = await client.get("/entities/", { params: { cross_module_only: true } });
    return resp.data;
  },
};
