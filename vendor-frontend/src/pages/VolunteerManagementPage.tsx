import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  HandHeart,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import {
  fetchVolunteerOverview,
  fetchVolunteerRoster,
  updateVolunteerApplication,
} from "../api/vendors";
import type {
  VolunteerOverviewResponse,
  VolunteerOpportunityStatus,
  VolunteerRosterResponse,
} from "../api/types";
import { Card } from "../components/Card";
import { useVendorState } from "../state";

function formatSessionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date to be confirmed";
  }

  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const statusLabels: Record<VolunteerOpportunityStatus, string> = {
  open: "Open",
  full: "Full",
  closed: "Closed",
  completed: "Completed",
};

export function VolunteerManagementPage() {
  const navigate = useNavigate();
  const { vendor } = useVendorState();
  const [overview, setOverview] = useState<VolunteerOverviewResponse | null>(
    null,
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [roster, setRoster] = useState<VolunteerRosterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [updatingVolunteerId, setUpdatingVolunteerId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    fetchVolunteerOverview()
      .then((response) => {
        if (active) {
          setOverview(response);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load volunteer opportunities.",
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

  useEffect(() => {
    if (!selectedSessionId) {
      setRoster(null);
      setRosterError(null);
      setIsLoadingRoster(false);
      return;
    }

    let active = true;
    setRoster(null);
    setRosterError(null);
    setIsLoadingRoster(true);

    fetchVolunteerRoster(selectedSessionId)
      .then((response) => {
        if (active) {
          setRoster(response);
        }
      })
      .catch((loadError) => {
        if (active) {
          setRosterError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the volunteer roster.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingRoster(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedSessionId]);

  const reviewVolunteer = async (
    volunteerId: string,
    nextStatus: "approved" | "rejected",
  ) => {
    if (!selectedSessionId || !roster) {
      return;
    }

    const currentVolunteer = roster.volunteers.find(
      (volunteer) => volunteer.id === volunteerId,
    );

    if (!currentVolunteer || currentVolunteer.status === nextStatus) {
      return;
    }

    setUpdatingVolunteerId(volunteerId);
    setRosterError(null);

    try {
      const response = await updateVolunteerApplication(
        selectedSessionId,
        volunteerId,
        nextStatus,
      );
      const countedStatuses = new Set([
        "registered",
        "approved",
        "completed",
        "no_show",
      ]);
      const wasCounted = countedStatuses.has(currentVolunteer.status);
      const isCounted = countedStatuses.has(response.volunteer.status);
      const bookingDelta = Number(isCounted) - Number(wasCounted);

      setRoster((current) =>
        current
          ? {
              ...current,
              volunteers: current.volunteers.map((volunteer) =>
                volunteer.id === volunteerId
                  ? { ...volunteer, status: response.volunteer.status }
                  : volunteer,
              ),
            }
          : current,
      );
      setOverview((current) =>
        current
          ? {
              ...current,
              summary: {
                ...current.summary,
                pendingReview: Math.max(
                  0,
                  current.summary.pendingReview -
                    Number(currentVolunteer.status === "registered"),
                ),
              },
              opportunities: current.opportunities.map((opportunity) => {
                if (opportunity.id !== selectedSessionId || bookingDelta === 0) {
                  return opportunity;
                }

                const booked = Math.max(0, opportunity.booked + bookingDelta);
                const status =
                  opportunity.status === "open" || opportunity.status === "full"
                    ? booked >= opportunity.capacity
                      ? "full"
                      : "open"
                    : opportunity.status;

                return { ...opportunity, booked, status };
              }),
            }
          : current,
      );
    } catch (reviewError) {
      setRosterError(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to update this volunteer application.",
      );
    } finally {
      setUpdatingVolunteerId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard__main dashboard__main--full volunteer-page">
        <Card>
          <div className="empty-state empty-state--compact">
            <Loader2 size={20} className="spin" />
            <span>Loading volunteer management</span>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="dashboard__main dashboard__main--full volunteer-page">
        <Card>
          <p className="form-error">
            {error ?? "Unable to load volunteer management."}
          </p>
        </Card>
      </div>
    );
  }

  const metrics = [
    {
      label: "Open opportunities",
      value: String(overview.summary.openOpportunities),
      icon: HandHeart,
    },
    {
      label: "Fill rate",
      value: `${overview.summary.fillRate}%`,
      icon: Users,
    },
    {
      label: "Pending review",
      value: String(overview.summary.pendingReview),
      icon: CheckCircle2,
    },
    {
      label: "Hours this month",
      value: formatHours(overview.summary.hoursThisMonth),
      icon: Clock3,
    },
  ];
  const selectedOpportunity = overview.opportunities.find(
    (opportunity) => opportunity.id === selectedSessionId,
  );

  return (
    <div className="dashboard__main dashboard__main--full volunteer-page">
      <p className="volunteer-page__subtitle">
        {vendor?.name ?? "Your organisation"} volunteer programme
      </p>

      <section className="volunteer-metrics" aria-label="Volunteer summary">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card className="volunteer-metric" key={label}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{value}</strong>
          </Card>
        ))}
      </section>

      <Card
        title="Opportunities"
        className="volunteer-opportunities"
        action={
          <button
            type="button"
            className="secondary-action"
            onClick={() => navigate("/create-activity?volunteer=true")}
          >
            <Plus size={15} />
            Post opportunity
          </button>
        }
      >
        {overview.opportunities.length === 0 ? (
          <div className="empty-state">
            <HandHeart size={28} />
            <strong>No volunteer opportunities yet</strong>
            <span>
              Create a volunteer activity, then add its first session.
            </span>
          </div>
        ) : (
          <div className="volunteer-table-wrap">
            <table className="volunteer-table">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Date</th>
                  <th>Slots</th>
                  <th>Status</th>
                  <th aria-label="Expand roster" />
                </tr>
              </thead>
              <tbody>
                {overview.opportunities.map((opportunity) => {
                  const isSelected = opportunity.id === selectedSessionId;

                  return (
                    <tr
                      key={opportunity.id}
                      className={isSelected ? "volunteer-row--selected" : ""}
                    >
                      <td>
                        <button
                          type="button"
                          className="volunteer-opportunity-button"
                          aria-expanded={isSelected}
                          onClick={() =>
                            setSelectedSessionId(
                              isSelected ? null : opportunity.id,
                            )
                          }
                        >
                          <strong>
                            {formatSessionDate(opportunity.startsAt)}
                          </strong>
                          <span>{opportunity.location}</span>
                        </button>
                      </td>
                      <td>{formatSessionDate(opportunity.startsAt)}</td>
                      <td>
                        {opportunity.booked}/{opportunity.capacity}
                      </td>
                      <td>
                        <span
                          className={`volunteer-status volunteer-status--${opportunity.status}`}
                        >
                          {statusLabels[opportunity.status]}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="volunteer-expand-button"
                          aria-label={`${isSelected ? "Collapse" : "Expand"} roster for ${opportunity.title}`}
                          aria-expanded={isSelected}
                          onClick={() =>
                            setSelectedSessionId(
                              isSelected ? null : opportunity.id,
                            )
                          }
                        >
                          <ChevronDown size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedSessionId && (
        <Card
          className="volunteer-roster"
          title={`Volunteer roster — ${
            selectedOpportunity
              ? formatSessionDate(selectedOpportunity.startsAt)
              : "Opportunity"
          }`}
        >
          {isLoadingRoster ? (
            <div className="empty-state empty-state--compact">
              <Loader2 size={20} className="spin" />
              <span>Loading roster</span>
            </div>
          ) : rosterError ? (
            <p className="form-error volunteer-roster__error">{rosterError}</p>
          ) : !roster || roster.volunteers.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <Users size={24} />
              <span>No volunteers have applied for this session.</span>
            </div>
          ) : (
            <div className="volunteer-table-wrap">
              <table className="volunteer-table volunteer-roster-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.volunteers.map((volunteer) => (
                    <tr key={volunteer.id}>
                      <td>
                        <div className="volunteer-person">
                          {volunteer.avatar ? (
                            <img src={volunteer.avatar} alt="" />
                          ) : (
                            <span>
                              {volunteer.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <strong>{volunteer.name}</strong>
                            {volunteer.handle && (
                              <small>{volunteer.handle}</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`volunteer-application-status volunteer-application-status--${volunteer.status}`}
                        >
                          {volunteer.status === "registered"
                            ? "Pending review"
                            : volunteer.status === "no_show"
                              ? "No show"
                              : volunteer.status.charAt(0).toUpperCase() +
                                volunteer.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {volunteer.status === "completed" ||
                        volunteer.status === "no_show" ? (
                          <span className="volunteer-review-complete">
                            Attendance recorded
                          </span>
                        ) : (
                          <div className="volunteer-review-actions">
                            <button
                              type="button"
                              className="volunteer-review-button volunteer-review-button--approve"
                              disabled={
                                updatingVolunteerId === volunteer.id ||
                                volunteer.status === "approved"
                              }
                              onClick={() => reviewVolunteer(volunteer.id, "approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="volunteer-review-button volunteer-review-button--reject"
                              disabled={
                                updatingVolunteerId === volunteer.id ||
                                volunteer.status === "rejected"
                              }
                              onClick={() => reviewVolunteer(volunteer.id, "rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
