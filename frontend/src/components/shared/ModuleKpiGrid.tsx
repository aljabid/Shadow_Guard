interface KpiItem {
  label: string;
  value: string | number;
  accent?: boolean;
  highlight?: boolean;
}

interface Props {
  items: KpiItem[];
  cols?: number;
}

export default function ModuleKpiGrid({ items, cols = 4 }: Props) {
  return (
    <div
      className="grid gap-3 mb-5"
      style={{ gridTemplateColumns: `repeat(${Math.min(cols, items.length)}, 1fr)` }}
    >
      {items.map((item) => (
        <div key={item.label} className="card">
          <p className="text-xs" style={{ color: "var(--soc-muted)" }}>
            {item.label}
          </p>
          <p
            className="text-xl font-bold mt-1"
            style={{
              color: item.accent
                ? "var(--soc-accent)"
                : item.highlight
                ? "var(--soc-amber)"
                : "var(--soc-text)",
            }}
          >
            {String(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
