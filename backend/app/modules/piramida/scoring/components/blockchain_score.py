def score(inflow_analysis: dict) -> float:
    if not inflow_analysis:
        return 0.0
    base = 0.0
    total_inflow = inflow_analysis.get("total_inflow_usdt", 0)
    pattern = inflow_analysis.get("pattern", "normal")
    is_suspicious = inflow_analysis.get("is_suspicious", False)
    if total_inflow > 100000:
        base += 40
    elif total_inflow > 10000:
        base += 25
    elif total_inflow > 1000:
        base += 10
    if pattern == "many_small_inflows":
        base += 30
    if is_suspicious:
        base += 20
    return round(min(base, 100), 1)
