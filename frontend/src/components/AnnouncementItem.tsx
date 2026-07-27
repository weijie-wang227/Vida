import { Check, Loader2, Megaphone } from "lucide-react";
import type { Announcement } from "../lib/types";

function formatAnnouncementTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function AnnouncementItem({
  announcement,
  isVoting,
  onVote,
}: {
  announcement: Announcement;
  isVoting: boolean;
  onVote: (announcementId: string, optionId: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#eaf0ff] text-[#2852a4]">
          <Megaphone size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#2852a4]">
              Announcement
            </p>
            <time className="flex-shrink-0 text-[10px] text-muted-foreground">
              {formatAnnouncementTime(announcement.createdAt)}
            </time>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-5 text-foreground">
            {announcement.content}
          </p>
        </div>
      </div>

      {announcement.type === "poll" && (
        <div className="mt-4 space-y-2">
          {announcement.poll.options.map((option) => {
            const percentage =
              announcement.poll.totalVotes > 0
                ? Math.round(
                    (option.votes / announcement.poll.totalVotes) * 100,
                  )
                : 0;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onVote(announcement.id, option.id)}
                disabled={isVoting}
                className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
                  option.selected
                    ? "border-[#2852a4] bg-[#eaf0ff]"
                    : "border-border bg-background"
                } disabled:opacity-70`}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-[#2852a4]/10 transition-[width]"
                  style={{ width: `${percentage}%` }}
                />
                <span className="relative flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                      option.selected
                        ? "border-[#2852a4] bg-[#2852a4] text-white"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {option.selected && <Check size={12} />}
                  </span>
                  <span className="min-w-0 flex-1 text-xs font-medium text-foreground">
                    {option.label}
                  </span>
                  {isVoting ? (
                    <Loader2 size={13} className="animate-spin text-[#2852a4]" />
                  ) : (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {percentage}%
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          <p className="pt-0.5 text-right text-[10px] text-muted-foreground">
            {announcement.poll.totalVotes}{" "}
            {announcement.poll.totalVotes === 1 ? "vote" : "votes"}
          </p>
        </div>
      )}
    </article>
  );
}
