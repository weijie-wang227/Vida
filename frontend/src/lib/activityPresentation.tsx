import {
  Activity as ActivityIcon,
  Brain,
  Lightbulb,
  Users,
} from "lucide-react";
import type { vidaCategory } from "./types";

export const vidaCategories: vidaCategory[] = [
  "physical",
  "social",
  "cognitive",
  "creative",
];

export const vidaCategoryColor: Record<vidaCategory, string> = {
  physical: "#4bd178",
  social: "#f4b950",
  cognitive: "#dc4aa7",
  creative: "#6577ff",
};

export const vidaCategoryLabel: Record<vidaCategory, string> = {
  physical: "Physical",
  social: "Social",
  cognitive: "Cognitive",
  creative: "Creative",
};
const activityTimeZone = "Asia/Singapore";

export function categoryIcon(category: vidaCategory, size = 14) {
  const iconProps = { size, strokeWidth: 2 };

  switch (category) {
    case "physical":
      return <ActivityIcon {...iconProps} />;
    case "social":
      return <Users {...iconProps} />;
    case "cognitive":
      return <Lightbulb {...iconProps} />;
    case "creative":
      return <Brain {...iconProps} />;
    default:
      return <Users {...iconProps} />;
  }
}

export function categoriesForActivity(categories: vidaCategory[] | undefined) {
  return categories?.length ? categories : ["social"];
}

export function primaryActivityCategory(
  categories: vidaCategory[] | undefined,
) {
  return categoriesForActivity(categories)[0] ?? "social";
}

export function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

export function formatCredits(credits: number) {
  return `${credits} credits`;
}

function getActivityDate(startsAt: string) {
  const date = new Date(startsAt);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function formatActivityDate(startsAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: activityTimeZone,
  }).format(getActivityDate(startsAt));
}

export function formatActivityTime(startsAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: activityTimeZone,
  }).format(getActivityDate(startsAt));
}
