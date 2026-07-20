import type { Session, VidaCategory } from "../../api/types";

export const calendarTimeZone = "Asia/Singapore";
export const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const categoryColors: Record<VidaCategory, string> = {
  physical: "#4bd178",
  social: "#e8a82f",
  cognitive: "#dc4aa7",
  creative: "#6577ff",
};

export type CalendarMonth = {
  year: number;
  month: number;
};

export type CalendarDay = {
  date: Date;
  key: string;
  day: number;
  inMonth: boolean;
};

export function datePartsInSingapore(date: Date) {
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

export function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatCalendarDate(date: Date) {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function sessionDateKey(startsAt: string) {
  const date = new Date(startsAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = datePartsInSingapore(date);
  return dateKey(parts.year, parts.month, parts.day);
}

export function buildCalendarDays({ year, month }: CalendarMonth): CalendarDay[] {
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

export function changeMonth(current: CalendarMonth, amount: number): CalendarMonth {
  const date = new Date(current.year, current.month + amount, 1);

  return { year: date.getFullYear(), month: date.getMonth() };
}

export function monthLabel(month: CalendarMonth) {
  return new Intl.DateTimeFormat("en-SG", {
    month: "long",
    year: "numeric",
  }).format(new Date(month.year, month.month, 1));
}

export function fullDateLabel(key: string) {
  const [year, month, day] = key.split("-").map(Number);

  return new Intl.DateTimeFormat("en-SG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatSessionTime(startsAt: string) {
  const date = new Date(startsAt);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: calendarTimeZone,
  }).format(date);
}

export function getSessionColor(session: Session) {
  const category = session.activity?.categories?.[0] ?? null;

  return category ? categoryColors[category] : "#6577ff";
}

export function getSessionRouteId(session: Session) {
  return session.mockId ?? session.id ?? session.objectId;
}

export function getSessionDetailsPath(session: Session) {
  const activityId =
    session.activity?.mockId ??
    session.activityMockId ??
    session.activity?.id ??
    session.activityId;

  return `/activities/${String(activityId)}/sessions/${String(getSessionRouteId(session))}`;
}
