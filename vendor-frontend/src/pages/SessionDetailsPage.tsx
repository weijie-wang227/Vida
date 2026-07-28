import { useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, ClipboardList } from "lucide-react";
import type {
  Activity,
  Session,
  UpdateSessionInput,
  UpdateVendorSessionResponse,
} from "../api/types";
import { Card } from "../components/Card";
import { SessionDetailsPanel } from "../components/sessions";

function getActivity(
  activities: Activity[],
  activityId: string | undefined,
) {
  if (!activityId) {
    return null;
  }

  return (
    activities.find(
      (activity) =>
        String(activity.mockId) === activityId || activity.id === activityId,
    ) ?? null
  );
}

function getSession(
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
        (String(session.activity?.mockId ?? session.activityMockId ?? "") ===
          activityId ||
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
  deletingSessionId,
  onToggleActivityOpen,
  onUpdateSession,
  onDeleteSession,
}: {
  activities: Activity[];
  sessions: Session[];
  updatingActivityId: string | null;
  deletingSessionId: string | null;
  onToggleActivityOpen: (
    activityId: number | string,
    isOpen: boolean,
  ) => Promise<void>;
  onUpdateSession: (
    sessionId: number | string,
    input: UpdateSessionInput,
  ) => Promise<UpdateVendorSessionResponse>;
  onDeleteSession: (sessionId: number | string) => Promise<void>;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activityId, sessionId } = useParams();
  const activity = getActivity(activities, activityId);
  const session = getSession(sessions, activityId, sessionId);
  const activityRouteId =
    activity?.mockId ?? session?.activity?.mockId ?? activityId ?? "";
  const activityDetailsPath = `/activities/${activityRouteId}`;
  const requestedReturnPath = (
    location.state as { sessionDetailsReturnTo?: unknown } | null
  )?.sessionDetailsReturnTo;
  const returnPath =
    requestedReturnPath === "/activities" ||
    requestedReturnPath === activityDetailsPath
      ? requestedReturnPath
      : activityDetailsPath;
  const returnLabel =
    returnPath === "/activities" ? "Back to activities" : "Back to activity";

  if (!session) {
    return (
      <div className="dashboard__main dashboard__main--full">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate(returnPath)}
        >
          <ArrowLeft size={16} />
          {returnLabel}
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

  const sessionRouteId = session.mockId ?? session.id ?? session.objectId;
  const announcementSessionId =
    session.id ?? session.objectId ?? session.mockId;

  return (
    <div className="dashboard__main dashboard__main--full">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate(returnPath)}
      >
        <ArrowLeft size={16} />
        {returnLabel}
      </button>

      <SessionDetailsPanel
        activity={activity}
        session={session}
        isUpdating={updatingActivityId === String(sessionRouteId)}
        isDeleting={deletingSessionId === String(sessionRouteId)}
        onToggleSessionOpen={onToggleActivityOpen}
        onUpdateSession={onUpdateSession}
        onDeleteSession={onDeleteSession}
        onDeleted={() => navigate(activityDetailsPath, { replace: true })}
        onDuplicate={() =>
          navigate(
            `${activityDetailsPath}?duplicateSession=${encodeURIComponent(
              String(sessionRouteId),
            )}`,
          )
        }
        onAttendance={() =>
          navigate(`/sessions/${String(sessionRouteId)}/attendance`)
        }
        onAnnouncements={() =>
          navigate(
            `/announcements/${encodeURIComponent(
              String(announcementSessionId),
            )}`,
          )
        }
      />
    </div>
  );
}
