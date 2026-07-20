import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Plus,
  Send,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import {
  createVendorPoll,
  fetchVendorChatMessages,
  sendVendorChatMessage,
} from "../api/chats";
import { fetchVendorChats } from "../api/vendors";
import type { VendorChat, VendorChatMessage } from "../api/types";
import { Card } from "../components/Card";
import {
  ChatUserProfileDialog,
  type VendorChatProfileUser,
} from "../components/chat/ChatUserProfileDialog";

function MessageAuthor({
  message,
  onOpenProfile,
}: {
  message: VendorChatMessage;
  onOpenProfile: (user: VendorChatProfileUser) => void;
}) {
  return (
    <div className="vendor-message__header">
      <button
        type="button"
        className="vendor-message-author"
        onClick={() => onOpenProfile(message.sender)}
        aria-label={`View ${message.sender.name} profile`}
      >
        <span className="vendor-message-author__avatar">
          {message.sender.avatar ? (
            <img src={message.sender.avatar} alt="" />
          ) : (
            <UserRound size={15} />
          )}
        </span>
        <span>
          <strong>{message.sender.name}</strong>
          <small>{message.sender.handle || "Vida member"}</small>
        </span>
      </button>
      <time dateTime={message.createdAt}>{message.time}</time>
    </div>
  );
}

function VendorMessage({
  message,
  onOpenProfile,
}: {
  message: VendorChatMessage;
  onOpenProfile: (user: VendorChatProfileUser) => void;
}) {
  if (message.type === "text") {
    return (
      <article className="vendor-message vendor-message--text">
        <MessageAuthor message={message} onOpenProfile={onOpenProfile} />
        <p>{message.payload.text}</p>
      </article>
    );
  }

  if (message.type === "activity_invite") {
    return (
      <article className="vendor-message vendor-message--invite">
        <MessageAuthor message={message} onOpenProfile={onOpenProfile} />
        <span className="vendor-message__kind">Activity invite</span>
        <h3>{message.payload.activity.title}</h3>
        <p>{message.payload.activity.location}</p>
      </article>
    );
  }

  return (
    <article className="vendor-message vendor-message--poll">
      <MessageAuthor message={message} onOpenProfile={onOpenProfile} />
      <span className="vendor-message__kind">
        <BarChart3 size={14} /> Poll
      </span>
      <h3>{message.payload.question}</h3>
      <div className="vendor-poll-results">
        {message.payload.options.map((option) => {
          const percentage =
            message.payload.totalVotes > 0
              ? Math.round(
                  (option.votes / message.payload.totalVotes) * 100,
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
        {message.payload.totalVotes} {message.payload.totalVotes === 1 ? "vote" : "votes"}
      </p>
    </article>
  );
}

export function ChatDetailsPage() {
  const navigate = useNavigate();
  const { chatId: chatIdParam } = useParams();
  const chatId = Number(chatIdParam);
  const [chat, setChat] = useState<VendorChat | null>(null);
  const [messages, setMessages] = useState<VendorChatMessage[]>([]);
  const [composerMode, setComposerMode] = useState<"message" | "poll">("message");
  const [messageDraft, setMessageDraft] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<VendorChatProfileUser | null>(null);

  useEffect(() => {
    let active = true;

    if (!Number.isInteger(chatId)) {
      setError("Choose a valid chat.");
      setIsLoading(false);
      return;
    }

    Promise.all([fetchVendorChats(), fetchVendorChatMessages(chatId)])
      .then(([chats, messageRows]) => {
        if (!active) {
          return;
        }

        setChat(chats.find((item) => item.mockId === chatId) ?? null);
        setMessages(messageRows);
        setError(null);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this chat.",
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
  }, [chatId]);

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

    if (!nextQuestion || nextOptions.length < 2 || !Number.isInteger(chatId)) {
      setError("Enter a question and at least two options.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await createVendorPoll(chatId, {
        question: nextQuestion,
        options: nextOptions,
      });

      setMessages((current) => [...current, response.message]);
      setQuestion("");
      setOptions(["", ""]);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create poll.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = messageDraft.trim();

    if (!text || !Number.isInteger(chatId)) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await sendVendorChatMessage(chatId, text);

      setMessages((current) => [...current, response.message]);
      setMessageDraft("");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to send message.",
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
            <span>Loading chat</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard__main dashboard__main--full vendor-chat-detail-page">
      <button type="button" className="back-button" onClick={() => navigate("/chats")}>
        <ArrowLeft size={16} /> Back to chats
      </button>

      <div className="vendor-chat-detail-layout">
        <Card className="vendor-chat-thread">
          <header className="vendor-chat-thread__header">
            <div className="vendor-chat-avatar" aria-hidden="true">
              {chat?.avatar ? <img src={chat.avatar} alt="" /> : <MessageCircle size={22} />}
            </div>
            <div>
              <h2>{chat?.session.title ?? "Session chat"}</h2>
              <span><Users size={13} /> {chat?.memberCount ?? 0} members</span>
            </div>
          </header>

          {messages.length === 0 ? (
            <div className="empty-state">
              <MessageCircle size={26} />
              <strong>No messages yet</strong>
            </div>
          ) : (
            <div className="vendor-message-list">
              {messages.map((message) => (
                <VendorMessage
                  key={message.id}
                  message={message}
                  onOpenProfile={setSelectedProfile}
                />
              ))}
            </div>
          )}
        </Card>

        <Card title="Send to chat" className="vendor-poll-composer vendor-chat-composer">
          <div className="vendor-composer-tabs" role="tablist" aria-label="Message type">
            <button
              type="button"
              role="tab"
              aria-selected={composerMode === "message"}
              onClick={() => {
                setComposerMode("message");
                setError(null);
              }}
            >
              <MessageSquareText size={15} /> Message
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
            <form onSubmit={submitMessage}>
              <label>
                <span>Message</span>
                <textarea
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  placeholder="Write a message to the session chat"
                  maxLength={1000}
                />
              </label>

              {error && <p className="form-error">{error}</p>}

              <button
                type="submit"
                className="primary-action vendor-poll-submit"
                disabled={isSubmitting || !messageDraft.trim()}
              >
                {isSubmitting ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                Send message
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
                      onChange={(event) => updateOption(index, event.target.value)}
                      placeholder={`Option ${index + 1}`}
                      maxLength={100}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((current) =>
                            current.filter((_, optionIndex) => optionIndex !== index),
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
                {isSubmitting ? <Loader2 size={16} className="spin" /> : <BarChart3 size={16} />}
                Publish poll
              </button>
            </form>
          )}
        </Card>
      </div>

      <ChatUserProfileDialog
        user={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
    </div>
  );
}
