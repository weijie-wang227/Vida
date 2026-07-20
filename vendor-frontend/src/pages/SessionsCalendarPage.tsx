import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { Session } from "../api/types";
import {
  buildCalendarDays,
  changeMonth,
  dateKey,
  datePartsInSingapore,
  getSessionDetailsPath,
  sessionDateKey,
  SessionsCalendarToolbar,
  SessionsDayAgenda,
  SessionsMonthGrid,
  type CalendarDay,
  type CalendarMonth,
} from "../components/sessionCalendar";

export function SessionsCalendarPage({ sessions }: { sessions: Session[] }) {
  const navigate = useNavigate();
  const todayParts = datePartsInSingapore(new Date());
  const todayKey = dateKey(todayParts.year, todayParts.month, todayParts.day);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>({
    year: todayParts.year,
    month: todayParts.month,
  });
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  );
  const sortedSessions = useMemo(
    () =>
      [...sessions]
        .filter((session) => sessionDateKey(session.startsAt) !== null)
        .sort(
          (first, second) =>
            new Date(first.startsAt).getTime() -
            new Date(second.startsAt).getTime(),
        ),
    [sessions],
  );
  const sessionsByDate = useMemo(() => {
    const grouped = new Map<string, Session[]>();

    sortedSessions.forEach((session) => {
      const key = sessionDateKey(session.startsAt);

      if (key) {
        grouped.set(key, [...(grouped.get(key) ?? []), session]);
      }
    });

    return grouped;
  }, [sortedSessions]);
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
    <div className="vendor-calendar-page">
      <SessionsCalendarToolbar
        visibleMonth={visibleMonth}
        onBack={() => navigate("/activities")}
        onToday={goToToday}
        onMoveMonth={moveMonth}
      />

      <div className="vendor-calendar-layout">
        <SessionsMonthGrid
          visibleMonth={visibleMonth}
          calendarDays={calendarDays}
          sessionsByDate={sessionsByDate}
          selectedKey={selectedKey}
          todayKey={todayKey}
          onSelectDay={selectDay}
        />
        <SessionsDayAgenda
          selectedKey={selectedKey}
          sessions={selectedSessions}
          onSelectSession={(session) =>
            navigate(getSessionDetailsPath(session))
          }
        />
      </div>
    </div>
  );
}
