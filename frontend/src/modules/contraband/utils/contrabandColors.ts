export function getContrabandCategoryColor(category?: string): string {
  const value = String(category || "").toUpperCase();

  if (value.includes("DRUG")) return "#ef4444";
  if (value.includes("VAPE")) return "#a855f7";
  if (value.includes("ALCOHOL")) return "#f97316";
  if (value.includes("COURIER")) return "#eab308";
  if (value.includes("DROP")) return "#eab308";
  if (value.includes("DARKNET")) return "#22c55e";

  return "var(--soc-muted)";
}

export function getContrabandSourceColor(source?: string): string {
  const value = String(source || "").toLowerCase();

  if (value.includes("telegram")) return "#60a5fa";
  if (value.includes("darknet")) return "#22c55e";
  if (value.includes("instagram")) return "#f472b6";
  if (value.includes("web")) return "#38bdf8";

  return "var(--soc-muted)";
}

export function getContrabandRiskColor(score?: number): string {
  const risk = Number(score || 0);

  if (risk >= 85) return "var(--soc-red)";
  if (risk >= 70) return "var(--soc-amber)";
  if (risk >= 40) return "#60a5fa";

  return "var(--soc-green)";
}

export function getCollectorStatusColor(enabled?: boolean): string {
  return enabled ? "var(--soc-green)" : "var(--soc-red)";
}

export function getCollectorStatusBackground(enabled?: boolean): string {
  return enabled ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";
}