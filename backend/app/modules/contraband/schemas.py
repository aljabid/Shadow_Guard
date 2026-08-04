from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ContrabandCategory(str, Enum):
    drug_vendor = "DRUG_VENDOR"
    drug_drop_network = "DRUG_DROP_NETWORK"
    drug_courier_network = "DRUG_COURIER_NETWORK"
    vape_smuggling = "VAPE_SMUGGLING"
    vape_wholesale = "VAPE_WHOLESALE"
    unlicensed_vape_sale = "UNLICENSED_VAPE_SALE"
    alcohol_smuggling = "ALCOHOL_SMUGGLING"
    counterfeit_alcohol = "COUNTERFEIT_ALCOHOL"
    unlicensed_alcohol_sale = "UNLICENSED_ALCOHOL_SALE"
    contraband_marketplace = "CONTRABAND_MARKETPLACE"
    osint_finding = "OSINT_FINDING"


class SourceType(str, Enum):
    telegram = "telegram"
    darknet = "darknet"
    public_web = "public_web"
    instagram = "instagram"
    forum = "forum"
    marketplace = "marketplace"
    simulated = "simulated"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class EvidencePriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ContrabandEntities(BaseModel):
    telegram_handles: List[str] = Field(default_factory=list)
    phones: List[str] = Field(default_factory=list)
    wallets: List[str] = Field(default_factory=list)
    domains: List[str] = Field(default_factory=list)
    urls: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    substances: List[str] = Field(default_factory=list)
    brands: List[str] = Field(default_factory=list)
    prices: List[str] = Field(default_factory=list)


class RawContrabandSource(BaseModel):
    source_type: SourceType
    source_name: str
    source_url: Optional[str] = None
    title: str
    text: str
    language: Optional[str] = None
    collected_at: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ContrabandFinding(BaseModel):
    title: str
    crime_category: ContrabandCategory
    risk_score: int = Field(default=0, ge=0, le=100)
    risk_level: RiskLevel = RiskLevel.low
    evidence_priority: EvidencePriority = EvidencePriority.low

    source_type: SourceType
    source_name: Optional[str] = None
    source_url: Optional[str] = None

    city: Optional[str] = None
    country: str = "Kazakhstan"

    entities: ContrabandEntities = Field(default_factory=ContrabandEntities)

    analyst_summary: str
    red_flags: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    evidence_urls: List[str] = Field(default_factory=list)

    alert_fired: bool = False
    confidence: str = "Medium"

    raw_text_excerpt: Optional[str] = None
    source_data: Dict[str, Any] = Field(default_factory=dict)


class ContrabandGraphNode(BaseModel):
    id: str
    label: str
    type: str
    risk_score: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ContrabandGraphEdge(BaseModel):
    source: str
    target: str
    label: str
    edge_type: str
    weight: int = 1


class ContrabandResult(BaseModel):
    module: str = "contraband"
    mode: str = "live"

    sources_scanned: int = 0
    findings_count: int = 0
    drug_findings: int = 0
    vape_findings: int = 0
    alcohol_findings: int = 0
    courier_networks: int = 0
    high_risk_findings: int = 0
    alerts_fired: int = 0

    category_counts: Dict[str, int] = Field(default_factory=dict)

    findings: List[ContrabandFinding] = Field(default_factory=list)
    graph_nodes: List[ContrabandGraphNode] = Field(default_factory=list)
    graph_edges: List[ContrabandGraphEdge] = Field(default_factory=list)

    created_at: Optional[str] = None
    completed_at: Optional[str] = None