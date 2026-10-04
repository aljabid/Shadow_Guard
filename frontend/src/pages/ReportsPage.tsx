import { useEffect, useState } from "react";
import { reportsApi } from "@/api/reports.api";
import { FileText, Download, RefreshCcw, Shield, Search, TrendingUp, Dice6, Network, PackageSearch } from "lucide-react";

const MODULE_ACCENT: Record<string, string> = {
  kolkhoz: "#ef4444", droper: "#f97316", piramida: "#eab308",
  shadowbet: "#a855f7", tengraf: "#3b82f6", contraband: "#10b981",
};
const MODULE_ICON: Record<string, React.ElementType> = {
  kolkhoz: Shield, droper: Search, piramida: TrendingUp,
  shadowbet: Dice6, tengraf: Network, contraband: PackageSearch,
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Report = { id: string; module_id: string; title: string; summary?: string; file_path?: string; created_at: string };

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    reportsApi.list().then(setReports).catch(() => setReports([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDownload = async (r: Report) => {
    if (downloading) return;
    setDownloading(r.id);
    try {
      await reportsApi.download(r.id, `shadowguard_${r.module_id}_${r.id.slice(0, 8)}_report.html`);
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ padding: "24px 28px", background: "#080d18", minHeight: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f0f4f8", fontSize: 18, fontWeight: 800, margin: 0 }}>Evidence Reports</h1>
          <p style={{ color: "#4b5563", fontSize: 12, marginTop: 4 }}>
            Reports generated from module scans — click Export Report on any Investigation finding to generate one.
          </p>
        </div>
        <button onClick={load}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#111827",
            border: "1px solid #1f2937", color: "#9ca3af", borderRadius: 6, padding: "6px 12px",
            fontSize: 11, cursor: "pointer" }}>
          <RefreshCcw size={11} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12 }}>
          <div style={{ width: 24, height: 24, border: "2px solid #1f2937", borderTopColor: "#60a5fa",
            borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#4b5563", fontSize: 13 }}>Loading reports…</p>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 48,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <FileText size={36} style={{ color: "#1f2937" }} />
          <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 600 }}>No evidence reports yet</p>
          <p style={{ color: "#374151", fontSize: 12, textAlign: "center", maxWidth: 360 }}>
            Run a module scan, open any finding in the Investigation view, then click
            <strong style={{ color: "#9ca3af" }}> Export Report</strong> — the evidence package will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reports.map((r) => {
            const accent = MODULE_ACCENT[r.module_id] || "#60a5fa";
            const Icon   = MODULE_ICON[r.module_id] || FileText;
            const isDown = downloading === r.id;
            return (
              <div key={r.id} style={{
                background: "#111827", border: "1px solid #1f2937", borderRadius: 10,
                padding: "16px 20px", display: "flex", alignItems: "center", gap: 16,
              }}>
                {/* Module icon */}
                <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                  background: `${accent}18`, border: `1px solid ${accent}30`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={16} style={{ color: accent }} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 700, margin: 0,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <span style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30`,
                      padding: "1px 8px", borderRadius: 4, fontSize: 9.5, fontWeight: 700 }}>
                      {r.module_id.toUpperCase()}
                    </span>
                    <span style={{ color: "#4b5563", fontSize: 11 }}>{timeAgo(r.created_at)}</span>
                    {r.summary && (
                      <span style={{ color: "#6b7280", fontSize: 11,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300 }}>
                        {r.summary}
                      </span>
                    )}
                  </div>
                </div>

                {/* Download button */}
                <button onClick={() => handleDownload(r)} disabled={isDown}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                    background: isDown ? "#1f2937" : `${accent}18`, border: `1px solid ${isDown ? "#374151" : accent + "40"}`,
                    color: isDown ? "#4b5563" : accent, borderRadius: 6, padding: "6px 14px",
                    fontSize: 11, fontWeight: 600, cursor: isDown ? "not-allowed" : "pointer" }}>
                  <Download size={11} />
                  {isDown ? "Downloading…" : "Download HTML"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
