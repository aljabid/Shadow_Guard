/**
 * MLBadge — displays the ml_classification field returned by the backend classifier.
 * Renders nothing if ml_classification is absent, null, or enabled=false.
 */

const LABEL_DISPLAY: Record<string, string> = {
  dropper_recruitment: "Dropper Recruitment",
  exchange_complaint:  "Exchange Complaint",
  pyramid_promo:       "Pyramid Scheme",
  gambling_promo:      "Gambling Promotion",
  contraband_sale:     "Contraband Sale",
  leak_sale:           "Data Leak Sale",
  normal:              "Normal / Benign",
};

function formatLabel(raw: string): string {
  return LABEL_DISPLAY[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface MLClassification {
  enabled: boolean;
  label?: string;
  confidence?: number;
  low_confidence?: boolean;
  model_name?: string;
  model_version?: string;
}

interface MLBadgeProps {
  ml?: MLClassification | null;
}

export default function MLBadge({ ml }: MLBadgeProps) {
  if (!ml || !ml.enabled || !ml.label) return null;

  const pct = ml.confidence != null ? Math.round(ml.confidence * 100) : null;
  const lowConf = ml.low_confidence || (pct != null && pct < 50);
  const confColor = lowConf ? "#f59e0b" : pct != null && pct >= 80 ? "#10b981" : "#60a5fa";

  return (
    <div
      className="mt-3 p-3 rounded"
      style={{
        background: "rgba(139,92,246,0.07)",
        border: "1px solid rgba(139,92,246,0.22)",
      }}
    >
      <p
        className="text-xs font-semibold mb-2 flex items-center gap-1.5"
        style={{ color: "#a78bfa", letterSpacing: "0.04em" }}
      >
        {/* brain icon via unicode — no extra dependency */}
        <span style={{ fontSize: 11 }}>🤖</span>
        AI Prediction
      </p>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <span
          className="text-xs font-bold"
          style={{ color: "#e5e7eb" }}
        >
          {formatLabel(ml.label)}
        </span>

        <div className="flex items-center gap-2">
          {lowConf && (
            <span
              className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{
                background: "rgba(245,158,11,0.12)",
                color: "#f59e0b",
                fontSize: 9,
                letterSpacing: "0.05em",
              }}
            >
              LOW CONFIDENCE
            </span>
          )}
          {pct != null && (
            <span
              className="text-xs font-bold"
              style={{ color: confColor }}
            >
              {pct}%
            </span>
          )}
        </div>
      </div>

      <p
        className="text-xs mt-1"
        style={{ color: "#4b5563", fontSize: 10 }}
      >
        {ml.model_name ?? "TF-IDF + Logistic Regression"}
        {ml.model_version ? ` v${ml.model_version}` : ""}
      </p>
    </div>
  );
}
