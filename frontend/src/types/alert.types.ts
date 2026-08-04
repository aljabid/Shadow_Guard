export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface Alert {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  severity: AlertSeverity;
  risk_score: number;
  entity_type: string | null;
  entity_value: string | null;
  is_cross_module: boolean;
  is_dismissed: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AlertFeedState {
  alerts: Alert[];
  unreadCount: number;
  isConnected: boolean;
}
