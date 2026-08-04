export type ContrabandSourceKey =
  | "telegram"
  | "web"
  | "darknet"
  | "instagram";

export type ContrabandCategory =
  | "DRUG_TRAFFICKING"
  | "DRUG_DROP_NETWORK"
  | "DARKNET_DRUG_MARKET"
  | "ILLEGAL_VAPE_SALES"
  | "ILLEGAL_VAPE_MARKETING"
  | "ILLEGAL_ALCOHOL_SALES"
  | "CONTRABAND_ALCOHOL"
  | "COURIER_NETWORK"
  | "CONTRABAND_INTELLIGENCE"
  | string;

export interface ContrabandEntities {
  telegram_handles?: string[];
  phones?: string[];
  wallets?: string[];
  domains?: string[];
  locations?: string[];
  substances?: string[];
  brands?: string[];
  prices?: string[];
  couriers?: string[];
}

export interface ContrabandFinding {
  title?: string;
  crime_category?: ContrabandCategory;
  risk_score?: number;
  risk_level?: "low" | "medium" | "high" | "critical" | string;
  source_type?: string;
  source_name?: string;
  source?: string;
  source_url?: string;
  url?: string;
  city?: string;
  country?: string;
  evidence_priority?: string;
  analyst_summary?: string;
  red_flags?: string[];
  recommended_actions?: string[];
  evidence_urls?: string[];
  raw_text_excerpt?: string;
  entities?: ContrabandEntities;
  source_data?: {
    source_url?: string;
    evidence_urls?: string[];
    telegram_links?: string[];
    web_links?: string[];
    onion_links?: string[];
    github_links?: string[];
    reddit_links?: string[];
  };
  ml_classification?: {
    enabled: boolean;
    label?: string;
    confidence?: number;
    low_confidence?: boolean;
    model_name?: string;
    model_version?: string;
  };
}

export interface ContrabandGraphNode {
  id: string;
  label: string;
  node_type?: string;
  risk_score?: number;
}

export interface ContrabandGraphEdge {
  source: string;
  target: string;
  edge_type?: string;
  label?: string;
}

export interface ContrabandResult {
  module?: string;
  module_id?: string;
  task_id?: string;
  mode?: string;
  created_at?: string;
  completed_at?: string;

  sources_scanned?: number;
  findings_count?: number;
  drug_findings?: number;
  vape_findings?: number;
  alcohol_findings?: number;
  courier_networks?: number;
  high_risk_findings?: number;
  alerts_fired?: number;

  category_counts?: Record<string, number>;
  collector_status?: Record<string, boolean>;

  findings?: ContrabandFinding[];
  graph_nodes?: ContrabandGraphNode[];
  graph_edges?: ContrabandGraphEdge[];

  analyst_summary?: string;
  recommended_actions?: string[];
  error?: string;

  dashboard_summary?: {
    top_risk_score?: number;
    top_category?: string | null;
    top_title?: string | null;
    has_critical?: boolean;
    has_darknet?: boolean;
    has_telegram?: boolean;
    has_wallets?: boolean;
    has_locations?: boolean;
  };
}

export interface ContrabandSourceState {
  includeTelegram: boolean;
  includeWeb: boolean;
  includeDarknet: boolean;
  includeInstagram: boolean;
}

export interface ContrabandSourceSetters {
  setIncludeTelegram: (value: boolean) => void;
  setIncludeWeb: (value: boolean) => void;
  setIncludeDarknet: (value: boolean) => void;
  setIncludeInstagram: (value: boolean) => void;
}