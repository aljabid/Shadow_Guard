export const theme = {
  colors: {
    bg: "#0a0e1a",
    surface: "#111827",
    surface2: "#1a2234",
    border: "#1f2937",
    accent: "#e94560",
    amber: "#f59e0b",
    green: "#10b981",
    blue: "#3b82f6",
    text: "#e5e7eb",
    muted: "#6b7280",
  },
  risk: {
    critical: "#ef4444",
    high: "#f59e0b",
    medium: "#eab308",
    low: "#10b981",
  },
} as const;

export function getRiskColor(score: number): string {
  if (score >= 85) return theme.risk.critical;
  if (score >= 65) return theme.risk.high;
  if (score >= 40) return theme.risk.medium;
  return theme.risk.low;
}

export function getRiskLevel(score: number): string {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}
