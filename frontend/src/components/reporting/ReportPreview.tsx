interface Props { report: any; }

export default function ReportPreview({ report }: Props) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--soc-text)" }}>{report.title}</h3>
      <p className="text-xs" style={{ color: "var(--soc-muted)" }}>{report.summary}</p>
      <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: "var(--soc-muted)" }}>
        <span>Module: {report.module_id?.toUpperCase()}</span>
        <span>{new Date(report.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
}
