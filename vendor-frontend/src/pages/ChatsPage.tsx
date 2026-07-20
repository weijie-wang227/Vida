import { useEffect, useState } from "react";
import {
  CalendarDays,
  Loader2,
  MapPin,
  MessageCircle,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import { fetchVendorChats } from "../api/vendors";
import type { VendorChat } from "../api/types";
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
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round(
    (today.getTime() - messageDay.getTime()) / 86_400_000,
  );

  if (dayDifference === 0) {
    return sessionTimeFormatter.format(date);
  }

  if (dayDifference === 1) {
    return "Yesterday";
  }

  return sessionDateFormatter.format(date);
}

function getSessionStatus(chat: VendorChat) {
  const startsAt = new Date(chat.session.startsAt).getTime();

  if (!chat.session.isActive) {
    return { label: "Inactive", className: "vendor-chat-status--closed" };
  }

  if (startsAt < Date.now()) {
    return { label: "Past", className: "vendor-chat-status--past" };
  }

  if (!chat.session.isOpen) {
    return { label: "Closed", className: "vendor-chat-status--closed" };
  }

  return { label: "Upcoming", className: "vendor-chat-status--upcoming" };
}

export function ChatsPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<VendorChat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    fetchVendorChats()
      .then((response) => {
        if (active) {
          setChats(response);
        }
      })
      .catch((loadError) => {
        if (active) {
          setChats([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load session chats.",
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
        title="All session chats"
        action={
          !isLoading && !error ? (
            <span className="vendor-chat-count">
              {chats.length} {chats.length === 1 ? "chat" : "chats"}
            </span>
          ) : null
        }
        className="vendor-chats-card"
      >
        {isLoading ? (
          <div className="empty-state empty-state--compact">
            <Loader2 size={20} className="spin" />
            <span>Loading session chats</span>
          </div>
        ) : error ? (
          <div className="vendor-chats-error">
            <p className="form-error">{error}</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="empty-state">
            <MessageCircle size={28} />
            <strong>No session chats yet</strong>
            <span>A chat will appear here when you create a session.</span>
          </div>
        ) : (
          <div className="vendor-chat-list" role="list">
            {chats.map((chat) => {
              const status = getSessionStatus(chat);

              return (
                <button
                  type="button"
                  className="vendor-chat-row"
                  key={`${chat.id}-${chat.session.id}`}
                  role="listitem"
                  onClick={() => navigate(`/chats/${chat.mockId}`)}
                >
                  <div className="vendor-chat-avatar" aria-hidden="true">
                    {chat.avatar ? (
                      <img src={chat.avatar} alt="" />
                    ) : (
                      <MessageCircle size={22} />
                    )}
                  </div>

                  <div className="vendor-chat-body">
                    <div className="vendor-chat-heading">
                      <div>
                        <strong>{chat.session.title || chat.name}</strong>
                        <span>{chat.activity.title}</span>
                      </div>
                      <span className={`vendor-chat-status ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    <p className={chat.lastMessage ? "" : "vendor-chat-message--empty"}>
                      {chat.lastMessage || "No messages yet"}
                    </p>

                    <div className="vendor-chat-meta">
                      <span>
                        <CalendarDays size={14} />
                        {formatSessionDate(chat.session.startsAt)}
                      </span>
                      {chat.session.location && (
                        <span>
                          <MapPin size={14} />
                          {chat.session.location}
                        </span>
                      )}
                      <span>
                        <Users size={14} />
                        {chat.memberCount} {chat.memberCount === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </div>

                  <time dateTime={chat.updatedAt} className="vendor-chat-updated">
                    {formatLastActivity(chat.updatedAt)}
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
