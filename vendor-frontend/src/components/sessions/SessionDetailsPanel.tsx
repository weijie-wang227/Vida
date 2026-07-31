import { useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  Copy,
  GraduationCap,
  Loader2,
  Lock,
  MapPin,
  Megaphone,
  Pencil,
  Star,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import type {
  Activity,
  Session,
  UpdateSessionInput,
  UpdateVendorSessionResponse,
} from "../../api/types";
import { currencyFormatter } from "../../utils/currency";
import { Card } from "../Card";
import { SessionCreatePanel } from "./SessionCreatePanel";

function formatSessionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getSessionPaymentMethod(session: Session) {
  if (session.skillsFuturePayable) {
    return "SkillsFuture Payable";
  }

  if (session.isPremium) {
    return "Premium";
  }

  return session.priceSgd > 0 ? "Paid" : "Free";
}

function formatSessionPrice(session: Session) {
  return currencyFormatter.format(session.priceSgd);
}

type SessionDetailsPanelProps = {
  activity: Activity | null;
  session: Session;
  isUpdating: boolean;
  isDeleting: boolean;
  onToggleSessionOpen: (
    sessionId: number | string,
    isOpen: boolean,
  ) => Promise<void>;
  onDeleteSession: (sessionId: number | string) => Promise<void>;
  onUpdateSession: (
    sessionId: number | string,
    input: UpdateSessionInput,
  ) => Promise<UpdateVendorSessionResponse>;
  onDeleted: () => void;
  onDuplicate: () => void;
  onAttendance: () => void;
  onAnnouncements: () => void;
  className?: string;
};

export function SessionDetailsPanel({
  activity,
  session,
  isUpdating,
  isDeleting,
  onToggleSessionOpen,
  onDeleteSession,
  onUpdateSession,
  onDeleted,
  onDuplicate,
  onAttendance,
  onAnnouncements,
  className = "",
}: SessionDetailsPanelProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const sessionRouteId = session.mockId ?? session.id ?? session.objectId;
  const paymentMethod = getSessionPaymentMethod(session);

  if (isEditing) {
    return (
      <SessionCreatePanel
        activity={activity}
        activityId={
          activity?.mockId ??
          session.activityMockId ??
          session.activityId
        }
        vendor={null}
        selectedDate=""
        error={null}
        isSubmitting={isUpdating}
        session={session}
        onUpdateSession={onUpdateSession}
        onUpdated={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
        className={className}
      />
    );
  }

  const closeDeleteConfirmation = () => {
    if (!isDeleting) {
      setIsDeleteConfirmOpen(false);
      setDeleteError(null);
    }
  };

  const handleDeleteSession = async () => {
    if (sessionRouteId === undefined) {
      return;
    }

    setDeleteError(null);

    try {
      await onDeleteSession(sessionRouteId);
      setIsDeleteConfirmOpen(false);
      onDeleted();
    } catch (submissionError) {
      setDeleteError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to delete session.",
      );
    }
  };

  return (
    <>
      <Card
        title="Session Details"
        className={`session-inline-panel ${className}`.trim()}
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
                Starts
              </span>
              <strong>{formatSessionDate(session.startsAt)}</strong>
            </div>
            <div className="activity-detail-tile">
              <span>
                <CalendarDays size={16} />
                Ends
              </span>
              <strong>{formatSessionDate(session.endAt)}</strong>
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
            <div className="activity-detail-tile">
              <span>
                {paymentMethod === "SkillsFuture Payable" ? (
                  <GraduationCap size={16} />
                ) : paymentMethod === "Premium" ? (
                  <Star size={16} />
                ) : (
                  <CircleDollarSign size={16} />
                )}
                Payment method
              </span>
              <strong>{paymentMethod}</strong>
              {paymentMethod !== "Free" && (
                <small>{formatSessionPrice(session)}</small>
              )}
            </div>
          </div>

          <div className="activity-details__actions">
            <button
              type="button"
              className="table-action"
              disabled={isUpdating}
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={14} />
              Edit Session
            </button>
            <button
              type="button"
              className="table-action"
              onClick={onDuplicate}
            >
              <Copy size={14} />
              Duplicate Session
            </button>
            <button
              type="button"
              className="table-action"
              onClick={onAttendance}
            >
              Attendance
            </button>
            {session.isActive && (
              <>
                <button
                  type="button"
                  className="table-action"
                  onClick={onAnnouncements}
                >
                  <Megaphone size={14} />
                  Announcements
                </button>
                <button
                  type="button"
                  className={`table-action ${
                    session.isOpen ? "table-action--danger" : ""
                  }`}
                  disabled={isUpdating}
                  onClick={() =>
                    onToggleSessionOpen(sessionRouteId, !session.isOpen)
                  }
                >
                  {session.isOpen ? "Close Signup" : "Open Signup"}
                </button>
              </>
            )}
            <button
              type="button"
              className="table-action table-action--danger"
              disabled={isDeleting}
              onClick={() => {
                setDeleteError(null);
                setIsDeleteConfirmOpen(true);
              }}
            >
              <Trash2 size={14} />
              Delete Session
            </button>
          </div>
        </div>
      </Card>

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
    </>
  );
}
