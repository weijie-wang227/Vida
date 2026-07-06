import { useNavigate } from "react-router";
import { CalendarPlus, Star, Users } from "lucide-react";
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
}: {
  activities: VendorActivity[];
}) {
  const navigate = useNavigate();

  return (
    <div className="dashboard__main dashboard__main--full">
      <Card title="Upcoming Activities">
        {activities.length === 0 ? (
          <div className="empty-state">
            <CalendarPlus size={28} />
            <strong>No upcoming activities</strong>
            <span>Create an activity before opening attendance.</span>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
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
                      <button
                        type="button"
                        className="table-action"
                        onClick={() =>
                          navigate(`/upcoming/${activity.mockId}/attendance`)
                        }
                      >
                        Attendance
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
