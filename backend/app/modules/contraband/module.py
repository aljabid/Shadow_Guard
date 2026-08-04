from datetime import datetime
from typing import Any, Dict, List

from app.modules.base import BaseModule
from app.modules.contraband.service import run_contraband_intelligence


class ContrabandModule(BaseModule):
    module_id = "contraband"
    module_name = "CONTRABAND-KZ"
    module_version = "1.0.0"
    module_description = (
        "Drugs, vapes, alcohol, courier/drop-network, and contraband "
        "OSINT/DarkNet intelligence module for Kazakhstan."
    )
    name = "CONTRABAND-KZ"
    description = (
        "Drugs, vapes, alcohol, courier/drop-network, and contraband "
        "OSINT/DarkNet intelligence module for Kazakhstan."
    )

    DEFAULT_CONFIG = {
        "include_telegram": True,
        "include_web": True,
        "include_darknet": True,
        "include_instagram": True,
        "max_items": 20,
        "max_findings": 20,
        "max_channels": 20,
        "max_messages_per_channel": 30,
        "max_web_urls": 20,
        "max_darknet_urls": 15,
    }

    def normalize_input(self, input_data: Dict[str, Any] | None) -> Dict[str, Any]:
        input_data = input_data or {}

        normalized = {
            **self.DEFAULT_CONFIG,
            **input_data,
        }

        for key in [
            "include_telegram",
            "include_web",
            "include_darknet",
            "include_instagram",
        ]:
            normalized[key] = bool(normalized.get(key, True))

        for key in [
            "max_items",
            "max_findings",
            "max_channels",
            "max_messages_per_channel",
            "max_web_urls",
            "max_darknet_urls",
        ]:
            try:
                normalized[key] = int(normalized.get(key) or self.DEFAULT_CONFIG[key])
            except Exception:
                normalized[key] = self.DEFAULT_CONFIG[key]

        return normalized

    def build_empty_result(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()

        return {
            "module": self.module_id,
            "module_id": self.module_id,
            "mode": "live",
            "created_at": now,
            "completed_at": now,
            "sources_scanned": 0,
            "findings_count": 0,
            "drug_findings": 0,
            "vape_findings": 0,
            "alcohol_findings": 0,
            "courier_networks": 0,
            "high_risk_findings": 0,
            "alerts_fired": 0,
            "category_counts": {},
            "findings": [],
            "graph_nodes": [],
            "graph_edges": [],
            "timeline": [],
            "evidence_package": {},
            "entities": [],
            "risk_distribution": {
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
            },
            "collector_status": {
                "telegram": input_data.get("include_telegram", True),
                "web": input_data.get("include_web", True),
                "darknet": input_data.get("include_darknet", True),
                "instagram": input_data.get("include_instagram", True),
            },
            "analyst_summary": (
                "No contraband intelligence findings were detected from the "
                "configured OSINT and DarkNet sources during this scan."
            ),
            "recommended_actions": [
                "Review source configuration.",
                "Add more Telegram, open-web, DarkNet, or Instagram seed sources.",
                "Run the scan again after source list expansion.",
            ],
        }

    def build_dashboard_summary(self, result: Dict[str, Any]) -> Dict[str, Any]:
        findings: List[Dict[str, Any]] = result.get("findings") or []

        top_finding = findings[0] if findings else None

        return {
            "top_risk_score": int(top_finding.get("risk_score", 0)) if top_finding else 0,
            "top_category": top_finding.get("crime_category") if top_finding else None,
            "top_title": top_finding.get("title") if top_finding else None,
            "has_critical": any(
                int(f.get("risk_score") or 0) >= 85 for f in findings
            ),
            "has_darknet": any(
                str(f.get("source_type")) == "darknet" for f in findings
            ),
            "has_telegram": any(
                str(f.get("source_type")) == "telegram" for f in findings
            ),
            "has_wallets": any(
                (f.get("entities") or {}).get("wallets") for f in findings
            ),
            "has_locations": any(
                (f.get("entities") or {}).get("locations") for f in findings
            ),
        }

    def build_analyst_summary(self, result: Dict[str, Any]) -> str:
        findings_count = int(result.get("findings_count") or 0)
        alerts_fired = int(result.get("alerts_fired") or 0)
        drug_count = int(result.get("drug_findings") or 0)
        vape_count = int(result.get("vape_findings") or 0)
        alcohol_count = int(result.get("alcohol_findings") or 0)
        courier_count = int(result.get("courier_networks") or 0)

        if findings_count == 0:
            return (
                "CONTRABAND-KZ completed the scan but did not detect active "
                "drug, vape, alcohol, or courier/drop-network indicators."
            )

        return (
            f"CONTRABAND-KZ detected {findings_count} contraband-related "
            f"finding(s), including {drug_count} drug-related, {vape_count} "
            f"vape-related, {alcohol_count} alcohol-related, and "
            f"{courier_count} courier/drop-network finding(s). "
            f"{alerts_fired} alert(s) crossed the analyst review threshold."
        )

    def build_recommended_actions(self, result: Dict[str, Any]) -> List[str]:
        findings = result.get("findings") or []

        if not findings:
            return [
                "Expand configured OSINT sources.",
                "Verify Telegram, DarkNet, web, and Instagram collector settings.",
                "Run another scan after source updates.",
            ]

        actions = [
            "Prioritize findings with critical or high risk scores.",
            "Preserve Telegram, web, DarkNet, and Instagram evidence URLs.",
            "Correlate detected phones, wallets, domains, and Telegram handles.",
        ]

        if any(str(f.get("source_type")) == "darknet" for f in findings):
            actions.append("Review DarkNet evidence separately for vendor or marketplace attribution.")

        if any((f.get("entities") or {}).get("wallets") for f in findings):
            actions.append("Send detected wallets to CHAIN-KZ or crypto tracing workflow.")

        if any((f.get("entities") or {}).get("locations") for f in findings):
            actions.append("Map detected Kazakhstan locations for regional threat prioritization.")

        return actions[:6]

    def normalize_result(
            self,
            result: Dict[str, Any],
            input_data: Dict[str, Any],
            task_id: str | None,
    ) -> Dict[str, Any]:
        result["module"] = self.module_id
        result["module_id"] = self.module_id
        result["task_id"] = task_id
        result["mode"] = result.get("mode") or "live"

        result["created_at"] = result.get("created_at") or datetime.utcnow().isoformat()
        result["completed_at"] = result.get("completed_at") or datetime.utcnow().isoformat()

        result["findings"] = result.get("findings") or []

        try:
            from app.ml.enrichment import classify_for_finding
            for _f in result["findings"]:
                if "ml_classification" not in _f:
                    _ml_text = " ".join(filter(None, [
                        str(_f.get("title", "")),
                        str(_f.get("text", "")),
                        str(_f.get("description", "")),
                        str(_f.get("raw_excerpt", "")),
                    ]))
                    _f["ml_classification"] = classify_for_finding(_ml_text)
        except Exception:
            pass

        result["graph_nodes"] = result.get("graph_nodes") or []
        result["graph_edges"] = result.get("graph_edges") or []
        result["category_counts"] = result.get("category_counts") or {}

        result["timeline"] = result.get("timeline") or []
        result["entities"] = result.get("entities") or []
        result["evidence_package"] = result.get("evidence_package") or {}

        result["risk_distribution"] = (
                result.get("risk_distribution")
                or {
                    "critical": 0,
                    "high": 0,
                    "medium": 0,
                    "low": 0,
                }
        )

        result["sources_scanned"] = int(result.get("sources_scanned") or 0)
        result["findings_count"] = int(result.get("findings_count") or len(result["findings"]))
        result["alerts_fired"] = int(result.get("alerts_fired") or 0)
        result["drug_findings"] = int(result.get("drug_findings") or 0)
        result["vape_findings"] = int(result.get("vape_findings") or 0)
        result["alcohol_findings"] = int(result.get("alcohol_findings") or 0)
        result["courier_networks"] = int(result.get("courier_networks") or 0)
        result["high_risk_findings"] = int(result.get("high_risk_findings") or 0)

        result["collector_status"] = result.get("collector_status") or {
            "telegram": input_data.get("include_telegram", True),
            "web": input_data.get("include_web", True),
            "darknet": input_data.get("include_darknet", True),
            "instagram": input_data.get("include_instagram", True),
        }

        result["dashboard_summary"] = self.build_dashboard_summary(result)
        result["analyst_summary"] = self.build_analyst_summary(result)
        result["recommended_actions"] = self.build_recommended_actions(result)

        return result

    def validate_input(self, input_data: Dict[str, Any] | None) -> bool:
        return True

    def format_output(self, output: Dict[str, Any]) -> Dict[str, Any]:
        return output

    async def execute(
            self,
            input_data: Dict[str, Any] | None = None,
            task_id: str | None = None,
    ) -> Dict[str, Any]:
        normalized_input = self.normalize_input(input_data)

        try:
            result = await run_contraband_intelligence(normalized_input)

            if not result:
                result = self.build_empty_result(normalized_input)

            return self.normalize_result(
                result=result,
                input_data=normalized_input,
                task_id=task_id,
            )

        except Exception as exc:
            now = datetime.utcnow().isoformat()

            return {
                "module": self.module_id,
                "module_id": self.module_id,
                "task_id": task_id,
                "mode": "error",
                "created_at": now,
                "completed_at": now,
                "sources_scanned": 0,
                "findings_count": 0,
                "drug_findings": 0,
                "vape_findings": 0,
                "alcohol_findings": 0,
                "courier_networks": 0,
                "high_risk_findings": 0,
                "alerts_fired": 0,
                "category_counts": {},
                "findings": [],
                "graph_nodes": [],
                "graph_edges": [],
                "collector_status": {
                    "telegram": normalized_input.get("include_telegram", True),
                    "web": normalized_input.get("include_web", True),
                    "darknet": normalized_input.get("include_darknet", True),
                    "instagram": normalized_input.get("include_instagram", True),
                },
                "error": str(exc),
                "analyst_summary": (
                    "CONTRABAND-KZ scan failed before producing intelligence "
                    "findings. Review collector configuration and runtime logs."
                ),
                "recommended_actions": [
                    "Check Telegram, web, DarkNet, and Instagram collector configuration.",
                    "Verify .env values and network connectivity.",
                    "Review backend logs for the exact collector error.",
                ],
            }