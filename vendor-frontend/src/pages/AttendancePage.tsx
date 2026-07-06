import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CalendarPlus, Loader2, Users } from "lucide-react";
import {
  fetchActivityAttendees,
  updateActivityAttendance,
} from "../api/activities";
import { Card } from "../components/Card";
import type { ActivityAttendee, VendorActivity } from "../api/types";

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

export function AttendancePage({
  activities,
}: {
  activities: VendorActivity[];
}) {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const activity =
    activities.find((item) => String(item.mockId) === activityId) ??
    activities.find((item) => item.id === activityId) ??
    null;
  const [attendees, setAttendees] = useState<ActivityAttendee[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!activity) {
      setAttendees([]);
      return;
    }

    let active = true;

    setIsLoadingAttendees(true);
    setAttendanceError(null);

    fetchActivityAttendees(activity.mockId)
      .then((response) => {
        if (active) {
          setAttendees(response.attendees);
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
  }, [activity]);

  const toggleAttended = async (attendee: ActivityAttendee) => {
    if (!activity) {
      return;
    }

    try {
      setAttendanceError(null);
      setUpdatingUserId(attendee.id);
      const response = await updateActivityAttendance({
        activityId: activity.mockId,
        attended: !attendee.attended,
        userId: attendee.id,
      });

      setAttendees((currentAttendees) =>
        currentAttendees.map((currentAttendee) =>
          currentAttendee.id === attendee.id
            ? { ...currentAttendee, attended: response.attendee.attended }
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

  if (!activity) {
    return (
      <div className="dashboard__main dashboard__main--full">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/upcoming")}
        >
          <ArrowLeft size={16} />
          Upcoming Activities
        </button>
        <Card title="Attendance">
          <div className="empty-state">
            <CalendarPlus size={28} />
            <strong>Activity not found</strong>
            <span>Choose an activity from Upcoming Activities.</span>
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
        onClick={() => navigate("/upcoming")}
      >
        <ArrowLeft size={16} />
        Upcoming Activities
      </button>

      <Card title={`Attendance - ${activity.title}`}>
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
              attendees.map((attendee) => (
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
                      attendee.attended ? "attendance-status-button--present" : ""
                    }`}
                    disabled={updatingUserId === attendee.id}
                    onClick={() => toggleAttended(attendee)}
                  >
                    {updatingUserId === attendee.id ? (
                      <Loader2 size={14} className="spin" />
                    ) : attendee.attended ? (
                      "Present"
                    ) : (
                      "Absent"
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
