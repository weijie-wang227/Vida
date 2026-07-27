import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  Megaphone,
  MessageSquareText,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import {
  fetchSessionAnnouncements,
  fetchVendorAnnouncementSessions,
  postSessionAnnouncement,
  postSessionAnnouncementPoll,
} from "../api/announcements";
import type {
  Announcement,
  VendorAnnouncementSession,
} from "../api/types";
import { Card } from "../components/Card";
import { formatSessionDateTime } from "../utils/sessionDateTime";

const announcementTimeFormatter = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatAnnouncementTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : announcementTimeFormatter.format(date);
}

export function AnnouncementDetailsPage() {
  const navigate = useNavigate();
  const { sessionId = "" } = useParams();
  const [session, setSession] = useState<VendorAnnouncementSession | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [composerMode, setComposerMode] = useState<"message" | "poll">(
    "message",
  );
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    if (!sessionId) {
      setError("Choose a valid session.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      fetchVendorAnnouncementSessions(),
      fetchSessionAnnouncements(sessionId),
    ])
      .then(([sessions, announcementRows]) => {
        if (!active) {
          return;
        }

        setSession(
          sessions.find((item) => item.session.id === sessionId) ?? null,
        );
        setAnnouncements(announcementRows);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load announcements for this session.",
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
  }, [sessionId]);

  const submitAnnouncement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();

    if (!content || !sessionId) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await postSessionAnnouncement(sessionId, content);

      setAnnouncements((current) => [...current, response.announcement]);
      setDraft("");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to post announcement.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOption = (index: number, value: string) => {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  };

  const submitPoll = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuestion = question.trim();
    const nextOptions = options.map((option) => option.trim()).filter(Boolean);

    if (!nextQuestion || nextOptions.length < 2 || !sessionId) {
      setError("Enter a question and at least two options.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await postSessionAnnouncementPoll(sessionId, {
        question: nextQuestion,
        options: nextOptions,
      });

      setAnnouncements((current) => [...current, response.announcement]);
      setQuestion("");
      setOptions(["", ""]);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create announcement poll.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard__main dashboard__main--full chats-page">
        <Card>
          <div className="empty-state empty-state--compact">
            <Loader2 size={20} className="spin" />
            <span>Loading announcements</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard__main dashboard__main--full vendor-chat-detail-page">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/announcements")}
      >
        <ArrowLeft size={16} /> Back to announcements
      </button>

      <div className="vendor-chat-detail-layout">
        <Card className="vendor-chat-thread">
          <header className="vendor-chat-thread__header">
            <div className="vendor-chat-avatar" aria-hidden="true">
              <Megaphone size={22} />
            </div>
            <div>
              <h2>
                {session
                  ? formatSessionDateTime(session.session.startsAt)
                  : "Session announcements"}
              </h2>
              <span>
                <Users size={13} />{" "}
                {session?.session.registeredCount ?? 0} registered
              </span>
            </div>
          </header>

          {announcements.length === 0 ? (
            <div className="empty-state">
              <Megaphone size={26} />
              <strong>No announcements yet</strong>
              <span>Post an update for this session.</span>
            </div>
          ) : (
            <div className="vendor-message-list">
              {announcements.map((announcement) => {
                if (announcement.type === "message") {
                  return (
                    <article
                      className="vendor-message vendor-message--text"
                      key={announcement.id}
                    >
                      <p>{announcement.content}</p>
                      <time
                        className="vendor-announcement-time"
                        dateTime={announcement.createdAt}
                      >
                        {formatAnnouncementTime(announcement.createdAt)}
                      </time>
                    </article>
                  );
                }

                return (
                  <article
                    className="vendor-message vendor-message--poll"
                    key={announcement.id}
                  >
                    <h3><span className="vendor-message__kind"><BarChart3 size={14} /> Poll</span> {announcement.content}</h3>
                    <div className="vendor-poll-results">
                      {announcement.poll.options.map((option) => {
                        const percentage =
                          announcement.poll.totalVotes > 0
                            ? Math.round(
                                (option.votes /
                                  announcement.poll.totalVotes) *
                                  100,
                              )
                            : 0;

                        return (
                          <div className="vendor-poll-result" key={option.id}>
                            <div>
                              <span>{option.label}</span>
                              <strong>{option.votes}</strong>
                            </div>
                            <span className="vendor-poll-result__track">
                              <span style={{ width: `${percentage}%` }} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="vendor-poll-total">
                      {announcement.poll.totalVotes}{" "}
                      {announcement.poll.totalVotes === 1 ? "vote" : "votes"}
                    </p>
                    <time
                      className="vendor-announcement-time"
                      dateTime={announcement.createdAt}
                    >
                      {formatAnnouncementTime(announcement.createdAt)}
                    </time>
                  </article>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="Post announcement"
          className="vendor-poll-composer vendor-chat-composer"
        >
          <div
            className="vendor-composer-tabs"
            role="tablist"
            aria-label="Announcement type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={composerMode === "message"}
              onClick={() => {
                setComposerMode("message");
                setError(null);
              }}
            >
              <MessageSquareText size={15} /> Announcement
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={composerMode === "poll"}
              onClick={() => {
                setComposerMode("poll");
                setError(null);
              }}
            >
              <BarChart3 size={15} /> Poll
            </button>
          </div>

          {composerMode === "message" ? (
            <form onSubmit={submitAnnouncement}>
              <label>
                <span>Announcement</span>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write an update for this session"
                  maxLength={1000}
                />
              </label>

              {error && <p className="form-error">{error}</p>}

              <button
                type="submit"
                className="primary-action vendor-poll-submit"
                disabled={isSubmitting || !draft.trim()}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Send size={16} />
                )}
                Post announcement
              </button>
            </form>
          ) : (
            <form onSubmit={submitPoll}>
              <label>
                <span>Question</span>
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What would you like to ask?"
                  maxLength={200}
                />
              </label>

              <fieldset>
                <legend>Options</legend>
                {options.map((option, index) => (
                  <div className="vendor-poll-option-input" key={index}>
                    <input
                      value={option}
                      onChange={(event) =>
                        updateOption(index, event.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      maxLength={100}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((current) =>
                            current.filter(
                              (_, optionIndex) => optionIndex !== index,
                            ),
                          )
                        }
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </fieldset>

              {options.length < 6 && (
                <button
                  type="button"
                  className="vendor-poll-add-option"
                  onClick={() => setOptions((current) => [...current, ""])}
                >
                  <Plus size={15} /> Add option
                </button>
              )}

              {error && <p className="form-error">{error}</p>}

              <button
                type="submit"
                className="primary-action vendor-poll-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <BarChart3 size={16} />
                )}
                Publish poll
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
