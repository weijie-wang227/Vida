import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { fetchVendorFinances } from "../api/vendors";
import type { FinancePeriodKey, VendorFinanceResponse } from "../api/types";
import { Card } from "../components/Card";
import {
  ActivityBreakdown,
  FinanceSummary,
  PeriodToggle,
  RevenueChart,
} from "../components/finance";

export function FinancesPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<FinancePeriodKey>("ytd");
  const [finance, setFinance] = useState<VendorFinanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadFinances() {
      try {
        const response = await fetchVendorFinances();

        if (active) {
          setFinance(response);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load finances.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadFinances();

    return () => {
      active = false;
    };
  }, []);

  const selectedPeriod = useMemo(
    () => finance?.periods[period] ?? null,
    [finance, period],
  );

  if (isLoading) {
    return (
      <div className="dashboard__main dashboard__main--full finances-page">
        <div className="finance-loading" aria-label="Loading finance data">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (error || !finance || !selectedPeriod) {
    return (
      <div className="dashboard__main dashboard__main--full finances-page">
        <Card className="finance-error-card">
          <strong>Finance data could not be loaded.</strong>
          <span>{error ?? "Please try again shortly."}</span>
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard__main dashboard__main--full finances-page">
      <div className="finance-toolbar">
        <div>
          <strong>Revenue overview</strong>
          <span>
            All amounts are in SGD. Net revenue is shown after Vida's{" "}
            {Math.round(finance.commissionRate * 100)}% commission.
          </span>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      <FinanceSummary
        data={selectedPeriod}
        commissionRate={finance.commissionRate}
      />
      <RevenueChart data={selectedPeriod} />
      <ActivityBreakdown
        data={selectedPeriod}
        onActivityClick={(activityId) =>
          navigate(`/finances/activities/${encodeURIComponent(activityId)}`)
        }
      />
    </div>
  );
}
