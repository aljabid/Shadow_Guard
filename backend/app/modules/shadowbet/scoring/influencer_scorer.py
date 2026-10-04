def score(profile: dict) -> float:
    member_count = profile.get("member_count", 0)
    post_count = profile.get("promotion_post_count", 0)
    platform_count = len(profile.get("platforms_promoted", []))
    code_count = len(profile.get("affiliate_codes", []))
    return round(
        min(member_count / 10000 * 30, 30)
        + min(post_count * 3, 30)
        + min(platform_count * 10, 25)
        + min(code_count * 5, 15),
        1,
    )
