import client from "./client";
import { LoginRequest, TokenResponse, User } from "@/types";

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const resp = await client.post("/auth/login", data);
    return resp.data;
  },
  refresh: async (refresh_token: string): Promise<TokenResponse> => {
    const resp = await client.post("/auth/refresh", { refresh_token });
    return resp.data;
  },
  me: async (): Promise<User> => {
    const resp = await client.get("/auth/me");
    return resp.data;
  },
  logout: async (): Promise<void> => {
    await client.post("/auth/logout");
  },
};
