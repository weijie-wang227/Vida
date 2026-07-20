import type { CSSProperties } from "react";
import type { Session } from "../../api/types";
import {
  fullDateLabel,
  getSessionColor,
  getSessionRouteId,
  formatSessionTime,
  monthLabel,
  weekDays,
  type CalendarDay,
  type CalendarMonth,
} from "./calendarUtils";

type SessionsMonthGridProps = {
  visibleMonth: CalendarMonth;
  calendarDays: CalendarDay[];
  sessionsByDate: Map<string, Session[]>;
  selectedKey: string;
  todayKey: string;
  onSelectDay: (day: CalendarDay) => void;
};

export function SessionsMonthGrid({
  visibleMonth,
  calendarDays,
  sessionsByDate,
  selectedKey,
  todayKey,
  onSelectDay,
}: SessionsMonthGridProps) {
  return (
    <section className="vendor-calendar-panel" aria-label={monthLabel(visibleMonth)}>
      <div className="vendor-calendar-weekdays">
        {weekDays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="vendor-calendar-grid">
        {calendarDays.map((day) => {
          const daySessions = sessionsByDate.get(day.key) ?? [];
          const selected = selectedKey === day.key;
          const isToday = todayKey === day.key;

          return (
            <button
              key={day.key}
              type="button"
              className={`vendor-calendar-day${
                day.inMonth ? "" : " vendor-calendar-day--muted"
              }${selected ? " vendor-calendar-day--selected" : ""}`}
              onClick={() => onSelectDay(day)}
              aria-label={`${fullDateLabel(day.key)}, ${daySessions.length} sessions`}
              aria-pressed={selected}
            >
              <span className={isToday ? "vendor-calendar-day__number--today" : ""}>
                {day.day}
              </span>
              <div className="vendor-calendar-day__sessions">
                {daySessions.slice(0, 3).map((session) => {
                  const color = getSessionColor(session);

                  return (
                    <span
                      key={String(getSessionRouteId(session))}
                      className={`vendor-calendar-event${
                        session.isOpen ? "" : " vendor-calendar-event--closed"
                      }`}
                      style={{ "--event-color": color } as CSSProperties}
                    >
                      <strong>{formatSessionTime(session.startsAt)}</strong>
                      <em>{session.title}</em>
                    </span>
                  );
                })}
                {daySessions.length > 3 && (
                  <span className="vendor-calendar-day__more">
                    +{daySessions.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
