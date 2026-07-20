import type { FinancePeriod } from "../../api/types";
import { Card } from "../Card";
import { currencyFormatter } from "./formatters";

export function RevenueChart({ data }: { data: FinancePeriod }) {
  const maximum = Math.max(...data.trend.map((point) => point.revenue), 0);

  return (
    <Card
      className="finance-chart-card"
      title="Revenue trend"
      action={
        <span className="finance-range-label">
          {data.period === "ytd"
            ? "5-year YTD comparison"
            : "12-month MTD comparison"}
        </span>
      }
    >
      <div
        className="finance-chart"
        role="img"
        aria-label={`${data.label} revenue bar chart`}
      >
        {data.trend.map((point) => {
          const height =
            maximum > 0 ? Math.max((point.revenue / maximum) * 100, 3) : 2;

          return (
            <div className="finance-bar-column" key={point.label}>
              <div className="finance-bar-value">
                {point.revenue > 0
                  ? currencyFormatter.format(point.revenue)
                  : ""}
              </div>
              <div className="finance-bar-track">
                <div
                  className="finance-bar"
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${currencyFormatter.format(point.revenue)}`}
                />
              </div>
              <span>{point.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
