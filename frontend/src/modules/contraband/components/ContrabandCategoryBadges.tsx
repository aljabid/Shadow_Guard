import {
  Beer,
  Cigarette,
  PackageSearch,
  Pill,
  ShieldAlert,
  Truck,
  X,
} from "lucide-react";

import { formatCategory } from "../utils/contrabandFormatters";
import { getContrabandCategoryColor } from "../utils/contrabandColors";

interface Props {
  categoryCounts?: Record<string, number>;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
}

function getCategoryIcon(category: string) {
  const value = category.toUpperCase();

  if (value.includes("DRUG")) return <Pill size={13} />;
  if (value.includes("VAPE")) return <Cigarette size={13} />;
  if (value.includes("ALCOHOL")) return <Beer size={13} />;
  if (value.includes("COURIER") || value.includes("DROP")) {
    return <Truck size={13} />;
  }

  if (value.includes("DARKNET")) return <ShieldAlert size={13} />;

  return <PackageSearch size={13} />;
}

export default function ContrabandCategoryBadges({
  categoryCounts = {},
  selectedCategory = null,
  onSelectCategory,
}: Props) {
  const entries = Object.entries(categoryCounts);

  if (entries.length === 0) return null;

  return (
    <div className="card relative overflow-hidden">
      <div
        className="absolute -left-8 -top-8 h-24 w-24 rounded-full blur-2xl"
        style={{ background: "rgba(168,85,247,0.12)" }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase" style={{ color: "var(--soc-text)" }}>
            Contraband Categories
          </h3>

          {selectedCategory ? (
            <button
              onClick={() => onSelectCategory?.(null)}
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: "var(--soc-muted)" }}
            >
              <X size={12} />
              Clear filter
            </button>
          ) : (
            <span className="text-xs" style={{ color: "var(--soc-muted)" }}>
              Click a category to filter findings
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {entries.map(([category, count]) => {
            const color = getContrabandCategoryColor(category);
            const active = selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() =>
                  onSelectCategory?.(active ? null : category)
                }
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition"
                style={{
                  background: active
                    ? "rgba(59,130,246,0.16)"
                    : "var(--soc-surface-2)",
                  border: active
                    ? "1px solid var(--soc-accent)"
                    : "1px solid var(--soc-border)",
                  color,
                  boxShadow: active
                    ? "0 0 0 1px rgba(59,130,246,0.25)"
                    : "none",
                }}
              >
                {getCategoryIcon(category)}
                {formatCategory(category)}
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    background: active
                      ? "rgba(59,130,246,0.22)"
                      : "rgba(255,255,255,0.06)",
                    color: "var(--soc-text)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}