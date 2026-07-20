import type { CSSProperties } from "react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Users,
} from "lucide-react";
import type { Session } from "../../api/types";
import {
  formatSessionTime,
  fullDateLabel,
  getSessionColor,
  getSessionRouteId,
} from "./calendarUtils";

type SessionsDayAgendaProps = {
  selectedKey: string;
  sessions: Session[];
  onSelectSession: (session: Session) => void;
};

export function SessionsDayAgenda({
  selectedKey,
  sessions,
  onSelectSession,
}: SessionsDayAgendaProps) {
  return (
    <aside className="vendor-calendar-agenda">
      <div className="vendor-calendar-agenda__header">
        <span>Selected day</span>
        <h2>{fullDateLabel(selectedKey)}</h2>
        <p>{sessions.length} {sessions.length === 1 ? "session" : "sessions"}</p>
      </div>

      {sessions.length > 0 ? (
        <div className="vendor-calendar-agenda__list">
          {sessions.map((session) => {
            const color = getSessionColor(session);

            return (
              <button
                key={String(getSessionRouteId(session))}
                type="button"
                className="vendor-calendar-agenda-card"
                onClick={() => onSelectSession(session)}
                style={{ "--event-color": color } as CSSProperties}
              >
                <span className="vendor-calendar-agenda-card__time">
                  {formatSessionTime(session.startsAt)}
                </span>
                <strong>{session.title}</strong>
                <span className="vendor-calendar-agenda-card__meta">
                  <span><MapPin size={13} />{session.location}</span>
                  <span><Users size={13} />{session.registeredCount} / {session.spots}</span>
                  <span><Clock3 size={13} />{session.durationMinutes} min</span>
                </span>
                <span
                  className={`activity-status${
                    session.isOpen ? "" : " activity-status--closed"
                  }`}
                >
                  {session.isOpen ? "Open" : "Closed"}
                </span>
                <ChevronRight
                  size={17}
                  className="vendor-calendar-agenda-card__arrow"
                />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="vendor-calendar-agenda__empty">
          <CalendarDays size={25} />
          <strong>No sessions scheduled</strong>
          <span>Select another day or month to see sessions.</span>
        </div>
      )}
    </aside>
  );
}
