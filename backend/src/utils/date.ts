export function toIsoString(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));

  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

export function formatSessionDateTime(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));

  if (Number.isNaN(date.getTime())) {
    return "Date and time unavailable";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(date);
}

export function formatSessionChatName(
  activityTitle: unknown,
  startsAt: unknown,
) {
  const title = String(activityTitle ?? "").trim() || "Activity";

  return `${title} • ${formatSessionDateTime(startsAt)}`;
}
