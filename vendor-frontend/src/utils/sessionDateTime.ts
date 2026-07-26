const sessionTimeZone = "Asia/Singapore";

export function formatSessionDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date and time unavailable";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: sessionTimeZone,
  }).format(date);
}
