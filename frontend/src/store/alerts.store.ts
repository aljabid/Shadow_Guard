import { create } from "zustand";
import { Alert, AlertFeedState } from "@/types";

interface AlertsStore extends AlertFeedState {
  addAlert: (alert: Alert) => void;
  setAlerts: (alerts: Alert[]) => void;
  dismissAlert: (id: string) => void;
  restoreAlert: (id: string) => void;
  restoreAllAlerts: () => void;
  markAllRead: () => void;
  setConnected: (connected: boolean) => void;
}

export const useAlertsStore = create<AlertsStore>((set) => ({
  alerts: [],
  unreadCount: 0,
  isConnected: false,

  addAlert: (alert) =>
    set((state) => {
      const exists = state.alerts.find((a) => a.id === alert.id);

      if (exists) {
        return {
          alerts: state.alerts.map((a) =>
            a.id === alert.id ? alert : a
          ),
        };
      }

      return {
        alerts: [alert, ...state.alerts]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 100),
        unreadCount: state.unreadCount + 1,
      };
    }),

  setAlerts: (alerts) =>
    set({
      alerts: [...alerts].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
      unreadCount: alerts.filter((a) => !a.is_dismissed).length,
    }),

  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, is_dismissed: true } : a
      ),
    })),

  restoreAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, is_dismissed: false } : a
      ),
    })),

  restoreAllAlerts: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({
        ...a,
        is_dismissed: false,
      })),
    })),

  markAllRead: () =>
    set({
      unreadCount: 0,
    }),

  setConnected: (connected) =>
    set({
      isConnected: connected,
    }),
}));