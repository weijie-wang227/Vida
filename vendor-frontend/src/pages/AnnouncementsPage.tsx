import { useEffect, useState } from "react";
import {
  CalendarDays,
  Loader2,
  MapPin,
  Megaphone,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import { fetchVendorAnnouncementSessions } from "../api/announcements";
import type { VendorAnnouncementSession } from "../api/types";
import { Card } from "../components/Card";

const sessionDateFormatter = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const sessionTimeFormatter = new Intl.DateTimeFormat("en-SG", {
  hour: "numeric",
  minute: "2-digit",
});

function formatSessionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return `${sessionDateFormatter.format(date)}, ${sessionTimeFormatter.format(date)}`;
}

function formatLastActivity(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const announcementDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDifference = Math.round(
    (today.getTime() - announcementDay.getTime()) / 86_400_000,
  );

  if (dayDifference === 0) {
    return sessionTimeFormatter.format(date);
  }

  if (dayDifference === 1) {
    return "Yesterday";
  }

  return sessionDateFormatter.format(date);
}

function getSessionStatus(item: VendorAnnouncementSession) {
  const startsAt = new Date(item.session.startsAt).getTime();

  if (!item.session.isActive) {
    return { label: "Inactive", className: "vendor-chat-status--closed" };
  }

  if (startsAt < Date.now()) {
    return { label: "Past", className: "vendor-chat-status--past" };
  }

  if (!item.session.isOpen) {
    return { label: "Closed", className: "vendor-chat-status--closed" };
  }

  return { label: "Upcoming", className: "vendor-chat-status--upcoming" };
}

export function AnnouncementsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<VendorAnnouncementSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    fetchVendorAnnouncementSessions()
      .then((response) => {
        if (active) {
          setSessions(response);
        }
      })
      .catch((loadError) => {
        if (active) {
          setSessions([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load session announcements.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="dashboard__main dashboard__main--full chats-page">
      <Card
        title="All session announcements"
        action={
          !isLoading && !error ? (
            <span className="vendor-chat-count">
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
            </span>
          ) : null
        }
        className="vendor-chats-card"
      >
        {isLoading ? (
          <div className="empty-state empty-state--compact">
            <Loader2 size={20} className="spin" />
            <span>Loading session announcements</span>
          </div>
        ) : error ? (
          <div className="vendor-chats-error">
            <p className="form-error">{error}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <Megaphone size={28} />
            <strong>No sessions available</strong>
            <span>A session will appear here after you create it.</span>
          </div>
        ) : (
          <div className="vendor-chat-list" role="list">
            {sessions.map((item) => {
              const status = getSessionStatus(item);

              return (
                <button
                  type="button"
                  className="vendor-chat-row"
                  key={item.id}
                  role="listitem"
                  onClick={() =>
                    navigate(
                      `/announcements/${encodeURIComponent(item.session.id)}`,
                    )
                  }
                >
                  <div className="vendor-chat-avatar" aria-hidden="true">
                    <Megaphone size={22} />
                  </div>

                  <div className="vendor-chat-body">
                    <div className="vendor-chat-heading">
                      <div>
                        <strong>{formatSessionDate(item.session.startsAt)}</strong>
                        <span>{item.activity.title}</span>
                      </div>
                      <span className={`vendor-chat-status ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    <p
                      className={
                        item.lastAnnouncement ? "" : "vendor-chat-message--empty"
                      }
                    >
                      {item.lastAnnouncement || "No announcements yet"}
                    </p>

                    <div className="vendor-chat-meta">
                      <span>
                        <CalendarDays size={14} />
                        {formatSessionDate(item.session.startsAt)}
                      </span>
                      {item.session.location && (
                        <span>
                          <MapPin size={14} />
                          {item.session.location}
                        </span>
                      )}
                      <span>
                        <Users size={14} />
                        {item.session.registeredCount} registered
                      </span>
                    </div>
                  </div>

                  <time
                    dateTime={item.updatedAt}
                    className="vendor-chat-updated"
                  >
                    {formatLastActivity(item.updatedAt)}
                  </time>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
