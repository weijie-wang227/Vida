import {
  categoryIcon,
  vidaCategories,
  vidaCategoryColor,
  vidaCategoryLabel,
} from "../../lib/activityPresentation";
import type { vidaCategory } from "../../lib/types";
import { Check } from "lucide-react";

export function vidaCategorySelector({
  value,
  onToggle,
}: {
  value: vidaCategory[];
  onToggle: (category: vidaCategory) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-xs font-semibold text-muted-foreground">
        vida Categories
      </span>
      <div className="grid grid-cols-2 gap-2">
        {vidaCategories.map((category) => {
          const active = value.includes(category);
          const color = vidaCategoryColor[category];

          return (
            <button
              key={category}
              type="button"
              onClick={() => onToggle(category)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors"
              style={{
                borderColor: active ? color : "var(--border)",
                backgroundColor: active ? `${color}18` : "var(--card)",
              }}
            >
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${color}22`, color }}
              >
                {categoryIcon(category, 15)}
              </span>
              <span className="min-w-0 flex-1 text-xs font-semibold text-foreground">
                {vidaCategoryLabel[category]}
              </span>
              {active && <Check size={14} style={{ color }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
