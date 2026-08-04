from typing import List


def analyze_outflow_velocity(wallet_results: list) -> dict:
    if not wallet_results:
        return {"signal_strength": 0.0, "interpretation": "no_data"}
    signals = [w for w in wallet_results if w.get("outflow_signal")]
    ratio_avg = 0.0
    if signals:
        ratios = [s.get("7d_outflow", 0) / max(s.get("7d_inflow", 0.01), 0.01) for s in signals]
        ratio_avg = sum(ratios) / len(ratios)
    signal_strength = min(ratio_avg / 10.0, 1.0)
    if signal_strength > 0.8:
        interpretation = "critical_outflow"
    elif signal_strength > 0.5:
        interpretation = "high_outflow"
    elif signal_strength > 0.2:
        interpretation = "moderate_outflow"
    else:
        interpretation = "normal"
    return {
        "signal_strength": round(signal_strength, 3),
        "interpretation": interpretation,
        "wallets_with_outflow_signal": len(signals),
        "average_outflow_ratio": round(ratio_avg, 2),
    }
