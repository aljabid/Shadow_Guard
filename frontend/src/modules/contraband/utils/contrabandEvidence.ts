export interface EvidenceItem {
  title: string;
  value: string;
}

export interface EvidencePackage {
  generatedAt: string;
  findingTitle: string;
  riskScore: number;
  category: string;
  source: string;
  analystSummary: string;
  evidence: EvidenceItem[];
}

export function buildEvidencePackage(
  finding: any
): EvidencePackage {
  const evidence: EvidenceItem[] = [];

  const entities = finding?.entities || {};

  Object.entries(entities).forEach(
    ([key, value]: [string, any]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          evidence.push({
            title: key,
            value: String(item),
          });
        });
      }
    }
  );

  if (finding?.source_url) {
    evidence.push({
      title: "Source URL",
      value: finding.source_url,
    });
  }

  if (
    Array.isArray(finding?.evidence_urls)
  ) {
    finding.evidence_urls.forEach(
      (url: string) => {
        evidence.push({
          title: "Evidence URL",
          value: url,
        });
      }
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    findingTitle:
      finding?.title || "Unknown Finding",
    riskScore:
      Number(finding?.risk_score || 0),
    category:
      finding?.crime_category || "Unknown",
    source:
      finding?.source_type || "Unknown",
    analystSummary:
      finding?.analyst_summary || "",
    evidence,
  };
}

export function getEvidenceCount(
  finding: any
): number {
  let count = 0;

  if (
    Array.isArray(finding?.evidence_urls)
  ) {
    count += finding.evidence_urls.length;
  }

  const entities = finding?.entities || {};

  Object.values(entities).forEach(
    (value: any) => {
      if (Array.isArray(value)) {
        count += value.length;
      }
    }
  );

  return count;
}

export function hasEvidence(
  finding: any
): boolean {
  return getEvidenceCount(finding) > 0;
}

export function getEvidencePriority(
  score?: number
): string {
  const risk = Number(score || 0);

  if (risk >= 85) {
    return "CRITICAL";
  }

  if (risk >= 70) {
    return "HIGH";
  }

  if (risk >= 40) {
    return "MEDIUM";
  }

  return "LOW";
}

export function exportEvidenceJson(
  finding: any
): string {
  return JSON.stringify(
    buildEvidencePackage(finding),
    null,
    2
  );
}