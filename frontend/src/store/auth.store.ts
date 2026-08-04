import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, AuthState } from "@/types";

interface AuthStore extends AuthState {
  login: (data: { access_token: string; refresh_token: string; user_id: string; username: string; role: string; }) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      access_token: null,
      refresh_token: null,
      isAuthenticated: false,
      login: (data) => {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        set({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          isAuthenticated: true,
          user: { id: data.user_id, username: data.username, email: "", role: data.role as User["role"], is_active: true, created_at: new Date().toISOString() },
        });
      },
      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, access_token: null, refresh_token: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
    }),
    { name: "auth-store" }
  )
);
