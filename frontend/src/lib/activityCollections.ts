export type ActivityCollectionId =
  | "free"
  | "premium"
  | "skillsfuture"
  | "volunteer"
  | "aac";

export type ActivityCollection = {
  id: ActivityCollectionId;
  title: string;
  emptyMessage: string;
  previewText: string;
  accent: string;
};

export const activityCollections: ActivityCollection[] = [
  {
    id: "free",
    title: "Free Activities",
    emptyMessage: "No free activities are available right now.",
    previewText: "No-cost picks",
    accent: "#64b5f6",
  },
  {
    id: "premium",
    title: "Premium Activities",
    emptyMessage: "No premium activities are available right now.",
    previewText: "Curated experiences",
    accent: "#f4b950",
  },
  {
    id: "skillsfuture",
    title: "SkillsFuture Payable",
    emptyMessage: "No SkillsFuture payable activities are available right now.",
    previewText: "Eligible courses",
    accent: "#53c69b",
  },
  {
    id: "volunteer",
    title: "Volunteer Activities",
    emptyMessage: "No volunteer activities are available right now.",
    previewText: "Give back",
    accent: "#e88aa6",
  },
  {
    id: "aac",
    title: "AAC Activities",
    emptyMessage: "No AAC activities are available right now.",
    previewText: "Inclusive activities",
    accent: "#9c8ce8",
  },
];

export function getActivityCollection(value: string | undefined) {
  return activityCollections.find((collection) => collection.id === value);
}
