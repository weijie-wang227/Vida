import type { FinancePeriod } from "../../api/types";
import { currencyFormatter, integerFormatter } from "./formatters";
import { TrendLabel } from "./TrendLabel";

export function FinanceSummary({
  data,
  commissionRate,
}: {
  data: FinancePeriod;
  commissionRate: number;
}) {
  const commissionPercent = Math.round(commissionRate * 100);

  return (
    <section className="finance-summary" aria-label={`${data.label} finance summary`}>
      <article className="panel finance-summary-card finance-summary-card--featured">
        <span>{data.label} net revenue</span>
        <strong>{currencyFormatter.format(data.netRevenue)}</strong>
        <TrendLabel
          value={data.netRevenueTrendPercent}
          suffix="vs previous period"
        />
      </article>

      <article className="panel finance-summary-card">
        <span>{data.label} gross revenue</span>
        <strong>{currencyFormatter.format(data.grossRevenue)}</strong>
        <small>
          Vida commission ({commissionPercent}%):{" "}
          {currencyFormatter.format(data.commission)}
        </small>
      </article>

      <article className="panel finance-summary-card">
        <span>Average net per session</span>
        <strong>{currencyFormatter.format(data.averageNetPerSession)}</strong>
        <small>
          {integerFormatter.format(data.bookings)}{" "}
          {data.bookings === 1 ? "booking" : "bookings"} across{" "}
          {integerFormatter.format(data.sessionsNum)}{" "}
          {data.sessionsNum === 1 ? "session" : "sessions"}
        </small>
      </article>
    </section>
  );
}
