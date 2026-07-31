import {
  Activity as ActivityIcon,
  Brain,
  Lightbulb,
  Users,
} from "lucide-react";
import type { Activity, ActivitySession, vidaCategory } from "./types";

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

const defaultActivityCategories: vidaCategory[] = ["social"];
const activityTimeZone = "Asia/Singapore";
const sgdFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

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

export function categoriesForActivity(
  categories: vidaCategory[] | undefined,
): vidaCategory[] {
  return categories?.length ? categories : defaultActivityCategories;
}

export function primaryActivityCategory(
  categories: vidaCategory[] | undefined,
): vidaCategory {
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

export function formatSgdPrice(priceSgd: number) {
  const resolvedPrice = Number(priceSgd);

  return Number.isFinite(resolvedPrice) && resolvedPrice > 0
    ? sgdFormatter.format(resolvedPrice)
    : "Free";
}

function activeSessions(activity: Activity) {
  return (activity.sessions ?? []).filter(
    (session) => session.isActive !== false,
  );
}

export function hasPremiumSession(activity: Activity) {
  return activeSessions(activity).some((session) => session.isPremium);
}

export function formatActivitySessionPrice(activity: Activity) {
  const prices = activeSessions(activity).map(
    (session) => Number(session.priceSgd) || 0,
  );

  if (prices.length === 0 || prices.every((price) => price <= 0)) {
    return "Free";
  }

  const paidPrices = prices.filter((price) => price > 0);
  const minimumPaidPrice = Math.min(...paidPrices);
  const maximumPaidPrice = Math.max(...paidPrices);

  if (prices.some((price) => price <= 0)) {
    return `Free or ${formatSgdPrice(minimumPaidPrice)}`;
  }

  if (minimumPaidPrice === maximumPaidPrice) {
    return formatSgdPrice(minimumPaidPrice);
  }

  return `From ${formatSgdPrice(minimumPaidPrice)}`;
}

export function getSessionDurationMinutes(session: ActivitySession) {
  const startsAt = new Date(session.startsAt).getTime();
  const endAt = new Date(session.endAt).getTime();

  if (!Number.isFinite(startsAt) || !Number.isFinite(endAt) || endAt <= startsAt) {
    return null;
  }

  return Math.round((endAt - startsAt) / 60_000);
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

export function formatActivityDateTime(startsAt: string) {
  return `${formatActivityDate(startsAt)}, ${formatActivityTime(startsAt)}`;
}
