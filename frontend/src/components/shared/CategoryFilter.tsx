import { Layers } from "lucide-react";

interface Props {
  title: string;
  counts: Record<string, number>;
  getColor?: (key: string) => string;
  formatLabel?: (key: string) => string;
}

export default function CategoryFilter({ title, counts, getColor, formatLabel }: Props) {
  if (Object.keys(counts).length === 0) return null;

  return (
    <div className="card mb-4">
      <h3
        className="text-xs font-semibold mb-3 flex items-center gap-2 uppercase tracking-wide"
        style={{ color: "var(--soc-muted)" }}
      >
        <Layers size={12} />
        {title}
      </h3>

      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([key, count]) => (
          <span
            key={key}
            className="text-xs px-2 py-1 rounded"
            style={{
              background: "var(--soc-surface-2)",
              border: "1px solid var(--soc-border)",
              color: getColor ? getColor(key) : "var(--soc-text)",
            }}
          >
            {formatLabel ? formatLabel(key) : key.split("_").join(" ")}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}
