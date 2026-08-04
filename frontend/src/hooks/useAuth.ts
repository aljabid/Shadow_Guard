import { useAuthStore } from "@/store";
import { authApi } from "@/api/auth.api";
import { LoginRequest } from "@/types";
import { alertWebSocket } from "@/api/websocket";

export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const handleLogin = async (data: LoginRequest) => {
    const response = await authApi.login(data);
    login(response);
    alertWebSocket.connect(response.access_token);
    return response;
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    alertWebSocket.disconnect();
    logout();
  };

  return { user, isAuthenticated, login: handleLogin, logout: handleLogout };
}
