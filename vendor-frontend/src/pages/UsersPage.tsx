import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { fetchVendorUsersPageStats } from "../api/vendors";
import type { VendorUsersPageStats } from "../api/types";
import { Card } from "../components/Card";
import { formatSessionDateTime } from "../utils/sessionDateTime";

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatTrend(value: number, suffix = "vs last month") {
  if (value === 0) {
    return `No change ${suffix}`;
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value}% ${suffix}`;
}

function formatPointTrend(value: number, suffix = "vs last month") {
  if (value === 0) {
    return `No change ${suffix}`;
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value} pts ${suffix}`;
}

function getTrendClass(value: number, inverted = false) {
  if (value === 0) {
    return "";
  }

  const isPositive = inverted ? value < 0 : value > 0;

  return `users-trend users-trend--${isPositive ? "positive" : "negative"}`;
}

function getUserMetrics(stats: VendorUsersPageStats) {
  return [
    {
      label: "Total bookings",
      value: String(stats.totalBookings),
      detail: formatTrend(stats.totalBookingsTrendPercent),
      trendClassName: getTrendClass(stats.totalBookingsTrendPercent),
    },
    {
      label: "Average fill rate",
      value: formatPercent(stats.averageFillRate),
      detail: `across ${stats.sessionCount} sessions`,
      trendClassName: "",
    },
    {
      label: "No-show rate",
      value: formatPercent(stats.noShowRate),
      detail: formatPointTrend(stats.noShowRateTrendPercent),
      trendClassName: getTrendClass(stats.noShowRateTrendPercent, true),
    },
    {
      label: "Repeat attendee rate",
      value: formatPercent(stats.repeatAttendeeRate),
      detail: "of bookings are returning seniors",
      trendClassName: "",
    },
  ];
}

export function UsersPage() {
  const [stats, setStats] = useState<VendorUsersPageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    fetchVendorUsersPageStats()
      .then((response) => {
        if (active) {
          setStats(response);
        }
      })
      .catch((loadError) => {
        if (active) {
          setStats(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load user metrics.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="dashboard__main dashboard__main--full users-page">
        <Card>
          <div className="empty-state empty-state--compact">
            <Loader2 size={20} className="spin" />
            <span>Loading user metrics</span>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="dashboard__main dashboard__main--full users-page">
        <Card>
          <p className="form-error">
            {error ?? "Unable to load user metrics."}
          </p>
        </Card>
      </div>
    );
  }

  const userMetrics = getUserMetrics(stats);

  return (
    <div className="dashboard__main dashboard__main--full users-page">
      <section className="users-metric-grid" aria-label="User booking metrics">
        {userMetrics.map((metric) => (
          <Card key={metric.label} className="users-metric-card">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em className={metric.trendClassName}>{metric.detail}</em>
          </Card>
        ))}
      </section>

      <Card title="Fill rate by session" className="users-fill-card">
        {stats.sessionFillRates.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <Users size={24} />
            <span>No sessions yet.</span>
          </div>
        ) : (
          <div className="users-fill-list">
            {stats.sessionFillRates.map((session) => {
              const fillRate = clampPercent(session.fillRate);

              return (
                <div className="users-fill-row" key={session.sessionId}>
                  <div className="users-fill-row__header">
                    <div className="users-fill-row__session">
                      <strong>{formatSessionDateTime(session.startsAt)}</strong>
                      <span>{session.label}</span>
                    </div>
                    <div className="users-fill-row__numbers">
                      <span>
                        {session.booked}/{session.capacity}
                      </span>
                    </div>
                  </div>
                  <div
                    className="users-fill-bar"
                    aria-label={`${formatSessionDateTime(
                      session.startsAt,
                    )} is ${fillRate}% filled`}
                    role="img"
                  >
                    <span
                      className={`users-fill-bar__value users-fill-bar__value--${session.status}`}
                      style={{ width: `${fillRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
