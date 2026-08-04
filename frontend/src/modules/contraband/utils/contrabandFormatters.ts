export function formatCategory(category?: string): string {
  if (!category) return "Unknown";

  return category
    .split("_").join(" ")
    .toLowerCase()
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export function formatRiskLevel(score?: number): string {
  const risk = Number(score || 0);

  if (risk >= 85) return "Critical";
  if (risk >= 70) return "High";
  if (risk >= 40) return "Medium";

  return "Low";
}

export function formatFindingCount(count?: number): string {
  return Number(count || 0).toLocaleString();
}

export function formatSourceName(source?: string): string {
  if (!source) return "Unknown Source";

  return source
    .split("_").join(" ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export function formatCollectorName(name?: string): string {
  const value = String(name || "").toLowerCase();

  switch (value) {
    case "telegram":
      return "Telegram";

    case "darknet":
      return "DarkNet";

    case "web":
      return "Open Web";

    case "instagram":
      return "Instagram";

    default:
      return name || "Unknown";
  }
}

export function shortenText(
  text?: string,
  maxLength = 140
): string {
  if (!text) return "";

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + "...";
}

export function formatDateTime(value?: string): string {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function extractSourceUrl(finding: any): string | null {
  return (
    finding?.source_url ||
    finding?.url ||
    finding?.source_data?.source_url ||
    null
  );
}

export function extractEvidenceCount(finding: any): number {
  return (
    finding?.evidence_urls?.length ||
    finding?.source_data?.evidence_urls?.length ||
    0
  );
}

export function extractEntityCount(finding: any): number {
  const entities = finding?.entities;

  if (!entities) return 0;

  return Object.values(entities).reduce(
    (acc: number, current: any) =>
      acc + (Array.isArray(current) ? current.length : 0),
    0
  );
}