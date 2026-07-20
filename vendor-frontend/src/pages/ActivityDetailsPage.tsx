import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, ClipboardList, Star } from "lucide-react";
import { Card } from "../components/Card";
import { SessionDateCalendar } from "../components/sessionCalendar";
import type {
  CreateSessionInput,
  CreateVendorSessionResponse,
  Activity,
  Session,
  Vendor,
} from "../api/types";

function getActivityByRouteId(
  activities: Activity[],
  activityId: string | undefined,
) {
  if (!activityId) {
    return null;
  }

  return (
    activities.find(
      (activity) => String(activity.mockId) === activityId || activity.id === activityId,
    ) ?? null
  );
}

function getSessionRouteId(session: Session) {
  return session.mockId ?? session.id ?? session.objectId;
}

function getSessionByRouteId(
  sessions: Session[],
  sessionId: string | null,
) {
  if (!sessionId) {
    return null;
  }

  return (
    sessions.find(
      (session) =>
        String(session.mockId) === sessionId ||
        session.id === sessionId ||
        session.objectId === sessionId,
    ) ?? null
  );
}

function combineDateWithSourceTime(dateValue: string, sourceStartsAt: string) {
  const sourceDate = new Date(sourceStartsAt);

  if (Number.isNaN(sourceDate.getTime())) {
    return new Date(`${dateValue}T09:00`).toISOString();
  }

  const hours = String(sourceDate.getHours()).padStart(2, "0");
  const minutes = String(sourceDate.getMinutes()).padStart(2, "0");
  const seconds = String(sourceDate.getSeconds()).padStart(2, "0");

  return new Date(`${dateValue}T${hours}:${minutes}:${seconds}`).toISOString();
}

export function ActivityDetailsPage({
  vendor,
  activities,
  sessions,
  error,
  isCreatingSession,
  onCreateSession,
}: {
  vendor: Vendor | null;
  activities: Activity[];
  sessions: Session[];
  error: string | null;
  isCreatingSession: boolean;
  onCreateSession: (
    input: CreateSessionInput,
  ) => Promise<CreateVendorSessionResponse>;
}) {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const [searchParams] = useSearchParams();
  const duplicateSessionId = searchParams.get("duplicateSession");
  const activity = getActivityByRouteId(activities, activityId);
  const activitySessions = sessions.filter(
    (session) =>
      String(session.activity?.mockId ?? session.activityMockId ?? "") === activityId ||
      session.activity?.id === activityId ||
      String(session.activityId) === activityId,
  );
  const duplicateSource = getSessionByRouteId(activitySessions, duplicateSessionId);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const activityRouteId = activity?.mockId ?? activityId ?? "";

  const stopDuplicating = () => {
    setDuplicateError(null);
    navigate(`/activities/${activityRouteId}`);
  };

  const createDuplicateSession = async (dateValue: string) => {
    if (!vendor || !activity || !duplicateSource) {
      setDuplicateError("Choose a session to duplicate first.");
      return;
    }

    setDuplicateError(null);

    const response = await onCreateSession({
      activityId: activity.mockId,
      title: duplicateSource.title,
      startsAt: combineDateWithSourceTime(dateValue, duplicateSource.startsAt),
      location: duplicateSource.location,
      latitude: Number(duplicateSource.lat ?? 0),
      longitude: Number(duplicateSource.lng ?? 0),
      durationMinutes: Number(
        duplicateSource.durationMinutes ?? duplicateSource.duration ?? 60,
      ),
      spots: Number(duplicateSource.spots),
      credits: Number(duplicateSource.credits ?? 0),
      vendorId: vendor.id,
      createAsVendor: true,
      isPremium: Number(duplicateSource.credits ?? 0) > 0,
      skillsFuturePayable: false,
    });
    const createdSessionId = response.session?.id;

    navigate(
      createdSessionId
        ? `/activities/${activity.mockId}/sessions/${createdSessionId}`
        : `/activities/${activity.mockId}`,
    );
  };

  if (!activity) {
    return (
      <div className="dashboard__main dashboard__main--full">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/activities")}
        >
          <ArrowLeft size={16} />
          Back to activities
        </button>

        <Card title="Activity Details">
          <div className="empty-state">
            <ClipboardList size={28} />
            <strong>Activity not found</strong>
            <span>Choose an activity from View All Activities.</span>
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
        onClick={() => navigate("/activities")}
      >
        <ArrowLeft size={16} />
        Back to activities
      </button>

      <Card
        title="Activity Details"
      >
        <div className="activity-details">
          <div className="activity-details__header">
            <div>
              <span>Activity</span>
              <h2>{activity.title}</h2>
            </div>
          </div>

          {activity.description && (
            <p className="activity-details__description">
              {activity.description}
            </p>
          )}

          <div className="activity-details__grid activity-details__grid--single">
            <div className="activity-detail-tile">
              <span>
                <Star size={16} />
                Rating
              </span>
              <strong>{activity.rating.toFixed(1)}</strong>
            </div>
          </div>
        </div>
      </Card>

      <SessionDateCalendar
        activityId={activity.mockId}
        sessions={activitySessions}
        duplicateSource={duplicateSource}
        duplicateError={duplicateError || error}
        isDuplicating={Boolean(duplicateSessionId)}
        isCreatingSession={isCreatingSession}
        onStopDuplicating={stopDuplicating}
        onSelectDate={(dateValue) => {
          if (duplicateSessionId && !duplicateSource) {
            setDuplicateError("Choose a valid session to duplicate first.");
            return;
          }

          if (duplicateSource) {
            createDuplicateSession(dateValue).catch((submissionError) => {
              setDuplicateError(
                submissionError instanceof Error
                  ? submissionError.message
                  : "Unable to duplicate session.",
              );
            });
            return;
          }

          navigate(
            `/create-session?date=${encodeURIComponent(
              dateValue,
            )}&activityId=${encodeURIComponent(String(activity.mockId))}`,
          );
        }}
        onSelectSession={(session) =>
          navigate(
            `/activities/${activity.mockId}/sessions/${getSessionRouteId(
              session,
            )}`,
          )
        }
      />
    </div>
  );
}
