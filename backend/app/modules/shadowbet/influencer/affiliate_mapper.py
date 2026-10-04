from typing import List


def map_affiliates(influencer_map: dict, platform_data: List[dict]) -> List[dict]:
    mappings = []
    for influencer, data in influencer_map.items():
        for code_data in data.get("affiliate_codes", []):
            code = code_data.get("code", "")
            for platform in platform_data:
                platform_name = platform.get("platform_name", "")
                channel = platform.get("channel", "")
                if channel == influencer or platform_name.lower() in " ".join(data.get("platforms", [])).lower():
                    mappings.append({
                        "influencer": influencer, "platform": platform_name,
                        "affiliate_code": code, "member_count": data.get("member_count", 0),
                    })
    return mappings
