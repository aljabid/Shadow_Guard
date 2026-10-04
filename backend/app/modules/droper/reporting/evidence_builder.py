from datetime import datetime
from typing import List


def build_droper_evidence(top_channels: List[dict], communities: List[dict], task_id: str) -> dict:
    total_members = sum(c.get("member_count", 0) for c in top_channels)
    total_posts = sum(c.get("recruitment_post_count", 0) for c in top_channels)
    return {
        "report_type": "DROPER Drop Card Network Intelligence Report",
        "generated_at": datetime.utcnow().isoformat(),
        "task_id": task_id,
        "executive_summary": (
            f"Automated OSINT scan detected {len(top_channels)} active drop card recruitment channels "
            f"with {total_members:,} members and {total_posts} recruitment posts. "
            f"{len(communities)} distinct criminal networks identified."
        ),
        "network_overview": {"total_channels": len(top_channels), "total_members": total_members,
                             "total_recruitment_posts": total_posts, "criminal_networks": len(communities)},
        "top_channels": top_channels[:5],
        "criminal_networks": communities,
        "recommended_action": "Submit takedown requests for top-ranked channels.",
    }
