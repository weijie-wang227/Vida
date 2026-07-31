import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  formatActivityTime,
  primaryActivityCategory,
  vidaCategoryColor,
} from "../lib/activityPresentation";
import type { Activity, vidaCategory } from "../lib/types";
import { useAppState } from "../state";

const calendarTimeZone = "Asia/Singapore";
const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type CalendarMonth = {
  year: number;
  month: number;
};

type CalendarSession = {
  id: string;
  activityId: number;
  activityTitle: string;
  startsAt: string;
  location: string;
  category: vidaCategory;
  isPremium: boolean;
  isJoined: boolean;
};

type CalendarDay = {
  date: Date;
  key: string;
  day: number;
  inMonth: boolean;
};

function datePartsInSingapore(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: calendarTimeZone,
  }).formatToParts(date);
  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: valueFor("year"),
    month: valueFor("month") - 1,
    day: valueFor("day"),
  };
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function sessionDateKey(startsAt: string) {
  const date = new Date(startsAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = datePartsInSingapore(date);
  return dateKey(parts.year, parts.month, parts.day);
}

function buildCalendarDays({ year, month }: CalendarMonth): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );

    return {
      date,
      key: dateKey(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      inMonth: date.getMonth() === month && date.getFullYear() === year,
    };
  });
}

function changeMonth(current: CalendarMonth, amount: number): CalendarMonth {
  const date = new Date(current.year, current.month + amount, 1);

  return { year: date.getFullYear(), month: date.getMonth() };
}

function monthLabel(month: CalendarMonth) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(month.year, month.month, 1));
}

function selectedDateLabel(key: string) {
  const [year, month, day] = key.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

function toCalendarSessions(
  activities: Activity[],
  profileHandle: string,
): CalendarSession[] {
  return activities
    .flatMap((activity) => {
      const category = primaryActivityCategory(activity.categories);
      const sessions = activity.sessions?.length
        ? activity.sessions
            .filter((session) => session.isActive !== false)
            .map((session) => ({
              id: `${activity.id}-${String(session.id)}`,
              activityId: activity.id,
              activityTitle: activity.title,
              startsAt: session.startsAt,
              location: session.location || activity.location,
              category,
              isPremium: session.isPremium,
              isJoined: (session.participatingFriends ?? []).some(
                (friend) => friend.handle === profileHandle,
              ),
            }))
        : [
            {
              id: String(activity.id),
              activityId: activity.id,
              activityTitle: activity.title,
              startsAt: activity.startsAt,
              location: activity.location,
              category,
              isPremium: false,
              isJoined: activity.participatingFriends.some(
                (friend) => friend.handle === profileHandle,
              ),
            },
          ];

      return sessions;
    })
    .filter((session) => sessionDateKey(session.startsAt) !== null)
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
    );
}

export function ActivityCalendarPage() {
  const navigate = useNavigate();
  const { isLoading, premiumActivities, profile, standardActivities } =
    useAppState();
  const todayParts = datePartsInSingapore(new Date());
  const todayKey = dateKey(todayParts.year, todayParts.month, todayParts.day);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>({
    year: todayParts.year,
    month: todayParts.month,
  });
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [sessionScope, setSessionScope] = useState<"all" | "joined">("all");
  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  );
  const allSessions = useMemo(
    () =>
      toCalendarSessions(
        [...premiumActivities, ...standardActivities],
        profile.handle,
      ),
    [premiumActivities, profile.handle, standardActivities],
  );
  const sessions =
    sessionScope === "joined"
      ? allSessions.filter((session) => session.isJoined)
      : allSessions;
  const sessionsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarSession[]>();

    sessions.forEach((session) => {
      const key = sessionDateKey(session.startsAt);

      if (key) {
        grouped.set(key, [...(grouped.get(key) ?? []), session]);
      }
    });

    return grouped;
  }, [sessions]);
  const selectedSessions = sessionsByDate.get(selectedKey) ?? [];

  const moveMonth = (amount: number) => {
    const nextMonth = changeMonth(visibleMonth, amount);
    setVisibleMonth(nextMonth);
    setSelectedKey(dateKey(nextMonth.year, nextMonth.month, 1));
  };

  const selectDay = (day: CalendarDay) => {
    setSelectedKey(day.key);

    if (!day.inMonth) {
      setVisibleMonth({
        year: day.date.getFullYear(),
        month: day.date.getMonth(),
      });
    }
  };

  const goToToday = () => {
    setVisibleMonth({ year: todayParts.year, month: todayParts.month });
    setSelectedKey(todayKey);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-border px-4 pb-3 pt-5">
        <button
          type="button"
          onClick={() => navigate("/activities")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition-transform active:scale-95"
          aria-label="Back to activities"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground">
            Activity calendar
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Browse all available sessions
          </p>
        </div>
        <button
          type="button"
          onClick={goToToday}
          className="rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
        >
          Today
        </button>
      </header>

      <main className="scrollbar-minimal flex-1 overflow-y-auto">
        <section className="px-3 pb-3 pt-4 sm:px-5">
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <CalendarDays size={17} />
              </span>
              <h2 className="truncate text-base font-bold text-foreground">
                {monthLabel(visibleMonth)}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div
            className="mb-3 grid grid-cols-2 rounded-xl bg-secondary p-1"
            role="group"
            aria-label="Calendar session filter"
          >
            {(
              [
                { id: "all", label: "All sessions" },
                { id: "joined", label: "Your sessions" },
              ] as const
            ).map((option) => {
              const selected = sessionScope === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSessionScope(option.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    selected
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                  aria-pressed={selected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="grid grid-cols-7 border-b border-border bg-secondary/45">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[9px] font-bold tracking-wide text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const daySessions = sessionsByDate.get(day.key) ?? [];
                const selected = day.key === selectedKey;
                const isToday = day.key === todayKey;

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`relative min-h-[76px] border-b border-r border-border p-1 text-left transition-colors sm:min-h-24 sm:p-1.5 ${
                      selected ? "bg-accent/10" : "hover:bg-secondary/40"
                    } ${day.inMonth ? "text-foreground" : "text-muted-foreground/40"}`}
                    aria-label={`${selectedDateLabel(day.key)}, ${daySessions.length} sessions`}
                    aria-pressed={selected}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        isToday
                          ? "bg-accent text-accent-foreground"
                          : selected
                            ? "text-accent"
                            : ""
                      }`}
                    >
                      {day.day}
                    </span>
                    <span className="mt-1 grid gap-0.5">
                      {daySessions.slice(0, 2).map((session) => {
                        const color = vidaCategoryColor[session.category];

                        return (
                          <span
                            key={session.id}
                            className="block truncate rounded px-1 py-0.5 text-[8px] font-bold leading-tight sm:text-[9px]"
                            style={{
                              backgroundColor: `${color}22`,
                              color,
                              borderLeft: `2px solid ${color}`,
                            }}
                          >
                            {session.activityTitle}
                          </span>
                        );
                      })}
                      {daySessions.length > 2 && (
                        <span className="px-1 text-[8px] font-bold text-muted-foreground">
                          +{daySessions.length - 2} more
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-border px-4 pb-8 pt-4 sm:px-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Selected day
              </p>
              <h2 className="mt-0.5 text-sm font-bold text-foreground">
                {selectedDateLabel(selectedKey)}
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {selectedSessions.length} {selectedSessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>

          {selectedSessions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {selectedSessions.map((session) => {
                const color = vidaCategoryColor[session.category];

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => navigate(`/activities/${session.activityId}`)}
                    className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/60 active:scale-[0.99]"
                  >
                    <span
                      className="mt-0.5 h-10 w-1 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-[13px] font-bold text-foreground">
                          {session.activityTitle}
                        </span>
                        {session.isPremium && (
                          <Star
                            size={11}
                            className="mt-0.5 flex-shrink-0 text-accent"
                            fill="currentColor"
                          />
                        )}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock3 size={11} style={{ color }} />
                          {formatActivityTime(session.startsAt)}
                        </span>
                        <span className="flex min-w-0 items-center gap-1">
                          <MapPin size={11} style={{ color }} />
                          <span className="truncate">{session.location}</span>
                        </span>
                      </span>
                    </span>
                    <ChevronRight
                      size={15}
                      className="mt-3 flex-shrink-0 text-muted-foreground"
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-border bg-card/45 px-6 text-center">
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Loading activity sessions…"
                  : sessionScope === "joined"
                    ? "You have no sessions scheduled for this day."
                    : "No sessions scheduled for this day."}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
