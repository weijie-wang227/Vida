import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CalendarPlus, Loader2, Users } from "lucide-react";
import {
  fetchActivityAttendees,
  updateActivityAttendance,
} from "../api/activities";
import { Card } from "../components/Card";
import type {
  ActivityAttendee,
  AttendanceStatus,
  Session,
} from "../api/types";

function formatSignedUpAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const nextStatusByStatus: Record<AttendanceStatus, AttendanceStatus> = {
  registered: "attended",
  approved: "attended",
  attended: "no_show",
  no_show: "registered",
};

export function AttendancePage({
  sessions,
}: {
  sessions: Session[];
}) {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const session =
    sessions.find((item) => String(item.mockId) === sessionId) ??
    sessions.find((item) => item.id === sessionId) ??
    sessions.find((item) => item.objectId === sessionId) ??
    null;
  const [attendees, setAttendees] = useState<ActivityAttendee[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [attendeePage, setAttendeePage] = useState(1);
  const [attendeeTotalPages, setAttendeeTotalPages] = useState(1);

  useEffect(() => {
    if (!session) {
      setAttendees([]);
      setAttendeePage(1);
      setAttendeeTotalPages(1);
      return;
    }

    let active = true;

    setIsLoadingAttendees(true);
    setAttendanceError(null);

    fetchActivityAttendees(session.mockId ?? session.id ?? session.objectId ?? "")
      .then((response) => {
        if (active) {
          setAttendees(response.attendees);
          setAttendeePage(response.pagination.page);
          setAttendeeTotalPages(response.pagination.totalPages);
        }
      })
      .catch((error) => {
        if (active) {
          setAttendees([]);
          setAttendanceError(
            error instanceof Error
              ? error.message
              : "Unable to load attendance.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingAttendees(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session]);

  const loadMoreAttendees = async () => {
    if (!session || attendeePage >= attendeeTotalPages) {
      return;
    }

    try {
      setAttendanceError(null);
      setIsLoadingMore(true);
      const response = await fetchActivityAttendees(
        session.mockId ?? session.id ?? session.objectId ?? "",
        attendeePage + 1,
      );

      setAttendees((current) => {
        const existingIds = new Set(current.map((attendee) => attendee.id));

        return [
          ...current,
          ...response.attendees.filter((attendee) => !existingIds.has(attendee.id)),
        ];
      });
      setAttendeePage(response.pagination.page);
      setAttendeeTotalPages(response.pagination.totalPages);
    } catch (error) {
      setAttendanceError(
        error instanceof Error ? error.message : "Unable to load more attendees.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const cycleAttendanceStatus = async (attendee: ActivityAttendee) => {
    if (!session) {
      return;
    }

    try {
      setAttendanceError(null);
      setUpdatingUserId(attendee.id);
      const response = await updateActivityAttendance({
        activityId: session.mockId ?? session.id ?? session.objectId ?? "",
        status: nextStatusByStatus[attendee.status],
        userId: attendee.id,
      });

      setAttendees((currentAttendees) =>
        currentAttendees.map((currentAttendee) =>
          currentAttendee.id === attendee.id
            ? {
                ...currentAttendee,
                status: response.attendee.status,
              }
            : currentAttendee,
        ),
      );
    } catch (error) {
      setAttendanceError(
        error instanceof Error ? error.message : "Unable to update attendance.",
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!session) {
    return (
      <div className="dashboard__main dashboard__main--full">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/activities")}
        >
          <ArrowLeft size={16} />
          View All Activities
        </button>
        <Card title="Attendance">
          <div className="empty-state">
            <CalendarPlus size={28} />
            <strong>Session not found</strong>
            <span>Choose a session from View All Activities.</span>
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
        View All Activities
      </button>

      <Card title={`Attendance - ${formatSignedUpAt(session.startsAt)}`}>
        <div className="attendance-panel">
          <div className="attendee-list">
            <h3>Signed-up users</h3>
            {isLoadingAttendees ? (
              <div className="empty-state empty-state--compact">
                <Loader2 size={20} className="spin" />
                <span>Loading signed-up users</span>
              </div>
            ) : attendanceError ? (
              <p className="form-error">{attendanceError}</p>
            ) : attendees.length === 0 ? (
              <div className="empty-state empty-state--compact">
                <Users size={24} />
                <span>No users have signed up yet.</span>
              </div>
            ) : (
              <>
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="attendee-row">
                  <img src={attendee.avatar} alt="" />
                  <div>
                    <strong>{attendee.name}</strong>
                    <span>
                      {attendee.handle}
                      {attendee.signedUpAt
                        ? ` - ${formatSignedUpAt(attendee.signedUpAt)}`
                        : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`attendance-status-button ${
                      attendee.status === "attended"
                        ? "attendance-status-button--present"
                        : ""
                    }`}
                    disabled={updatingUserId === attendee.id}
                    onClick={() => cycleAttendanceStatus(attendee)}
                  >
                    {updatingUserId === attendee.id ? (
                      <Loader2 size={14} className="spin" />
                    ) : attendee.status === "attended" ? (
                      "Present"
                    ) : attendee.status === "no_show" ? (
                      "No show"
                    ) : (
                      "Not marked"
                    )}
                  </button>
                  </div>
                ))}
                {attendeePage < attendeeTotalPages ? (
                  <button
                    type="button"
                    className="attendance-status-button"
                    disabled={isLoadingMore}
                    onClick={loadMoreAttendees}
                  >
                    {isLoadingMore ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      "Load more"
                    )}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
