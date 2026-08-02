import { Clock3, Heart, MapPin, Mountain, Star } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  getReturnPath,
  type SignInLocationState,
} from "./SignInRequired";
import {
  formatActivityDate,
  formatActivityTime,
  formatActivitySessionPrice,
} from "../lib/activityPresentation";
import type { Activity } from "../lib/types";
import { useAppState } from "../state";

function ActivityImage({
  activity,
  className,
}: {
  activity: Activity;
  className: string;
}) {
  const cover = activity.imageUrls[0];

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#dbe7ff] to-[#b7c9f2] ${className}`}
    >
      {cover ? (
        <img
          src={cover}
          alt={activity.title}
          className="h-full w-full object-cover"
        />
      ) : (
        <Mountain size={34} className="text-[#2852a4]/75" />
      )}
    </div>
  );
}

function FavoriteButton({
  activity,
  className = "",
  onChanged,
}: {
  activity: Activity;
  className?: string;
  onChanged?: (favorited: boolean) => void;
}) {
  const {
    favoriteActivityIds,
    favoriteMutationIds,
    isAuthenticated,
    toggleFavoriteActivity,
  } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const favorited = favoriteActivityIds.has(activity.id);
  const updating = favoriteMutationIds.has(activity.id);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();

        if (!isAuthenticated) {
          navigate("/signin", {
            state: {
              returnTo: getReturnPath(location),
            } satisfies SignInLocationState,
          });
          return;
        }

        void toggleFavoriteActivity(activity.id)
          .then(() => onChanged?.(!favorited))
          .catch(() => undefined);
      }}
      disabled={updating}
      className={`flex items-center justify-center rounded-full transition active:scale-90 disabled:opacity-50 ${className}`}
      aria-label={
        favorited
          ? `Remove ${activity.title} from favorites`
          : `Add ${activity.title} to favorites`
      }
    >
      <Heart
        size={19}
        fill={favorited ? "#e24d6a" : "none"}
        stroke={favorited ? "#e24d6a" : "#2852a4"}
      />
    </button>
  );
}

function ActivityMeta({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: ReactNode;
}) {
  return (
    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      <Icon size={13} className="flex-shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

export function PremiumCard({ activity }: { activity: Activity }) {
  const { openActivity } = useAppState();

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
      className="w-[236px] flex-shrink-0 overflow-hidden rounded-[20px] border border-border bg-card text-left shadow-sm transition active:scale-[0.98]"
      aria-label={`Open ${activity.title}`}
    >
      <ActivityImage activity={activity} className="h-[142px] w-full" />
      <div className="px-3.5 py-3">
        <h3 className="line-clamp-2 text-base font-bold leading-5 text-foreground">
          {activity.title}
        </h3>
        <ActivityMeta icon={MapPin}>
          {activity.location || "Location to be confirmed"}
        </ActivityMeta>
        <ActivityMeta icon={Clock3}>
          {formatActivityDate(activity.startsAt)} ·{" "}
          {formatActivityTime(activity.startsAt)}
        </ActivityMeta>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#fff4d8] px-2 py-1 text-[11px] font-bold text-[#9a6500]">
            <Star size={11} fill="currentColor" />
            Premium
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-xs font-bold text-accent">
            {formatActivitySessionPrice(activity)}
          </span>
          <FavoriteButton activity={activity} className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}

export function StandardRow({
  activity,
  onFavoriteChanged,
}: {
  activity: Activity;
  onFavoriteChanged?: (favorited: boolean) => void;
}) {
  const { openActivity } = useAppState();

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
      className="mx-[18px] my-1.5 flex items-center rounded-[18px] border border-border bg-card p-2.5 text-left shadow-sm transition active:scale-[0.99]"
      aria-label={`Open ${activity.title}`}
    >
      <ActivityImage
        activity={activity}
        className="h-[94px] w-[94px] flex-shrink-0 rounded-[14px]"
      />
      <div className="min-w-0 flex-1 pl-3">
        <h3 className="line-clamp-2 text-base font-bold leading-5 text-foreground">
          {activity.title}
        </h3>
        <ActivityMeta icon={MapPin}>
          {activity.location || "Location to be confirmed"}
        </ActivityMeta>
        <ActivityMeta icon={Clock3}>
          {formatActivityDate(activity.startsAt)} ·{" "}
          {formatActivityTime(activity.startsAt)}
        </ActivityMeta>
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          {activity.tags[0] && (
            <span className="max-w-[120px] truncate rounded-lg bg-[#eaf0ff] px-2 py-1 text-[10px] font-semibold text-[#2852a4]">
              {activity.tags[0]}
            </span>
          )}
          <span className="ml-auto flex-shrink-0 text-[11px] font-bold text-accent">
            {formatActivitySessionPrice(activity)}
          </span>
        </div>
      </div>
      <FavoriteButton
        activity={activity}
        className="ml-1 h-10 w-10 flex-shrink-0"
        onChanged={onFavoriteChanged}
      />
    </div>
  );
}
