import os
import json
from datetime import datetime
from html import escape

OUTPUT_DIR = "tmp/reports"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def _risk_color(score: int) -> str:
    if score >= 85: return "#ef4444"
    if score >= 65: return "#f97316"
    if score >= 40: return "#eab308"
    return "#22c55e"


def _severity_label(score: int) -> str:
    if score >= 85: return "CRITICAL"
    if score >= 65: return "HIGH"
    if score >= 40: return "MEDIUM"
    return "LOW"


def _format_findings_table(module_id: str, result: dict) -> str:
    key_map = {
        "kolkhoz":   ("results",    "exchange_name",  "risk_score", "exchange_category"),
        "droper":    ("top_channels","channel",        "risk_score", "crime_category"),
        "piramida":  ("results",    "scheme_name",    "risk_score", "scheme_category"),
        "shadowbet": ("results",    "platform_name",  "risk_score", "betting_category"),
        "tengraf":   ("findings",   "title",          "risk_score", "crime_category"),
        "contraband":("findings",   "title",          "risk_score", "crime_category"),
    }
    items_key, name_key, score_key, cat_key = key_map.get(module_id, ("results", "title", "risk_score", "category"))
    items = result.get(items_key) or []
    if not items:
        return "<p style='color:#6b7280;font-size:13px;'>No findings in this scan.</p>"

    rows = ""
    for item in items[:30]:
        name  = escape(str(item.get(name_key, "Unknown")))
        score = int(item.get(score_key, 0) or 0)
        cat   = escape(str(item.get(cat_key, "—")))
        color = _risk_color(score)
        sev   = _severity_label(score)
        rows += f"""
        <tr>
          <td style='padding:8px 12px;color:#e5e7eb;font-size:12px;border-bottom:1px solid #1f2937'>{name}</td>
          <td style='padding:8px 12px;color:#9ca3af;font-size:11px;border-bottom:1px solid #1f2937'>{cat.replace("_"," ")}</td>
          <td style='padding:8px 12px;border-bottom:1px solid #1f2937;text-align:center'>
            <span style='background:{color}22;color:{color};border:1px solid {color}44;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700'>{sev}</span>
          </td>
          <td style='padding:8px 12px;color:{color};font-weight:700;font-size:13px;border-bottom:1px solid #1f2937;text-align:center'>{score}</td>
        </tr>"""

    return f"""
    <table style='width:100%;border-collapse:collapse;'>
      <thead>
        <tr style='background:#0d1626'>
          <th style='padding:8px 12px;text-align:left;color:#6b7280;font-size:10px;letter-spacing:.1em;text-transform:uppercase'>Entity / Finding</th>
          <th style='padding:8px 12px;text-align:left;color:#6b7280;font-size:10px;letter-spacing:.1em;text-transform:uppercase'>Category</th>
          <th style='padding:8px 12px;text-align:center;color:#6b7280;font-size:10px;letter-spacing:.1em;text-transform:uppercase'>Severity</th>
          <th style='padding:8px 12px;text-align:center;color:#6b7280;font-size:10px;letter-spacing:.1em;text-transform:uppercase'>Risk Score</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>"""


def _kpi_card(label: str, value: str, color: str = "#60a5fa") -> str:
    return f"""
    <div style='background:#0d1626;border:1px solid #1f2937;border-radius:8px;padding:16px;min-width:120px;flex:1'>
      <p style='color:#6b7280;font-size:9px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 6px'>{label}</p>
      <p style='color:{color};font-size:20px;font-weight:900;margin:0'>{escape(str(value))}</p>
    </div>"""


async def generate_pdf(module_id: str, data: dict, report_id: str) -> str:
    title        = data.get("title", f"{module_id.upper()} Evidence Report")
    result       = data.get("result") or {}
    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    generated_by = data.get("generated_by", "analyst")

    mode          = result.get("mode", "live")
    scan_duration = result.get("scan_duration_seconds", 0)
    alerts_fired  = result.get("alerts_fired", 0)
    task_id       = result.get("task_id", data.get("task_id", "—"))

    # KPI values vary by module
    kpi_map = {
        "kolkhoz":   [("Exchanges Scanned", result.get("total_exchanges_scanned", 0), "#ef4444"),
                      ("High Risk",          result.get("high_risk_exchanges", 0),     "#f97316"),
                      ("Alerts Fired",       alerts_fired,                             "#eab308")],
        "droper":    [("Channels Scanned",  result.get("channels_scanned", 0),         "#f97316"),
                      ("Recruitment Found", result.get("recruitment_channels_found",0),"#ef4444"),
                      ("Alerts Fired",       alerts_fired,                             "#eab308")],
        "piramida":  [("Schemes Detected",  result.get("schemes_detected", 0),         "#eab308"),
                      ("High Risk",          result.get("high_risk_schemes", 0),        "#ef4444"),
                      ("Alerts Fired",       alerts_fired,                             "#f97316")],
        "shadowbet": [("Channels Scanned",  result.get("channels_scanned", 0),         "#a855f7"),
                      ("Platforms Found",   result.get("illegal_platforms_found", 0),  "#ef4444"),
                      ("Alerts Fired",       alerts_fired,                             "#eab308")],
        "tengraf":   [("Sources Scanned",   result.get("sources_scanned", 0),          "#3b82f6"),
                      ("Findings",           len(result.get("findings") or []),         "#ef4444"),
                      ("Alerts Fired",       alerts_fired,                             "#eab308")],
        "contraband":[("Findings",           len(result.get("findings") or []),         "#10b981"),
                      ("Alerts Fired",       alerts_fired,                             "#eab308"),
                      ("Scan Mode",          mode.upper(),                             "#60a5fa")],
    }
    kpi_items = kpi_map.get(module_id, [("Alerts Fired", alerts_fired, "#60a5fa")])
    kpis_html = "".join(_kpi_card(l, str(v), c) for l, v, c in kpi_items)
    kpis_html += _kpi_card("Scan Duration", f"{scan_duration}s", "#10b981")
    kpis_html += _kpi_card("Mode", mode.upper(), "#60a5fa" if mode == "live" else "#6b7280")

    findings_table = _format_findings_table(module_id, result)

    collector = result.get("collector_status") or {}
    collector_rows = ""
    for src, state in collector.items():
        if not isinstance(state, dict):
            continue
        dot_color = "#22c55e" if state.get("ready") else "#6b7280"
        count = state.get("raw_count", 0)
        err   = escape(str(state.get("error") or ""))
        collector_rows += f"""
        <tr>
          <td style='padding:6px 12px;color:#e5e7eb;font-size:12px;border-bottom:1px solid #1f2937'>
            <span style='display:inline-block;width:8px;height:8px;border-radius:50%;background:{dot_color};margin-right:8px'></span>
            {escape(src.replace("_"," ").title())}
          </td>
          <td style='padding:6px 12px;color:#9ca3af;font-size:12px;border-bottom:1px solid #1f2937'>{count} items</td>
          <td style='padding:6px 12px;color:#ef4444;font-size:11px;border-bottom:1px solid #1f2937'>{err}</td>
        </tr>"""
    collector_section = ""
    if collector_rows:
        collector_section = f"""
        <div class='card'>
          <h2>Collector Status</h2>
          <table style='width:100%;border-collapse:collapse'>
            <thead><tr style='background:#0d1626'>
              <th style='padding:6px 12px;text-align:left;color:#6b7280;font-size:10px;text-transform:uppercase'>Source</th>
              <th style='padding:6px 12px;text-align:left;color:#6b7280;font-size:10px;text-transform:uppercase'>Collected</th>
              <th style='padding:6px 12px;text-align:left;color:#6b7280;font-size:10px;text-transform:uppercase'>Error</th>
            </tr></thead>
            <tbody>{collector_rows}</tbody>
          </table>
        </div>"""

    result_json = escape(json.dumps(result, indent=2, ensure_ascii=False, default=str))

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{escape(title)}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #080d18; color: #e5e7eb; padding: 40px; min-height: 100vh; }}
    .header {{ background: linear-gradient(135deg, #0d1626 0%, #111827 100%);
               border: 1px solid #1f2937; border-radius: 12px; padding: 28px 32px; margin-bottom: 20px; }}
    .card {{ background: #111827; border: 1px solid #1f2937; border-radius: 12px;
             padding: 24px; margin-bottom: 16px; }}
    h1 {{ color: #f0f4f8; font-size: 22px; font-weight: 900; margin-bottom: 4px; }}
    h2 {{ color: #9ca3af; font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
          margin-bottom: 14px; font-weight: 700; }}
    .meta {{ color: #4b5563; font-size: 11px; margin-top: 2px; }}
    .badge {{ display: inline-block; padding: 4px 12px; border-radius: 4px;
              font-size: 10px; font-weight: 700; letter-spacing: .08em; }}
    pre {{ background: #0d1626; border: 1px solid #1f2937; border-radius: 8px;
           padding: 16px; overflow-x: auto; color: #9ca3af; font-size: 11px; line-height: 1.6; }}
    .kpi-row {{ display: flex; gap: 12px; flex-wrap: wrap; }}
    @media print {{ body {{ background: white; color: #111; }}
                    .card {{ border: 1px solid #ccc; }}
                    h1 {{ color: #111; }} }}
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class='header'>
    <div style='display:flex;justify-content:space-between;align-items:flex-start;gap:20px'>
      <div>
        <div style='display:flex;align-items:center;gap:10px;margin-bottom:8px'>
          <span class='badge' style='background:#1d4ed820;color:#60a5fa;border:1px solid #1d4ed840'>SHADOWGUARD</span>
          <span class='badge' style='background:#ef444420;color:#ef4444;border:1px solid #ef444440'>{escape(module_id.upper())}</span>
          <span class='badge' style='background:{"#10b98120" if mode == "live" else "#6b728020"};color:{"#10b981" if mode == "live" else "#6b7280"};border:1px solid {"#10b98140" if mode == "live" else "#6b728040"}'>{"● LIVE" if mode == "live" else "○ DEMO"}</span>
        </div>
        <h1>{escape(title)}</h1>
        <p class='meta'>Report ID: {escape(report_id)} &nbsp;·&nbsp; Task: {escape(str(task_id)[:24])}… &nbsp;·&nbsp; {escape(generated_at)}</p>
      </div>
    </div>
  </div>

  <!-- KPI STRIP -->
  <div class='card'>
    <h2>Scan Summary</h2>
    <div class='kpi-row'>{kpis_html}</div>
  </div>

  <!-- FINDINGS TABLE -->
  <div class='card'>
    <h2>Intelligence Findings</h2>
    {findings_table}
  </div>

  {collector_section}

  <!-- RAW DATA -->
  <div class='card'>
    <h2>Full Scan Result — Raw Data</h2>
    <pre>{result_json}</pre>
  </div>

  <p style='color:#374151;font-size:10px;text-align:center;margin-top:24px'>
    Generated by ShadowGuard AFM Intelligence Platform &nbsp;·&nbsp; {escape(generated_at)}
  </p>

</body>
</html>"""

    output_path = os.path.join(OUTPUT_DIR, f"{report_id}.html")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    return output_path
