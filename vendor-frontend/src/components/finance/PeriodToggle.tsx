import type { FinancePeriodKey } from "../../api/types";

type PeriodToggleProps = {
  value: FinancePeriodKey;
  onChange: (period: FinancePeriodKey) => void;
};

export function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  return (
    <div className="finance-period-toggle" role="group" aria-label="Revenue period">
      {(["ytd", "mtd"] as const).map((period) => (
        <button
          key={period}
          type="button"
          className={value === period ? "finance-period-toggle__active" : ""}
          aria-pressed={value === period}
          onClick={() => onChange(period)}
        >
          {period.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
