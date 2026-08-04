import { create } from "zustand";

export type Theme = "dark" | "light" | "cream";

function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem("sg-theme");
    if (t === "dark" || t === "light" || t === "cream") return t;
  } catch {}
  return "dark";
}

interface UIStore {
  sidebarCollapsed: boolean;
  alertFeedOpen: boolean;
  activeModal: string | null;
  theme: Theme;
  toggleSidebar: () => void;
  toggleAlertFeed: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  alertFeedOpen: true,
  activeModal: null,
  theme: getStoredTheme(),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleAlertFeed: () => set((state) => ({ alertFeedOpen: !state.alertFeedOpen })),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  setTheme: (theme) => {
    try { localStorage.setItem("sg-theme", theme); } catch {}
    set({ theme });
  },
}));
