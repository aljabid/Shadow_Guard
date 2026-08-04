export function uniqueUrls(urls: unknown[]): string[] {
  return Array.from(
    new Set(
      urls
        .filter(Boolean)
        .map((u) => String(u).trim())
        .filter(Boolean)
    )
  );
}

export function normalizeUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("@")) return `https://t.me/${value.slice(1)}`;
  if (!value.includes(".") && !value.includes("/")) return `https://t.me/${value}`;
  return `https://${value}`;
}

export function isClickableUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

// Universal evidence URL extractor — works for all module result shapes
export function getBaseEvidenceUrls(item: Record<string, unknown>): string[] {
  const sourceData = (item?.source_data || item?.source || {}) as Record<string, unknown>;

  const raw = [
    item?.url,
    item?.source_url,
    item?.exchange_url,
    item?.website,
    item?.domain,
    item?.platform_domain,
    item?.channel,
    item?.username,
    item?.telegram,
    item?.support_channel,
    item?.link,
    sourceData?.source_url,
    ...((item?.evidence_urls as unknown[]) || []),
    ...((item?.affiliated_domains as unknown[]) || []),
    ...((item?.domains_found as unknown[]) || []),
    ...((sourceData?.evidence_urls as unknown[]) || []),
    ...((sourceData?.telegram_links as unknown[]) || []),
    ...((sourceData?.web_links as unknown[]) || []),
    ...((sourceData?.reddit_links as unknown[]) || []),
    ...((sourceData?.github_links as unknown[]) || []),
    ...((sourceData?.onion_links as unknown[]) || []),
  ].filter(Boolean);

  return uniqueUrls(raw.map((u) => normalizeUrl(String(u))));
}

export function formatFieldName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCategory(category?: string, fallback = "UNKNOWN"): string {
  if (!category) return fallback;
  return category.split("_").join(" ");
}
