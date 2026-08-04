/** Thin wrapper that renders a titled card section around a list of FindingCards */
interface Props {
  title: string;
  count: number;
  children: React.ReactNode;
  emptyMessage?: string;
}

export default function FindingsList({ title, count, children, emptyMessage }: Props) {
  if (count === 0) {
    return emptyMessage ? (
      <div className="card">
        <p className="text-sm text-center py-4" style={{ color: "var(--soc-muted)" }}>
          {emptyMessage}
        </p>
      </div>
    ) : null;
  }

  return (
    <div className="card">
      <h3
        className="text-xs font-semibold mb-4 uppercase tracking-wide flex items-center justify-between"
        style={{ color: "var(--soc-text)" }}
      >
        <span>{title}</span>
        <span
          className="px-2 py-0.5 rounded text-xs font-bold"
          style={{
            background: "rgba(233,69,96,0.12)",
            color: "var(--soc-accent)",
          }}
        >
          {count}
        </span>
      </h3>

      <div className="space-y-3">{children}</div>
    </div>
  );
}
