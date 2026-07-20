import { ReceiptText } from "lucide-react";
import type { FinancePeriod } from "../../api/types";
import { Card } from "../Card";
import { currencyFormatter, integerFormatter } from "./formatters";

type ActivityBreakdownProps = {
  data: FinancePeriod;
  onActivityClick: (activityId: string) => void;
};

export function ActivityBreakdown({
  data,
  onActivityClick,
}: ActivityBreakdownProps) {
  const maximum = Math.max(
    ...data.activities.map((activity) => activity.totalRevenue),
    0,
  );

  return (
    <Card
      className="finance-breakdown-card"
      title="Activity breakdown"
      action={<span className="finance-range-label">{data.label}</span>}
    >
      {data.activities.length === 0 ? (
        <div className="finance-empty-state">
          <ReceiptText size={24} />
          <strong>No revenue yet</strong>
          <span>Paid session joins in this period will appear here.</span>
        </div>
      ) : (
        <div className="finance-activity-list">
          {data.activities.map((activity) => {
            const width =
              maximum > 0 ? (activity.totalRevenue / maximum) * 100 : 0;
            const isPositive = activity.deltaVsAveragePercent >= 0;

            return (
              <button
                type="button"
                className="finance-activity"
                key={activity.id}
                onClick={() => onActivityClick(activity.id)}
                aria-label={`View finance details for ${activity.title}`}
              >
                <div className="finance-activity__heading">
                  <strong>{activity.title}</strong>
                  <strong>{currencyFormatter.format(activity.totalRevenue)}</strong>
                </div>
                <div className="finance-activity__bar-track" aria-hidden="true">
                  <span style={{ width: `${width}%` }} />
                </div>
                <div className="finance-activity__meta">
                  <span>
                    {integerFormatter.format(activity.sessionsNum)} sessions
                    <i aria-hidden="true" />
                    {integerFormatter.format(activity.registeredCount)} attendees
                    <i aria-hidden="true" />
                    {currencyFormatter.format(activity.revenuePerSession)} / session
                  </span>
                  <span
                    className={
                      isPositive
                        ? "finance-delta--positive"
                        : "finance-delta--negative"
                    }
                  >
                    {isPositive ? "↑" : "↓"}{" "}
                    {Math.abs(activity.deltaVsAveragePercent)}% vs avg
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <p className="finance-breakdown-note">
        Revenue uses the configured credits-to-dollars conversion. Per-session
        values are total revenue divided by session count.
      </p>
    </Card>
  );
}
