import { useEffect } from "react";
import { alertWebSocket } from "@/api/websocket";
import { useAlertsStore, useAuthStore } from "@/store";
import { alertsApi } from "@/api/alerts.api";
import { Alert } from "@/types";

export function useAlertFeed() {
  const {
    alerts,
    unreadCount,
    isConnected,
    addAlert,
    setAlerts,
    setConnected,
    dismissAlert,
  } = useAlertsStore();

  const { access_token } = useAuthStore();

  useEffect(() => {
    if (!access_token) return;

    alertsApi
      .list({ limit: 50 })
      .then((data) => {
        setAlerts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load alerts:", err);
      });
  }, [access_token, setAlerts]);

  useEffect(() => {
    if (!access_token) return;

    alertWebSocket.connect(access_token);
    setConnected(true);

    const unsubscribe = alertWebSocket.onMessage((data) => {
      if (data.type !== "new_alert") return;

      const incoming = (data.alert || data) as any;

      const alert: Alert = {
        id: String(incoming.id || incoming.alert_id),
        module_id: String(incoming.module_id),
        title: String(incoming.title),
        description: incoming.description || null,
        severity: incoming.severity || "medium",
        risk_score: Number(incoming.risk_score || 0),
        entity_type: incoming.entity_type || null,
        entity_value: incoming.entity_value || null,
        is_cross_module: Boolean(incoming.is_cross_module),
        is_dismissed: Boolean(incoming.is_dismissed),
        metadata: incoming.metadata || null,
        created_at:
          incoming.created_at ||
          incoming.timestamp ||
          new Date().toISOString(),
      };

      addAlert(alert);
    });

    return () => {
      unsubscribe();
      alertWebSocket.disconnect();
      setConnected(false);
    };
  }, [access_token, addAlert, setConnected]);

  return { alerts, unreadCount, isConnected, dismissAlert };
}