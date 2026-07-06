import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

export function NumberStepper({
  icon,
  label,
  min,
  step,
  suffix,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  min: number;
  step: number;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const numericValue = Number(value) || min;
  const updateValue = (nextValue: number) => {
    onChange(String(Math.max(min, nextValue)));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => updateValue(numericValue - step)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          aria-label={`Decrease ${label}`}
        >
          <Minus size={13} />
        </button>
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 min-w-0 flex-1 rounded-lg bg-input-background px-2 text-center text-sm font-bold text-foreground outline-none"
        />
        <button
          type="button"
          onClick={() => updateValue(numericValue + step)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          aria-label={`Increase ${label}`}
        >
          <Plus size={13} />
        </button>
      </div>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        {suffix}
      </p>
    </div>
  );
}
