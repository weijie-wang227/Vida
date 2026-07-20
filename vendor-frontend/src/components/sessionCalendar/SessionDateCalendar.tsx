import { useMemo, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card } from "../Card";
import type { Session } from "../../api/types";
import {
  buildCalendarDays,
  changeMonth,
  dateKey,
  datePartsInSingapore,
  formatSessionTime,
  fullDateLabel,
  getSessionColor,
  getSessionRouteId,
  monthLabel,
  sessionDateKey,
  weekDays,
  type CalendarMonth,
} from "./calendarUtils";

type SessionDateCalendarProps = {
  activityId: number | string;
  sessions: Session[];
  duplicateSource: Session | null;
  duplicateError: string | null;
  isDuplicating: boolean;
  isCreatingSession: boolean;
  onStopDuplicating: () => void;
  onSelectDate: (dateValue: string) => void;
  onSelectSession: (session: Session) => void;
};

export function SessionDateCalendar({
  activityId,
  sessions,
  duplicateSource,
  duplicateError,
  isDuplicating,
  isCreatingSession,
  onStopDuplicating,
  onSelectDate,
  onSelectSession,
}: SessionDateCalendarProps) {
  const todayParts = datePartsInSingapore(new Date());
  const todayKey = dateKey(todayParts.year, todayParts.month, todayParts.day);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>({
    year: todayParts.year,
    month: todayParts.month,
  });
  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  );
  const sessionsByDate = useMemo(() => {
    const grouped = new Map<string, Session[]>();

    sessions
      .slice()
      .sort(
        (first, second) =>
          new Date(first.startsAt).getTime() -
          new Date(second.startsAt).getTime(),
      )
      .forEach((session) => {
        const key = sessionDateKey(session.startsAt);

        if (key) {
          grouped.set(key, [...(grouped.get(key) ?? []), session]);
        }
      });

    return grouped;
  }, [sessions]);

  const goToToday = () => {
    setVisibleMonth({ year: todayParts.year, month: todayParts.month });
  };

  return (
    <Card title="Sessions Calendar" className="session-calendar-card">
      <div className="session-calendar">
        {isDuplicating && (
          <div className="session-calendar__duplicate">
            <span>
              {duplicateSource
                ? "Use the + button on a date to duplicate this session"
                : "Choose a valid session to duplicate"}
            </span>
            <button type="button" onClick={onStopDuplicating}>
              Stop duplicating
            </button>
          </div>
        )}
        {duplicateError && (
          <p className="form-error session-calendar__error">{duplicateError}</p>
        )}

        <div className="session-calendar__header">
          <div>
            <strong>{monthLabel(visibleMonth)}</strong>
            <span>
              View sessions or use + to add one for activity #{activityId}.
            </span>
          </div>
          <div className="session-calendar__controls">
            <button type="button" onClick={goToToday}>
              Today
            </button>
            <div>
              <button
                type="button"
                onClick={() => setVisibleMonth((current) => changeMonth(current, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={() => setVisibleMonth((current) => changeMonth(current, 1))}
                aria-label="Next month"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="session-calendar__weekdays">
          {weekDays.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="session-calendar__grid">
          {calendarDays.map((day) => {
            const sessionsForDate = sessionsByDate.get(day.key) ?? [];

            return (
              <div
                key={day.key}
                className={`session-calendar__day${
                  day.inMonth ? "" : " session-calendar__day--muted"
                }${day.key === todayKey ? " session-calendar__day--today" : ""}${
                  sessionsForDate.length > 0
                    ? " session-calendar__day--has-session"
                    : ""
                }`}
              >
                <div className="session-calendar__day-header">
                  <span>{day.day}</span>
                  <button
                    type="button"
                    className="session-calendar__add"
                    disabled={isCreatingSession}
                    onClick={() => onSelectDate(day.key)}
                    aria-label={`${
                      isDuplicating ? "Duplicate session on" : "Create session on"
                    } ${fullDateLabel(day.key)}`}
                    title={isDuplicating ? "Duplicate session" : "Create session"}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <div className="session-calendar__events">
                  {sessionsForDate.slice(0, 3).map((session) => {
                    const color = getSessionColor(session);

                    return (
                      <button
                        key={String(getSessionRouteId(session))}
                        type="button"
                        className={`session-calendar__event${
                          session.isOpen ? "" : " session-calendar__event--closed"
                        }`}
                        style={{ "--event-color": color } as CSSProperties}
                        onClick={() => onSelectSession(session)}
                        aria-label={`Open ${session.title} at ${formatSessionTime(
                          session.startsAt,
                        )}`}
                      >
                        <strong>{formatSessionTime(session.startsAt)}</strong>
                        <span>{session.title}</span>
                      </button>
                    );
                  })}
                  {sessionsForDate.length > 3 && (
                    <span className="session-calendar__more">
                      +{sessionsForDate.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
