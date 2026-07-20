import type { FinancePeriod } from "../../api/types";
import { currencyFormatter, integerFormatter } from "./formatters";
import { TrendLabel } from "./TrendLabel";

export function FinanceSummary({ data }: { data: FinancePeriod }) {
  return (
    <section className="finance-summary" aria-label={`${data.label} finance summary`}>
      <article className="panel finance-summary-card finance-summary-card--featured">
        <span>{data.label} revenue</span>
        <strong>{currencyFormatter.format(data.revenue)}</strong>
        <TrendLabel value={data.revenueTrendPercent} suffix="vs previous period" />
      </article>

      <article className="panel finance-summary-card">
        <span>{data.label} bookings</span>
        <strong>{integerFormatter.format(data.bookings)}</strong>
        <TrendLabel value={data.bookingsTrendPercent} suffix="vs previous period" />
      </article>

      <article className="panel finance-summary-card">
        <span>Average per session</span>
        <strong>{currencyFormatter.format(data.averagePerSession)}</strong>
        <small>
          {integerFormatter.format(data.sessionsNum)}{" "}
          {data.sessionsNum === 1 ? "session" : "sessions"}
        </small>
      </article>
    </section>
  );
}
