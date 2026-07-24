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
      return {
        sessionFilter: { isPremium: false, credits: 0 },
        activityFilter: {},
      };
    case "premium":
      return {
        sessionFilter: { isPremium: true },
        activityFilter: {},
      };
    case "skillsfuture":
      return {
        sessionFilter: { skillsFuturePayable: true },
        activityFilter: {},
      };
    case "volunteer":
      return {
        sessionFilter: {},
        activityFilter: { isVolunteer: true },
      };
    case "aac":
      return {
        sessionFilter: {},
        activityFilter: { isAAC: true },
      };
  }
}
