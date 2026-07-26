import { Clock, Heart, MapPin, Star } from "lucide-react";
import { ActivityCategoryIndicators } from "./ActivityCategoryIndicators";
import { FriendAvatars } from "./FriendAvatars";
import {
  categoriesForActivity,
  categoryIcon,
  formatActivityDate,
  formatActivityTime,
  formatCredits,
  primaryActivityCategory,
  vidaCategoryColor,
} from "../lib/activityPresentation";
import type { Activity } from "../lib/types";
import { useAppState } from "../state";

export function PremiumCard({ activity }: { activity: Activity }) {
  const { likedActivityIds, openActivity, toggleActivityLike } = useAppState();
  const liked = Boolean(likedActivityIds[activity.id]);
  const categories = categoriesForActivity(activity.categories);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openActivity(activity.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openActivity(activity.id);
        }
      }}
      className="relative rounded-2xl overflow-hidden flex-shrink-0 w-64 text-left active:scale-[0.98] transition-transform"
      style={{
        boxShadow:
          "0 0 0 1.5px var(--brand-yellow), 0 8px 28px rgba(244,185,80,0.2)",
      }}
      aria-label={`Open ${activity.title}`}
    >
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
        <Star size={9} fill="var(--brand-yellow)" stroke="none" />
        <span
          className="text-[9px] font-bold tracking-wide"
          style={{ color: "var(--brand-yellow)" }}
        >
          PREMIUM
        </span>
      </div>
      <button
        onClick={(event) => {
          event.stopPropagation();
          toggleActivityLike(activity.id);
        }}
        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
        aria-label={liked ? "Unlike activity" : "Like activity"}
      >
        <Heart
          size={12}
          fill={liked ? "var(--brand-pink)" : "none"}
          stroke={liked ? "var(--brand-pink)" : "var(--foreground)"}
        />
      </button>
      <div className="relative h-32 bg-secondary overflow-hidden">
        <img
          src={activity.imageUrls[0] ?? ""}
          alt={activity.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="bg-card p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-[13px] text-foreground leading-tight">
            {activity.title}
          </h3>
          <span className="text-xs font-bold text-accent flex-shrink-0">
            {formatCredits(activity.credits)}
          </span>
        </div>
        <div className="flex items-center gap-1 mb-1.5">
          <MapPin size={9} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground truncate">
            {activity.location}
          </span>
        </div>
        <div className="mb-2">
          <ActivityCategoryIndicators
            categories={categories}
            durationMinutes={activity.durationMinutes}
          />
        </div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <Clock size={9} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {formatActivityDate(activity.startsAt)} /{" "}
              {formatActivityTime(activity.startsAt)}
            </span>
          </div>
          {/*
          <div className="flex items-center gap-0.5">
            <Star size={9} fill="var(--brand-yellow)" stroke="none" />
            <span className="text-[10px] text-foreground font-medium">
              {activity.rating}
            </span>
          </div>
          */}
        </div>
        <div className="flex gap-1 mb-1">
          {activity.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] bg-secondary text-muted-foreground rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
        <FriendAvatars friends={activity.participatingFriends} />
      </div>
    </div>
  );
}

export function StandardRow({ activity }: { activity: Activity }) {
  const { openActivity } = useAppState();
  const categories = categoriesForActivity(activity.categories);
  const primaryCategory = primaryActivityCategory(activity.categories);
  const primaryColor = vidaCategoryColor[primaryCategory];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openActivity(activity.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openActivity(activity.id);
        }
      }}
      className="w-full py-3 border-b border-border last:border-0 text-left active:bg-secondary/40 transition-colors"
      aria-label={`Open ${activity.title}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${primaryColor}22`,
            color: primaryColor,
          }}
        >
          {categoryIcon(primaryCategory, 18)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground truncate pr-2">
              {activity.title}
            </p>
            <span className="text-xs text-accent font-bold flex-shrink-0">
              {formatCredits(activity.credits)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground truncate">
              {activity.location}
            </span>
            <span className="text-muted-foreground opacity-40">/</span>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {formatActivityTime(activity.startsAt)}
            </span>
          </div>
          <div className="mt-1">
            <ActivityCategoryIndicators
              categories={categories}
              durationMinutes={activity.durationMinutes}
            />
          </div>
          {activity.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {activity.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2 py-0.5 text-[9px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {/*
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Star size={9} fill="var(--brand-yellow)" stroke="none" />
          <span className="text-[10px] text-muted-foreground">
            {activity.rating}
          </span>
        </div>
        */}
      </div>
      <div style={{ paddingLeft: 52 }}>
        <FriendAvatars friends={activity.participatingFriends} max={4} />
      </div>
    </div>
  );
}
