import { useNavigate } from "react-router";
import {
  CalendarDays,
  CalendarPlus,
  Lock,
  Megaphone,
  Star,
  Unlock,
  Users,
} from "lucide-react";
import { Card } from "../components/Card";
import type { Activity, Session } from "../api/types";

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

function getActivityRouteId(activity: Activity) {
  return activity.mockId;
}

function getSessionRouteId(session: Session) {
  return session.mockId;
}

function getActivitySessionPath(session: Session) {
  const activityId =
    session.activity?.mockId ?? session.activityMockId ?? session.activityId;
  const sessionId = getSessionRouteId(session);

  return `/activities/${activityId}?selectedSession=${encodeURIComponent(
    String(sessionId),
  )}`;
}

function getSessionAttendancePath(session: Session) {
  return `/sessions/${getSessionRouteId(session)}/attendance`;
}

function getSessionAnnouncementsPath(session: Session) {
  const sessionId = session.id ?? session.objectId ?? session.mockId;

  return `/announcements/${encodeURIComponent(String(sessionId))}`;
}

export function ViewActivitiesPage({
  activities,
  sessions,
  error,
  updatingActivityId,
  onToggleActivityOpen,
}: {
  activities: Activity[];
  sessions: Session[];
  error: string | null;
  updatingActivityId: string | null;
  onToggleActivityOpen: (
    activityId: number | string,
    isOpen: boolean,
  ) => Promise<void>;
}) {
  const navigate = useNavigate();
  const upcomingSessions = sessions.filter((session) => session.isActive);
  const pastSessions = sessions.filter((session) => !session.isActive);

  return (
    <div className="dashboard__main dashboard__main--full">
      <Card
        title="View All Activities"
        action={
          <button
            type="button"
            className="secondary-action activities-calendar-link"
            onClick={() => navigate("/activities/calendar")}
          >
            <CalendarDays size={15} />
            View calendar
          </button>
        }
      >
        {activities.length === 0 ? (
          <div className="empty-state">
            <CalendarPlus size={28} />
            <strong>No activities yet</strong>
            <span>Create an activity to start adding sessions.</span>
          </div>
        ) : (
          <div className="activity-table-wrap">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <button
                        type="button"
                        className="activity-title-button"
                        onClick={() =>
                          navigate(
                            `/activities/${getActivityRouteId(activity)}`,
                          )
                        }
                      >
                        {activity.title}
                      </button>
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
                        {activity.isOpen ? (
                          <Unlock size={14} />
                        ) : (
                          <Lock size={14} />
                        )}
                        {activity.isOpen ? "Open" : "Closed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Upcoming Sessions">
        {upcomingSessions.length === 0 ? (
          <div className="empty-state">
            <CalendarPlus size={28} />
            <strong>No upcoming sessions</strong>
            <span>Create an active session before opening attendance.</span>
          </div>
        ) : (
          <>
            {error && (
              <p className="form-error activity-status-error">{error}</p>
            )}
            <div className="activity-table-wrap">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Attendance</th>
                    <th>Signups</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingSessions.map((session) => {
                    const isUpdating =
                      updatingActivityId === String(session.mockId);

                    return (
                      <tr key={session.mockId}>
                        <td>
                          <button
                            type="button"
                            className="activity-title-button"
                            onClick={() =>
                              navigate(getActivitySessionPath(session))
                            }
                          >
                            {session.title}
                          </button>
                        </td>
                        <td>{formatActivityDate(session.startsAt)}</td>
                        <td>{session.location}</td>
                        <td>
                          <span className="table-metric">
                            <Users size={15} />
                            {session.attendedCount} / {session.spots}
                          </span>
                        </td>
                        <td>
                          <div className="session-signup-control">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={session.isOpen}
                              aria-label={`${
                                session.isOpen ? "Close" : "Open"
                              } signups for ${session.title}`}
                              className={`session-signup-switch ${
                                session.isOpen
                                  ? "session-signup-switch--open"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              onClick={() =>
                                onToggleActivityOpen(
                                  session.mockId,
                                  !session.isOpen,
                                )
                              }
                            >
                              <span className="session-signup-switch__thumb" />
                            </button>
                            <span>{session.isOpen ? "Open" : "Closed"}</span>
                          </div>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="table-action"
                              onClick={() =>
                                navigate(getSessionAttendancePath(session))
                              }
                            >
                              Attendance
                            </button>
                            <button
                              type="button"
                              className="table-action"
                              onClick={() =>
                                navigate(getSessionAnnouncementsPath(session))
                              }
                            >
                              <Megaphone size={14} />
                              Announcements
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

      <Card title="Past Sessions">
        {pastSessions.length === 0 ? (
          <div className="empty-state">
            <CalendarPlus size={28} />
            <strong>No past sessions</strong>
            <span>Inactive sessions will appear here.</span>
          </div>
        ) : (
          <div className="activity-table-wrap">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Attendance</th>
                  <th>Rating</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pastSessions.map((session) => (
                  <tr key={session.mockId}>
                    <td>
                      <button
                        type="button"
                        className="activity-title-button"
                        onClick={() =>
                          navigate(getActivitySessionPath(session))
                        }
                      >
                        {session.title}
                      </button>
                    </td>
                    <td>{formatActivityDate(session.startsAt)}</td>
                    <td>{session.location}</td>
                    <td>
                      <span className="table-metric">
                        <Users size={15} />
                        {session.attendedCount} / {session.spots}
                      </span>
                    </td>
                    <td>
                      <span className="table-metric">
                        <Star size={15} />
                        {session.rating.toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() =>
                          navigate(
                            `/activities/${getSessionRouteId(session)}/reviews`,
                          )
                        }
                      >
                        Reviews
                      </button>
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
