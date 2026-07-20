import { useNavigate } from "react-router";
import { AlertCircle } from "lucide-react";
import { Card } from "../components/Card";
import { useVendorState } from "../state";

type DashboardStat = {
  value: number | string;
  label: string;
  path: string;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { vendor, stats, onboarded, activities } = useVendorState();
  const revenue = stats?.revenue ?? 0;
  const dashboardStats: DashboardStat[] = [
    {
      value: new Intl.NumberFormat("en-SG", {
        style: "currency",
        currency: "SGD",
        maximumFractionDigits: 0,
      }).format(revenue),
      label: "Revenue",
      path: "/finances",
    },
    { value: stats?.newUsers ?? 0, label: "New users", path: "/users" },
    {
      value: stats?.totalUsers ?? onboarded.length,
      label: "Total users",
      path: "/users",
    },
    {
      value: activities.length,
      label: "Total activities",
      path: "/activities",
    },
  ];

  return (
    <>
      <section className="verification-alert">
        <AlertCircle size={17} />
        <span>
          {vendor?.name ?? "Your vendor profile"} is ready. Submit business
          verification to unlock payouts and featured placements.
        </span>
        <button type="button">Verify now</button>
      </section>

      <div className="dashboard__main dashboard__main--full">
        <Card className="order-card">
          <div className="order-stats">
            {dashboardStats.map((stat) => (
              <button
                key={stat.label}
                type="button"
                className="order-stat"
                onClick={() => navigate(stat.path)}
              >
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
