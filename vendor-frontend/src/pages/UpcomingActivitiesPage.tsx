import { useNavigate } from "react-router";
import { CalendarPlus, Lock, Star, Unlock, Users } from "lucide-react";
import { Card } from "../components/Card";
import type { VendorActivity } from "../api/types";

function formatActivityDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function UpcomingActivitiesPage({
  activities,
  error,
  updatingActivityId,
  onToggleActivityOpen,
}: {
  activities: VendorActivity[];
  error: string | null;
  updatingActivityId: string | null;
  onToggleActivityOpen: (
    activityId: number | string,
    isOpen: boolean,
  ) => Promise<void>;
}) {
  const navigate = useNavigate();
  const upcomingActivities = activities.filter((activity) => activity.isActive);
  const pastActivities = activities.filter((activity) => !activity.isActive);

  return (
    <div className="dashboard__main dashboard__main--full">
      <Card title="Upcoming Activities">
        {upcomingActivities.length === 0 ? (
          <div className="empty-state">
            <CalendarPlus size={28} />
            <strong>No upcoming activities</strong>
            <span>Create an active activity before opening attendance.</span>
          </div>
        ) : (
          <>
            {error && <p className="form-error activity-status-error">{error}</p>}
            <div className="activity-table-wrap">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Attendance</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingActivities.map((activity) => {
                    const isUpdating = updatingActivityId === String(activity.id);

                    return (
                      <tr key={activity.id}>
                        <td>
                          <strong>{activity.title}</strong>
                        </td>
                        <td>{formatActivityDate(activity.startsAt)}</td>
                        <td>{activity.location}</td>
                        <td>
                          <span className="table-metric">
                            <Users size={15} />
                            {activity.attendance} / {activity.spots}
                          </span>
                        </td>
                        <td>
                          <span className="table-metric">
                            <Star size={15} />
                            {activity.rating.toFixed(1)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`activity-status ${
                              activity.isOpen ? "" : "activity-status--closed"
                            }`}
                          >
                            {activity.isOpen ? <Unlock size={14} /> : <Lock size={14} />}
                            {activity.isOpen ? "Open" : "Closed"}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="table-action"
                              onClick={() =>
                                navigate(`/upcoming/${activity.mockId}/attendance`)
                              }
                            >
                              Attendance
                            </button>
                            <button
                              type="button"
                              className={`table-action ${
                                activity.isOpen ? "table-action--danger" : ""
                              }`}
                              disabled={isUpdating}
                              onClick={() =>
                                onToggleActivityOpen(
                                  activity.id,
                                  !activity.isOpen,
                                )
                              }
                            >
                              {activity.isOpen ? "Close" : "Open"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card title="Past Activities">
        {pastActivities.length === 0 ? (
          <div className="empty-state">
            <CalendarPlus size={28} />
            <strong>No past activities</strong>
            <span>Inactive activities will appear here.</span>
          </div>
        ) : (
          <div className="activity-table-wrap">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Attendance</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {pastActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <strong>{activity.title}</strong>
                    </td>
                    <td>{formatActivityDate(activity.startsAt)}</td>
                    <td>{activity.location}</td>
                    <td>
                      <span className="table-metric">
                        <Users size={15} />
                        {activity.attendance} / {activity.spots}
                      </span>
                    </td>
                    <td>
                      <span className="table-metric">
                        <Star size={15} />
                        {activity.rating.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
