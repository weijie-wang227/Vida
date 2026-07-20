export function toIsoString(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));

  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}
