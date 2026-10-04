def calculate_total_reach(influencer_map: dict) -> dict:
    total_members = 0
    estimated_reach = 0
    by_tier = {"mega": 0, "macro": 0, "micro": 0, "nano": 0}
    for influencer, data in influencer_map.items():
        members = data.get("member_count", 0)
        total_members += members
        if members >= 100000:
            tier, reach = "mega", int(members * 0.15)
        elif members >= 10000:
            tier, reach = "macro", int(members * 0.20)
        elif members >= 1000:
            tier, reach = "micro", int(members * 0.25)
        else:
            tier, reach = "nano", int(members * 0.30)
        estimated_reach += reach
        by_tier[tier] += 1
    return {"total_influencers": len(influencer_map), "total_members": total_members,
            "estimated_unique_reach": estimated_reach, "by_tier": by_tier}
