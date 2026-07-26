import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  CircleStop,
  ClipboardList,
  Copy,
  Loader2,
  Lock,
  MapPin,
  Trash2,
  Unlock,
  Users,
  X,
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
      String(activity.mockId) === activityId || activity.id === activityId,
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
  endingSessionId,
  onToggleActivityOpen,
  onDeleteSession,
  onEndSession,
}: {
  activities: Activity[];
  sessions: Session[];
  updatingActivityId: string | null;
  deletingSessionId: string | null;
  endingSessionId: string | null;
  onToggleActivityOpen: (
    activityId: number | string,
    isOpen: boolean,
  ) => Promise<void>;
  onDeleteSession: (sessionId: number | string) => Promise<void>;
  onEndSession: (sessionId: number | string) => Promise<void>;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activityId, sessionId } = useParams();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const activity = getActivityRows(activities, activityId)[0] ?? null;
  const session = getSessionByRouteId(sessions, activityId, sessionId);
  const isUpdating = session
    ? updatingActivityId === String(session.mockId)
    : false;
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
  const sessionRouteId = session?.mockId ?? session?.id ?? session?.objectId;
  const isDeleting =
    sessionRouteId !== undefined &&
    deletingSessionId === String(sessionRouteId);
  const isEnding =
    sessionRouteId !== undefined &&
    endingSessionId === String(sessionRouteId);

  const openDeleteConfirmation = () => {
    setIsEndConfirmOpen(false);
    setEndError(null);
    setDeleteError(null);
    setIsDeleteConfirmOpen(true);
  };

  const closeDeleteConfirmation = () => {
    if (!isDeleting) {
      setIsDeleteConfirmOpen(false);
      setDeleteError(null);
    }
  };

  const openEndConfirmation = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteError(null);
    setEndError(null);
    setIsEndConfirmOpen(true);
  };

  const closeEndConfirmation = () => {
    if (!isEnding) {
      setIsEndConfirmOpen(false);
      setEndError(null);
    }
  };

  const handleEndSession = async () => {
    if (sessionRouteId === undefined) {
      return;
    }

    setEndError(null);

    try {
      await onEndSession(sessionRouteId);
      setIsEndConfirmOpen(false);
    } catch (submissionError) {
      setEndError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to end session.",
      );
    }
  };

  const handleDeleteSession = async () => {
    if (sessionRouteId === undefined) {
      return;
    }

    setDeleteError(null);

    try {
      await onDeleteSession(sessionRouteId);
      navigate(`/activities/${activityRouteId}`, { replace: true });
    } catch (submissionError) {
      setDeleteError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to delete session.",
      );
    }
  };

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

      <Card
        title="Session Details"
        action={
          <span
            className={`activity-status ${
              session.isActive && session.isOpen
                ? ""
                : "activity-status--closed"
            }`}
          >
            {session.isActive && session.isOpen ? (
              <Unlock size={14} />
            ) : (
              <Lock size={14} />
            )}
            {!session.isActive
              ? "Ended"
              : session.isOpen
                ? "Signups Open"
                : "Signups Closed"}
          </span>
        }
      >
        <div className="activity-details">
          <div className="activity-details__header">
            <div>
              <span>
                {activity?.title ?? session.activity?.title ?? "Activity"}
              </span>
              <h2>{session.title}</h2>
            </div>
          </div>

          {session.instructor && (
            <div className="activity-details__text-section">
              <strong>Instructor</strong>
              <p>{session.instructor}</p>
            </div>
          )}

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
            {session.isActive && (
              <button
                type="button"
                className={`table-action ${
                  session.isOpen ? "table-action--danger" : ""
                }`}
                disabled={isUpdating || isEnding}
                onClick={() =>
                  onToggleActivityOpen(session.mockId, !session.isOpen)
                }
              >
                {session.isOpen ? "Close Signup" : "Open Signup"}
              </button>
            )}
            <button
              type="button"
              className={`table-action ${
                session.isActive ? "table-action--danger" : ""
              }`}
              disabled={!session.isActive || isEnding || isDeleting}
              onClick={openEndConfirmation}
            >
              {isEnding ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <CircleStop size={14} />
              )}
              {session.isActive ? "End Session" : "Session Ended"}
            </button>
            <button
              type="button"
              className="table-action table-action--danger"
              disabled={isEnding}
              onClick={openDeleteConfirmation}
            >
              <Trash2 size={14} />
              Delete Session
            </button>
          </div>
        </div>
      </Card>

      {isEndConfirmOpen && (
        <div
          className="vendor-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-session-title"
          aria-describedby="end-session-description"
        >
          <div className="vendor-modal__panel confirmation-dialog">
            <div className="vendor-modal__header">
              <div>
                <span>End session</span>
                <h2 id="end-session-title">End {session.title}?</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeEndConfirmation}
                disabled={isEnding}
                aria-label="Close end session confirmation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="confirmation-dialog__body">
              <p id="end-session-description">
                Are you sure you want to end this session?
              </p>
              <p className="confirmation-dialog__warning">
                The session will move to Past Sessions and will no longer
                accept new signups.
              </p>

              {endError && <p className="form-error">{endError}</p>}

              <div className="confirmation-dialog__actions">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={closeEndConfirmation}
                  disabled={isEnding}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-action primary-action--danger"
                  onClick={handleEndSession}
                  disabled={isEnding}
                >
                  {isEnding && <Loader2 size={16} className="spin" />}
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div
          className="vendor-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-session-title"
          aria-describedby="delete-session-description"
        >
          <div className="vendor-modal__panel confirmation-dialog">
            <div className="vendor-modal__header">
              <div>
                <span>Delete session</span>
                <h2 id="delete-session-title">Delete {session.title}?</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeDeleteConfirmation}
                disabled={isDeleting}
                aria-label="Close delete session confirmation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="confirmation-dialog__body">
              <p id="delete-session-description">
                Are you sure you want to delete this session?
              </p>
              <p className="confirmation-dialog__warning">
                The session and all of its participation records will be
                permanently deleted. This action cannot be undone.
              </p>

              {deleteError && <p className="form-error">{deleteError}</p>}

              <div className="confirmation-dialog__actions">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={closeDeleteConfirmation}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-action primary-action--danger"
                  onClick={handleDeleteSession}
                  disabled={isDeleting}
                >
                  {isDeleting && <Loader2 size={16} className="spin" />}
                  Delete Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
