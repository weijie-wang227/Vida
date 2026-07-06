const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;
const weekMs = 7 * dayMs;
const monthMs = 30 * dayMs;
const yearMs = 365 * dayMs;

function pluralize(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

export function formatRelativeTimeFromNow(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const difference = Math.max(0, Date.now() - date.getTime());

  if (difference < hourMs) {
    return "Just now";
  }

  if (difference < dayMs) {
    return pluralize(Math.floor(difference / hourMs), "hour");
  }

  if (difference < weekMs) {
    return pluralize(Math.floor(difference / dayMs), "day");
  }

  if (difference < monthMs) {
    return pluralize(Math.floor(difference / weekMs), "week");
  }

  if (difference < yearMs) {
    return pluralize(Math.floor(difference / monthMs), "month");
  }

  return pluralize(Math.floor(difference / yearMs), "year");
}
