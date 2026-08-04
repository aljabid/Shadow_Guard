interface Props {
  status: "active" | "idle" | "running" | "error" | "coming_soon";
  label?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", idle: "#6b7280", running: "#3b82f6",
  error: "#ef4444", coming_soon: "#6b7280",
};

export default function StatusIndicator({ status, label }: Props) {
  const color = STATUS_COLORS[status] || "#6b7280";
  const isAnimated = status === "running" || status === "active";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: color,
        display: "inline-block",
        animation: isAnimated ? "pulse 2s infinite" : "none",
      }} />
      {label && <span style={{ fontSize: 11, color, textTransform: "capitalize" }}>{label}</span>}
    </span>
  );
}
