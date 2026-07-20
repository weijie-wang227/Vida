export type AnyDoc = Record<string, any>;

export function asObject<T extends AnyDoc>(doc: T | null | undefined): T {
  if (!doc) {
    return {} as T;
  }

  return typeof doc.toObject === "function" ? doc.toObject() : doc;
}
