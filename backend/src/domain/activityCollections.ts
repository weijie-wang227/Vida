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
        activityFilter: {},
        sessionFilter: {
          isPremium: false,
          skillsFuturePayable: false,
          credits: 0,
        },
      };
    case "premium":
      return { activityFilter: {}, sessionFilter: { isPremium: true } };
    case "skillsfuture":
      return {
        activityFilter: {},
        sessionFilter: { skillsFuturePayable: true },
      };
    case "volunteer":
      return { activityFilter: { isVolunteer: true }, sessionFilter: {} };
    case "aac":
      return { activityFilter: { isAAC: true }, sessionFilter: {} };
  }
}
