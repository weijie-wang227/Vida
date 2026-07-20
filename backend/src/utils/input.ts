export function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
