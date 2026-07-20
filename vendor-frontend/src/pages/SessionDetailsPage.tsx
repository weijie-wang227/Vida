import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Copy,
  Lock,
  MapPin,
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

function getActivityRows(
  activities: Activity[],
  activityId: string | undefined,
) {
  if (!activityId) {
    return [];
  }

  return activities.filter(
    (activity) =>
      String(activity.mockId) === activityId ||
      activity.id === activityId,
  );
}

function getSessionByRouteId(
  sessions: Session[],
  activityId: string | undefined,
  sessionId: string | undefined,
) {
  if (!sessionId) {
    return null;
  }

  return (
    sessions.find(
      (session) =>
        (String(session.activity?.mockId ?? session.activityMockId ?? "") === activityId ||
          session.activity?.id === activityId ||
          String(session.activityId) === activityId) &&
        (String(session.mockId) === sessionId ||
          session.id === sessionId ||
          session.objectId === sessionId),
    ) ?? null
  );
}

export function SessionDetailsPage({
  activities,
  sessions,
  updatingActivityId,
  onToggleActivityOpen,
}: {
  activities: Activity[];
  sessions: Session[];
  updatingActivityId: string | null;
  onToggleActivityOpen: (
    activityId: number | string,
    isOpen: boolean,
  ) => Promise<void>;
}) {
  const navigate = useNavigate();
  const { activityId, sessionId } = useParams();
  const activity = getActivityRows(activities, activityId)[0] ?? null;
  const session = getSessionByRouteId(sessions, activityId, sessionId);
  const isUpdating = session ? updatingActivityId === String(session.mockId) : false;
  const activityRouteId = activity?.mockId ?? session?.activity?.mockId ?? activityId ?? "";
  const sessionRouteId = session?.mockId ?? session?.id ?? session?.objectId;

  if (!session) {
    return (
      <div className="dashboard__main dashboard__main--full">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate(`/activities/${activityId ?? ""}`)}
        >
          <ArrowLeft size={16} />
          Back to activity
        </button>

        <Card title="Session Details">
          <div className="empty-state">
            <ClipboardList size={28} />
            <strong>Session not found</strong>
            <span>Choose a session from the activity details calendar.</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard__main dashboard__main--full">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate(`/activities/${activityRouteId}`)}
      >
        <ArrowLeft size={16} />
        Back to activity
      </button>

      <Card
        title="Session Details"
        action={
          <span
            className={`activity-status ${
              session.isOpen ? "" : "activity-status--closed"
            }`}
          >
            {session.isOpen ? <Unlock size={14} /> : <Lock size={14} />}
            {session.isOpen ? "Open" : "Closed"}
          </span>
        }
      >
        <div className="activity-details">
          <div className="activity-details__header">
            <div>
              <span>{activity?.title ?? session.activity?.title ?? "Activity"}</span>
              <h2>{session.title}</h2>
            </div>
          </div>

          <div className="activity-details__grid activity-details__grid--three">
            <div className="activity-detail-tile">
              <span>
                <CalendarDays size={16} />
                Date
              </span>
              <strong>{formatActivityDate(session.startsAt)}</strong>
            </div>
            <div className="activity-detail-tile">
              <span>
                <MapPin size={16} />
                Location
              </span>
              <strong>{session.location}</strong>
            </div>
            <div className="activity-detail-tile">
              <span>
                <Users size={16} />
                Attendance
              </span>
              <strong>
                {session.attendedCount} / {session.spots}
              </strong>
            </div>
          </div>

          <div className="activity-details__actions">
            <button
              type="button"
              className="table-action"
              onClick={() =>
                navigate(
                  `/activities/${activityRouteId}?duplicateSession=${encodeURIComponent(
                    String(sessionRouteId),
                  )}`,
                )
              }
            >
              <Copy size={14} />
              Duplicate Session
            </button>
            <button
              type="button"
              className="table-action"
              onClick={() =>
                navigate(`/sessions/${String(sessionRouteId)}/attendance`)
              }
            >
              Attendance
            </button>
            <button
              type="button"
              className={`table-action ${
                session.isOpen ? "table-action--danger" : ""
              }`}
              disabled={isUpdating}
              onClick={() => onToggleActivityOpen(session.mockId, !session.isOpen)}
            >
              {session.isOpen ? "Close Session" : "Open Session"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
