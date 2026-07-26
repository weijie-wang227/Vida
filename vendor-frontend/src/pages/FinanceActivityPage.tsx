import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ReceiptText } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { fetchVendorFinanceActivity } from "../api/vendors";
import type { VendorFinanceActivityResponse } from "../api/types";
import { Card } from "../components/Card";

const currencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-SG", {
  maximumFractionDigits: 1,
});

const sessionDateFormatter = new Intl.DateTimeFormat("en-SG", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Singapore",
});

const sessionTimeFormatter = new Intl.DateTimeFormat("en-SG", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Singapore",
});

export function FinanceActivityPage() {
  const navigate = useNavigate();
  const { activityId = "" } = useParams();
  const [data, setData] = useState<VendorFinanceActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadActivityFinance() {
      try {
        const response = await fetchVendorFinanceActivity(activityId);

        if (active) {
          setData(response);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load activity finances.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadActivityFinance();

    return () => {
      active = false;
    };
  }, [activityId]);

  if (isLoading) {
    return (
      <div className="dashboard__main dashboard__main--full finance-activity-page">
        <div className="finance-loading" aria-label="Loading activity finances">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard__main dashboard__main--full finance-activity-page">
        <button
          type="button"
          className="finance-back-button"
          onClick={() => navigate("/finances")}
        >
          <ArrowLeft size={16} />
          Back to finances
        </button>
        <Card className="finance-error-card">
          <strong>Activity finances could not be loaded.</strong>
          <span>{error ?? "Please try again shortly."}</span>
        </Card>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Sessions this month",
      value: numberFormatter.format(data.summary.sessionsThisMonth),
    },
    {
      label: "Revenue this month",
      value: currencyFormatter.format(data.summary.revenueThisMonth),
    },
    {
      label: "Average attendees",
      value: numberFormatter.format(data.summary.averageAttendees),
    },
    {
      label: "Average per session",
      value: currencyFormatter.format(data.summary.averagePerSession),
    },
  ];

  return (
    <div className="dashboard__main dashboard__main--full finance-activity-page">
      <button
        type="button"
        className="finance-back-button"
        onClick={() => navigate("/finances")}
      >
        <ArrowLeft size={16} />
        Back to finances
      </button>

      <div className="finance-activity-page__heading">
        <div>
          <span>Activity revenue</span>
          <h2>{data.activity.title}</h2>
        </div>
        <span>
          <CalendarDays size={15} />
          {numberFormatter.format(data.activity.sessionsYtd)} sessions YTD
        </span>
      </div>

      <section
        className="finance-activity-metrics"
        aria-label="Monthly activity metrics"
      >
        {summaryCards.map((card) => (
          <article className="panel finance-activity-metric" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <Card className="finance-recent-card" title="All sessions">
        {data.recentSessions.length === 0 ? (
          <div className="finance-empty-state">
            <ReceiptText size={24} />
            <strong>No sessions yet</strong>
            <span>Sessions for this activity will appear here.</span>
          </div>
        ) : (
          <div className="finance-recent-list">
            {data.recentSessions.map((session) => {
              const startsAt = new Date(session.startsAt);

              return (
                <article className="finance-recent-session" key={session.id}>
                  <div>
                    <strong>
                      {sessionDateFormatter.format(startsAt)} ·{" "}
                      {sessionTimeFormatter.format(startsAt)}
                    </strong>
                    <span>
                      {sessionDateFormatter.format(startsAt)} ·{" "}
                      {sessionTimeFormatter.format(startsAt)} ·{" "}
                      {numberFormatter.format(session.registeredCount)} attendees
                    </span>
                  </div>
                  <strong>{currencyFormatter.format(session.revenue)}</strong>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
