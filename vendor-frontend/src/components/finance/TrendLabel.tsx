import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function TrendLabel({ value, suffix }: { value: number; suffix: string }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`finance-trend-label ${
        isPositive
          ? "finance-trend-label--positive"
          : "finance-trend-label--negative"
      }`}
    >
      <Icon size={14} />
      {Math.abs(value)}% {suffix}
    </span>
  );
}
