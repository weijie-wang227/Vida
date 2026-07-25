export const activityCollectionTypes = [
  "free",
  "premium",
  "skillsfuture",
  "volunteer",
  "aac",
] as const;

export type ActivityCollectionType = (typeof activityCollectionTypes)[number];

export function isActivityCollectionType(
  value: string,
): value is ActivityCollectionType {
  return (activityCollectionTypes as readonly string[]).includes(value);
}

export function getActivityCollectionFilters(collection: ActivityCollectionType) {
  switch (collection) {
    case "free":
      return { isPremium: false, credits: 0 };
    case "premium":
      return { isPremium: true };
    case "skillsfuture":
      return { skillsFuturePayable: true };
    case "volunteer":
      return { isVolunteer: true };
    case "aac":
      return { isAAC: true };
  }
}
