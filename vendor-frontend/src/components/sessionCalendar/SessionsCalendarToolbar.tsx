import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { monthLabel, type CalendarMonth } from "./calendarUtils";

type SessionsCalendarToolbarProps = {
  visibleMonth: CalendarMonth;
  onBack: () => void;
  onToday: () => void;
  onMoveMonth: (amount: number) => void;
};

export function SessionsCalendarToolbar({
  visibleMonth,
  onBack,
  onToday,
  onMoveMonth,
}: SessionsCalendarToolbarProps) {
  return (
    <div className="vendor-calendar-toolbar">
      <div className="vendor-calendar-toolbar__primary">
        <button type="button" className="secondary-action" onClick={onBack}>
          <ArrowLeft size={15} />
          All activities
        </button>
        <div className="vendor-calendar-month">
          <span className="vendor-calendar-month__icon">
            <CalendarDays size={19} />
          </span>
          <div>
            <span>Monthly schedule</span>
            <strong>{monthLabel(visibleMonth)}</strong>
          </div>
        </div>
      </div>

      <div className="vendor-calendar-toolbar__actions">
        <div className="vendor-calendar-legend" aria-label="Session status legend">
          <span>
            <i className="vendor-calendar-legend__dot vendor-calendar-legend__dot--open" />
            Open
          </span>
          <span>
            <i className="vendor-calendar-legend__dot vendor-calendar-legend__dot--closed" />
            Closed
          </span>
        </div>
        <button type="button" className="secondary-action" onClick={onToday}>
          Today
        </button>
        <div className="vendor-calendar-nav">
          <button
            type="button"
            onClick={() => onMoveMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => onMoveMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
