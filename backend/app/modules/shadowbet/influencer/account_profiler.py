def build_profile(channel_name: str, member_count: int, post_count: int,
                  platforms_promoted: list, affiliate_codes: list) -> dict:
    if member_count >= 100000:
        tier, multiplier = "mega", 0.15
    elif member_count >= 10000:
        tier, multiplier = "macro", 0.20
    elif member_count >= 1000:
        tier, multiplier = "micro", 0.25
    else:
        tier, multiplier = "nano", 0.30
    return {
        "channel": channel_name, "member_count": member_count, "tier": tier,
        "promotion_post_count": post_count, "platforms_promoted": platforms_promoted,
        "affiliate_codes": affiliate_codes,
        "estimated_reach": int(member_count * multiplier),
        "liability_score": min((len(platforms_promoted) * 20) + (post_count * 2), 100),
    }
