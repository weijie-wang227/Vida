import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  Check,
  Clock,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router";
import { formatActivityDate, formatActivityTime } from "../../lib/activityPresentation";
import type { ChatMessage } from "../../lib/types";
import { FriendAvatar, FriendAvatars } from "../FriendAvatars";

type ChatMessageItemProps = {
  message: ChatMessage;
  isMine: boolean;
  isVoting: boolean;
  onVote: (messageId: string, optionId: string) => void;
};

type TextMessage = Extract<ChatMessage, { type: "text" }>;
type InviteMessage = Extract<ChatMessage, { type: "activity_invite" }>;
type PollMessage = Extract<ChatMessage, { type: "poll" }>;

function TextMessageBubble({
  message,
  isMine,
}: {
  message: TextMessage;
  isMine: boolean;
}) {
  const senderAvatar = <FriendAvatar user={message.sender} className="h-7 w-7" />;

  return (
    <div className={`flex items-end gap-2 ${isMine ? "justify-end" : ""}`}>
      {!isMine && senderAvatar}
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 ${
          isMine
            ? "rounded-br-md bg-accent text-accent-foreground"
            : "rounded-bl-md border border-border bg-card text-foreground"
        }`}
      >
        {!isMine && (
          <p className="mb-1 text-[10px] font-semibold text-accent">
            {message.sender.name}
          </p>
        )}
        <p className="text-[12px] leading-snug">{message.payload.text}</p>
        <p
          className={`mt-1 text-[9px] ${
            isMine ? "text-accent-foreground/70" : "text-muted-foreground"
          }`}
        >
          {message.time}
        </p>
      </div>
      {isMine && senderAvatar}
    </div>
  );
}

function ActivityInviteBubble({
  message,
  isMine,
}: {
  message: InviteMessage;
  isMine: boolean;
}) {
  const navigate = useNavigate();
  const invite = message.payload;
  const senderAvatar = <FriendAvatar user={message.sender} className="h-7 w-7" />;

  return (
    <div className={`flex items-end gap-2 ${isMine ? "justify-end" : ""}`}>
      {!isMine && senderAvatar}
      <button
        type="button"
        onClick={() => navigate(`/activities/${invite.activity.id}`)}
        className={`max-w-[86%] rounded-2xl border px-3 py-3 text-left shadow-sm transition-transform active:scale-[0.99] ${
          isMine
            ? "rounded-br-md border-accent/25 bg-accent/10"
            : "rounded-bl-md border-border bg-card"
        }`}
        aria-label={`Open ${invite.activity.title}`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-accent">
              {message.sender.name}
            </p>
            <p className="text-[9px] text-muted-foreground">{message.time}</p>
          </div>
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <ArrowUpRight size={13} />
          </span>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Activity Invite
        </p>
        <h3 className="mt-1 text-sm font-bold leading-tight text-foreground">
          {invite.activity.title}
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <Calendar size={11} className="flex-shrink-0 text-accent" />
            <span className="truncate">
              {formatActivityDate(invite.activity.startsAt)}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <Clock size={11} className="flex-shrink-0 text-accent" />
            <span className="truncate">
              {formatActivityTime(invite.activity.startsAt)}
            </span>
          </span>
          <span className="col-span-2 flex min-w-0 items-center gap-1.5">
            <MapPin size={11} className="flex-shrink-0 text-accent" />
            <span className="truncate">{invite.activity.location}</span>
          </span>
        </div>

        <div className="mt-3 border-t border-border pt-2">
          {invite.participatingFriends.length > 0 ? (
            <FriendAvatars friends={invite.participatingFriends} max={4} />
          ) : (
            <p className="text-[10px] text-muted-foreground">
              No one has joined yet.
            </p>
          )}
        </div>
      </button>
      {isMine && senderAvatar}
    </div>
  );
}

function PollMessageBubble({
  message,
  isMine,
  isVoting,
  onVote,
}: {
  message: PollMessage;
  isMine: boolean;
  isVoting: boolean;
  onVote: (messageId: string, optionId: string) => void;
}) {
  const poll = message.payload;
  const senderAvatar = <FriendAvatar user={message.sender} className="h-7 w-7" />;

  return (
    <div className={`flex items-end gap-2 ${isMine ? "justify-end" : ""}`}>
      {!isMine && senderAvatar}
      <div className="w-[86%] max-w-sm rounded-2xl border border-accent/20 bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 text-accent">
          <BarChart3 size={15} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Poll</span>
          <span className="ml-auto text-[9px] text-muted-foreground">
            {message.time}
          </span>
        </div>
        <p className="mt-2 text-sm font-bold leading-snug text-foreground">
          {poll.question}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Created by {message.sender.name}
        </p>

        <div className="mt-3 space-y-2">
          {poll.options.map((option) => {
            const percentage =
              poll.totalVotes > 0
                ? Math.round((option.votes / poll.totalVotes) * 100)
                : 0;

            return (
              <button
                type="button"
                key={option.id}
                disabled={isVoting}
                onClick={() => onVote(message.id, option.id)}
                className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left disabled:opacity-60 ${
                  option.selected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background"
                }`}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-accent/10"
                  style={{ width: `${percentage}%` }}
                  aria-hidden="true"
                />
                <span className="relative flex items-center gap-2 text-xs text-foreground">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {option.label}
                  </span>
                  {option.selected && <Check size={13} className="text-accent" />}
                  <strong>{percentage}%</strong>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
        </p>
      </div>
      {isMine && senderAvatar}
    </div>
  );
}

export function ChatMessageItem(props: ChatMessageItemProps) {
  switch (props.message.type) {
    case "text":
      return <TextMessageBubble message={props.message} isMine={props.isMine} />;
    case "activity_invite":
      return (
        <ActivityInviteBubble message={props.message} isMine={props.isMine} />
      );
    case "poll":
      return (
        <PollMessageBubble
          message={props.message}
          isMine={props.isMine}
          isVoting={props.isVoting}
          onVote={props.onVote}
        />
      );
  }
}
