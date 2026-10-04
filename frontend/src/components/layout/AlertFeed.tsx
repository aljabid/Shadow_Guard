import { useState } from "react";
import { useAlertFeed } from "@/hooks/useAlertFeed";
import AlertItem from "@/components/alerts/AlertItem";
import { useAlertsStore, useUIStore } from "@/store";
import { RotateCcw, X } from "lucide-react";

const MAX_VISIBLE_ALERTS = 12;

export default function AlertFeed() {
  const { alerts, dismissAlert } = useAlertFeed();
  const { restoreAlert, restoreAllAlerts } = useAlertsStore();
  const { toggleAlertFeed } = useUIStore();
  const [showDismissed, setShowDismissed] = useState(false);

  const activeAlerts = alerts.filter((a) => !a.is_dismissed);
  const dismissedAlerts = alerts.filter((a) => a.is_dismissed);

  const visibleAlerts = showDismissed ? dismissedAlerts : activeAlerts;
  const recent = visibleAlerts.slice(0, MAX_VISIBLE_ALERTS);
  const hiddenCount = Math.max(visibleAlerts.length - MAX_VISIBLE_ALERTS, 0);

  return (
    <aside
      style={{
        width: 300,
        background: "var(--soc-surface)",
        borderLeft: "1px solid var(--soc-border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        className="p-3"
        style={{ borderBottom: "1px solid var(--soc-border)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span
              className="text-xs font-semibold"
              style={{
                color: "var(--soc-text)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Alert Feed
            </span>

            <p className="text-xs mt-0.5" style={{ color: "var(--soc-muted)" }}>
              {showDismissed
                ? `Dismissed ${recent.length} of ${dismissedAlerts.length}`
                : `Active ${recent.length} of ${activeAlerts.length}`}
            </p>
          </div>

          <button
            onClick={toggleAlertFeed}
            style={{ color: "var(--soc-muted)" }}
            title="Hide alert feed"
          >
            <X size={12} />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowDismissed(false)}
            className="text-xs px-2 py-1 rounded"
            style={{
              background: !showDismissed
                ? "rgba(59,130,246,0.15)"
                : "var(--soc-surface-2)",
              color: !showDismissed ? "#60a5fa" : "var(--soc-muted)",
              border: "1px solid var(--soc-border)",
            }}
          >
            Active ({activeAlerts.length})
          </button>

          <button
            onClick={() => setShowDismissed(true)}
            className="text-xs px-2 py-1 rounded"
            style={{
              background: showDismissed
                ? "rgba(245,158,11,0.12)"
                : "var(--soc-surface-2)",
              color: showDismissed ? "var(--soc-amber)" : "var(--soc-muted)",
              border: "1px solid var(--soc-border)",
            }}
          >
            Dismissed ({dismissedAlerts.length})
          </button>

          {dismissedAlerts.length > 0 && (
            <button
              onClick={restoreAllAlerts}
              className="text-xs px-2 py-1 rounded inline-flex items-center gap-1"
              style={{
                background: "var(--soc-surface-2)",
                color: "var(--soc-green)",
                border: "1px solid var(--soc-border)",
              }}
            >
              <RotateCcw size={10} />
              Restore All
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {recent.length === 0 ? (
          <div
            className="p-4 text-center text-xs"
            style={{ color: "var(--soc-muted)" }}
          >
            {showDismissed ? "No dismissed alerts" : "No active alerts"}
          </div>
        ) : (
          <>
            {recent.map((alert) => (
              <div key={alert.id}>
                <AlertItem
                  alert={alert}
                  onDismiss={() => dismissAlert(alert.id)}
                />

                {showDismissed && (
                  <div
                    className="px-3 pb-2"
                    style={{ borderBottom: "1px solid var(--soc-border)" }}
                  >
                    <button
                      onClick={() => restoreAlert(alert.id)}
                      className="text-xs px-2 py-1 rounded inline-flex items-center gap-1"
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        color: "var(--soc-green)",
                        border: "1px solid rgba(16,185,129,0.25)",
                      }}
                    >
                      <RotateCcw size={10} />
                      Restore
                    </button>
                  </div>
                )}
              </div>
            ))}

            {hiddenCount > 0 && (
              <div
                className="p-3 text-center text-xs"
                style={{
                  color: "var(--soc-muted)",
                  borderTop: "1px solid var(--soc-border)",
                }}
              >
                {hiddenCount} older alerts hidden
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}