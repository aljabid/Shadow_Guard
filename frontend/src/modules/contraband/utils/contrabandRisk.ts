export function getRiskLevel(score?: number): string {
  const risk = Number(score || 0);

  if (risk >= 85) return "critical";
  if (risk >= 70) return "high";
  if (risk >= 40) return "medium";

  return "low";
}

export function getRiskLabel(score?: number): string {
  const risk = Number(score || 0);

  if (risk >= 85) return "CRITICAL";
  if (risk >= 70) return "HIGH";
  if (risk >= 40) return "MEDIUM";

  return "LOW";
}

export function getRiskColor(score?: number): string {
  const risk = Number(score || 0);

  if (risk >= 85) {
    return "var(--soc-red)";
  }

  if (risk >= 70) {
    return "var(--soc-amber)";
  }

  if (risk >= 40) {
    return "#60a5fa";
  }

  return "var(--soc-green)";
}

export function getRiskBackground(score?: number): string {
  const risk = Number(score || 0);

  if (risk >= 85) {
    return "rgba(239,68,68,0.12)";
  }

  if (risk >= 70) {
    return "rgba(245,158,11,0.12)";
  }

  if (risk >= 40) {
    return "rgba(96,165,250,0.12)";
  }

  return "rgba(16,185,129,0.12)";
}

export function isCritical(score?: number): boolean {
  return Number(score || 0) >= 85;
}

export function isHigh(score?: number): boolean {
  return Number(score || 0) >= 70;
}

export function isMedium(score?: number): boolean {
  return Number(score || 0) >= 40;
}

export function getHighestRisk(findings: any[] = []): number {
  if (!findings.length) {
    return 0;
  }

  return Math.max(
    ...findings.map((item) =>
      Number(item?.risk_score || 0)
    )
  );
}

export function countCriticalFindings(
  findings: any[] = []
): number {
  return findings.filter(
    (item) => Number(item?.risk_score || 0) >= 85
  ).length;
}

export function countHighRiskFindings(
  findings: any[] = []
): number {
  return findings.filter(
    (item) => Number(item?.risk_score || 0) >= 70
  ).length;
}

export function calculateAverageRisk(
  findings: any[] = []
): number {
  if (!findings.length) {
    return 0;
  }

  const total = findings.reduce(
    (sum, item) =>
      sum + Number(item?.risk_score || 0),
    0
  );

  return Math.round(total / findings.length);
}

export function getRecommendedPriority(
  score?: number
): string {
  const risk = Number(score || 0);

  if (risk >= 85) {
    return "Immediate Investigation";
  }

  if (risk >= 70) {
    return "Analyst Review Required";
  }

  if (risk >= 40) {
    return "Monitor Activity";
  }

  return "Archive";
}