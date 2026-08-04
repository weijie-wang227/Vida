import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, ClipboardList, Star } from "lucide-react";
import type {
  Activity,
  CreateSessionInput,
  CreateVendorSessionResponse,
  Session,
  UpdateSessionInput,
  UpdateVendorSessionResponse,
  Vendor,
} from "../api/types";
import { Card } from "../components/Card";
import { SessionDateCalendar } from "../components/sessionCalendar";
import {
  SessionCreatePanel,
  SessionDetailsPanel,
} from "../components/sessions";

type InlineSessionPanel =
  | { mode: "create"; date: string }
  | { mode: "details"; sessionId: string }
  | null;

function getActivityByRouteId(
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

function getDuplicatedSessionRange(
  dateValue: string,
  sourceStartsAt: string,
  sourceEndAt: string,
) {
  const startsAt = combineDateWithSourceTime(dateValue, sourceStartsAt);
  const sourceStartTime = new Date(sourceStartsAt).getTime();
  const sourceEndTime = new Date(sourceEndAt).getTime();
  const elapsedTime = sourceEndTime - sourceStartTime;

  if (!Number.isFinite(elapsedTime) || elapsedTime < 15 * 60 * 1000) {
    return null;
  }

  return {
    startsAt,
    endAt: new Date(new Date(startsAt).getTime() + elapsedTime).toISOString(),
  };
}

export function ActivityDetailsPage({
  vendor,
  activities,
  sessions,
  error,
  isCreatingSession,
  updatingSessionId,
  deletingSessionId,
  onCreateSession,
  onToggleSessionOpen,
  onUpdateSession,
  onDeleteSession,
}: {
  vendor: Vendor | null;
  activities: Activity[];
  sessions: Session[];
  error: string | null;
  isCreatingSession: boolean;
  updatingSessionId: string | null;
  deletingSessionId: string | null;
  onCreateSession: (
    input: CreateSessionInput,
  ) => Promise<CreateVendorSessionResponse>;
  onToggleSessionOpen: (
    sessionId: number | string,
    isOpen: boolean,
  ) => Promise<void>;
  onUpdateSession: (
    sessionId: number | string,
    input: UpdateSessionInput,
  ) => Promise<UpdateVendorSessionResponse>;
  onDeleteSession: (sessionId: number | string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const [searchParams] = useSearchParams();
  const duplicateSessionId = searchParams.get("duplicateSession");
  const selectedSessionId = searchParams.get("selectedSession");
  const activity = getActivityByRouteId(activities, activityId);
  const activitySessions = sessions.filter(
    (session) =>
      String(session.activity?.mockId ?? session.activityMockId ?? "") ===
        activityId ||
      session.activity?.id === activityId ||
      String(session.activityId) === activityId,
  );
  const duplicateSource = getSessionByRouteId(
    activitySessions,
    duplicateSessionId,
  );
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [inlinePanel, setInlinePanel] = useState<InlineSessionPanel>(null);
  const inlinePanelRef = useRef<HTMLDivElement>(null);
  const activityRouteId = activity?.mockId ?? activityId ?? "";
  const selectedSession =
    inlinePanel?.mode === "details"
      ? getSessionByRouteId(activitySessions, inlinePanel.sessionId)
      : null;

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    setInlinePanel((currentPanel) =>
      currentPanel?.mode === "details" &&
      currentPanel.sessionId === selectedSessionId
        ? currentPanel
        : { mode: "details", sessionId: selectedSessionId },
    );
  }, [selectedSessionId]);

  useEffect(() => {
    if (inlinePanel) {
      inlinePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [inlinePanel, selectedSession]);

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
    const duplicatedRange = getDuplicatedSessionRange(
      dateValue,
      duplicateSource.startsAt,
      duplicateSource.endAt,
    );

    if (!duplicatedRange) {
      setDuplicateError("The source session has an invalid start or end time.");
      return;
    }

    const response = await onCreateSession({
      activityId: activity.mockId,
      title: duplicateSource.title,
      instructor: duplicateSource.instructor,
      startsAt: duplicatedRange.startsAt,
      endAt: duplicatedRange.endAt,
      location: duplicateSource.location,
      lat: Number(duplicateSource.lat ?? 0),
      lng: Number(duplicateSource.lng ?? 0),
      spots: Number(duplicateSource.spots),
      priceSgd: duplicateSource.priceSgd,
      isPremium: duplicateSource.isPremium,
      skillsFuturePayable: duplicateSource.skillsFuturePayable,
    });
    const createdSessionId =
      response.session?.id ?? response.session?.mockId;

    navigate(`/activities/${activity.mockId}`, { replace: true });

    if (createdSessionId !== undefined) {
      setInlinePanel({
        mode: "details",
        sessionId: String(createdSessionId),
      });
    }
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

      <Card title="Activity Details">
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

          {activity.suitability && (
            <div className="activity-details__text-section">
              <strong>Suitability</strong>
              <p>{activity.suitability}</p>
            </div>
          )}

          {activity.imageUrls.length > 0 && (
            <div className="activity-details__images">
              {activity.imageUrls.map((imageUrl, index) => (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt={`${activity.title} ${index + 1}`}
                />
              ))}
            </div>
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
        selectedSessionId={
          inlinePanel?.mode === "details" ? inlinePanel.sessionId : null
        }
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

          setInlinePanel({ mode: "create", date: dateValue });
        }}
        onSelectSession={(session) =>
          setInlinePanel({
            mode: "details",
            sessionId: String(getSessionRouteId(session)),
          })
        }
      />

      {inlinePanel && (
        <div ref={inlinePanelRef}>
          {inlinePanel.mode === "create" ? (
            <SessionCreatePanel
              key={`${activity.id}-${inlinePanel.date}`}
              activity={activity}
              activityId={activity.mockId}
              vendor={vendor}
              selectedDate={inlinePanel.date}
              error={error}
              isSubmitting={isCreatingSession}
              onCreateSession={onCreateSession}
              onCreated={(response) => {
                const createdSessionId =
                  response.session?.id ?? response.session?.mockId;

                if (createdSessionId !== undefined) {
                  setInlinePanel({
                    mode: "details",
                    sessionId: String(createdSessionId),
                  });
                }
              }}
            />
          ) : selectedSession ? (
            <SessionDetailsPanel
              activity={activity}
              session={selectedSession}
              isUpdating={
                updatingSessionId ===
                String(getSessionRouteId(selectedSession))
              }
              isDeleting={
                deletingSessionId === String(getSessionRouteId(selectedSession))
              }
              onToggleSessionOpen={onToggleSessionOpen}
              onUpdateSession={onUpdateSession}
              onDeleteSession={onDeleteSession}
              onDeleted={() => setInlinePanel(null)}
              onDuplicate={() => {
                setInlinePanel(null);
                navigate(
                  `/activities/${activity.mockId}?duplicateSession=${encodeURIComponent(
                    String(getSessionRouteId(selectedSession)),
                  )}`,
                );
              }}
              onAttendance={() =>
                navigate(
                  `/sessions/${String(
                    getSessionRouteId(selectedSession),
                  )}/attendance`,
                )
              }
              onAnnouncements={() =>
                navigate(
                  `/announcements/${encodeURIComponent(
                    String(
                      selectedSession.id ??
                        selectedSession.objectId ??
                        selectedSession.mockId,
                    ),
                  )}`,
                )
              }
            />
          ) : (
            <Card title="Session Details" className="session-inline-panel">
              <div className="empty-state">
                <ClipboardList size={28} />
                <strong>Session not found</strong>
                <span>Select another session from the calendar.</span>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
