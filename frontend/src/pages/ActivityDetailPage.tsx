import {
  Calendar,
  ChevronLeft,
  Clock,
  Heart,
  MapPin,
  Share2,
  Star,
  UserCircle,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { createSessionCheckout, fetchActivity } from "../api";
import { ActivityCategoryIndicators } from "../components/ActivityCategoryIndicators";
import { ActivityImageGallery } from "../components/ActivityImageGallery";
import { FriendAvatars } from "../components/FriendAvatars";
import { VendorProfileDialog } from "../components/VendorProfileDialog";
import {
  categoriesForActivity,
  categoryIcon,
  formatActivityDate,
  formatActivityDateTime,
  formatActivityTime,
  formatSgdPrice,
  formatDuration,
  getSessionDurationMinutes,
  primaryActivityCategory,
  vidaCategoryColor,
} from "../lib/activityPresentation";
import type { Activity, ActivitySession } from "../lib/types";
import { useAppState } from "../state";

function getActivityById(
  activities: Activity[],
  activityId: number | null,
): Activity | null {
  if (activityId === null) {
    return null;
  }

  return activities.find((activity) => activity.id === activityId) ?? null;
}

function parseActivityId(activityId: string | undefined): number | null {
  const nextActivityId = Number(activityId);

  return Number.isInteger(nextActivityId) ? nextActivityId : null;
}

function getSessionRouteId(session: ActivitySession) {
  const sessionId = Number(session.id);

  return Number.isInteger(sessionId) ? sessionId : null;
}

function isSameHandle(firstHandle: string, secondHandle: string) {
  return (
    firstHandle.localeCompare(secondHandle, undefined, {
      sensitivity: "accent",
    }) === 0
  );
}

export function ActivityDetailPage() {
  const {
    joinActivity,
    favoriteActivityIds,
    favoriteMutationIds,
    groupChats,
    isLoading,
    premiumActivities,
    profile,
    standardActivities,
    toggleFavoriteActivity,
  } = useAppState();
  const navigate = useNavigate();
  const { activityId } = useParams();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [fallbackActivity, setFallbackActivity] = useState<Activity | null>(
    null,
  );
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [isLoadingFallback, setIsLoadingFallback] = useState(false);
  const [joiningSessionId, setJoiningSessionId] = useState<number | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [imageGalleryOpen, setImageGalleryOpen] = useState(false);
  const activities: Activity[] = [...premiumActivities, ...standardActivities];
  const routeActivityId = parseActivityId(activityId);
  const listedActivity = getActivityById(activities, routeActivityId);
  const activity =
    listedActivity ??
    (fallbackActivity?.id === routeActivityId ? fallbackActivity : null);

  useEffect(() => {
    if (routeActivityId === null || listedActivity) {
      setFallbackActivity(null);
      setFallbackError(null);
      return;
    }

    let ignore = false;

    setIsLoadingFallback(true);
    setFallbackError(null);

    fetchActivity(routeActivityId)
      .then((nextActivity) => {
        if (!ignore) {
          setFallbackActivity(nextActivity);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setFallbackActivity(null);
          setFallbackError(
            error instanceof Error ? error.message : "Activity not found.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingFallback(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [listedActivity, routeActivityId]);

  if (!activity) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex items-center gap-3 px-4 pt-5 pb-3">
          <button
            onClick={() => navigate("/activities")}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Back to activities"
          >
            <ChevronLeft size={17} className="text-foreground" />
          </button>
          <h2 className="text-base font-semibold text-foreground flex-1 truncate">
            Activity
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isLoading || isLoadingFallback
              ? "Loading activity..."
              : fallbackError || "Activity not found."}
          </p>
        </div>
      </div>
    );
  }

  const favorited = favoriteActivityIds.has(activity.id);
  const isFavoriteUpdating = favoriteMutationIds.has(activity.id);
  const cover = activity.imageUrls[0];
  const categories = categoriesForActivity(activity.categories);
  const primaryCategory = primaryActivityCategory(activity.categories);
  const primaryColor = vidaCategoryColor[primaryCategory];
  const joinDisabledReason = activity.joinDisabledReason;
  const openSessions = (activity.sessions ?? []).filter(
    (session) => session.isOpen && session.isActive,
  );
  const hasOpenPremiumSession = openSessions.some(
    (session) => session.isPremium,
  );

  const handleJoinSession = async (session: ActivitySession) => {
    const sessionId = getSessionRouteId(session);
    const sessionGroupId = Number(session.groupId);
    const joinedGroup = Number.isInteger(sessionGroupId)
      ? groupChats.find((group) => group.id === sessionGroupId)
      : undefined;
    const joined =
      Boolean(joinedGroup) ||
      (session.participatingFriends ?? []).some((friend) =>
        isSameHandle(friend.handle, profile.handle),
      );

    setJoinError(null);

    if (joinedGroup) {
      navigate(`/groups/${joinedGroup.id}`);
      return;
    }

    if (joined) {
      setJoinError("This session is already joined, but its group is unavailable.");
      return;
    }

    if (sessionId === null) {
      setJoinError("This session is unavailable.");
      return;
    }

    if (joinDisabledReason) {
      setJoinError(joinDisabledReason);
      return;
    }

    setJoiningSessionId(sessionId);

    try {
      if (Number(session.priceSgd) > 0) {
        const checkout = await createSessionCheckout(sessionId);

        window.location.assign(checkout.checkoutUrl);
        return;
      }

      await joinActivity(sessionId);
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : "Unable to join session.",
      );
    } finally {
      setJoiningSessionId(null);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: activity.title,
      text: `${activity.title}\nHosted by ${activity.vendor?.name ?? activity.host}`,
      url: window.location.href,
    };

    setShareFeedback(null);

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`,
      );
      setShareFeedback("Activity link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareFeedback("Unable to share this activity.");
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button
          onClick={() => navigate("/activities")}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Back to activities"
        >
          <ChevronLeft size={17} className="text-foreground" />
        </button>
        <h2 className="text-base font-semibold text-foreground flex-1 truncate">
          Activity
        </h2>
        <button
          type="button"
          onClick={() => void handleShare()}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Share activity"
        >
          <Share2 size={14} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        {cover ? (
          <div className="relative mx-4 h-52 overflow-hidden rounded-2xl bg-secondary">
            <button
              type="button"
              onClick={() => setImageGalleryOpen(true)}
              className="h-full w-full"
              aria-label={`Open ${activity.title} image gallery`}
            >
              <img
                src={cover}
                alt={activity.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </button>
            {hasOpenPremiumSession && (
              <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm">
                <Star size={10} fill="var(--brand-yellow)" stroke="none" />
                <span className="text-[10px] font-bold text-accent">
                  Premium session available
                </span>
              </div>
            )}
            {activity.imageUrls.length > 1 && (
              <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                1 / {activity.imageUrls.length}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-4 flex h-32 items-center justify-center rounded-2xl bg-secondary">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: `${primaryColor}22`,
                color: primaryColor,
              }}
            >
              {categoryIcon(primaryCategory, 30)}
            </div>
          </div>
        )}

        <div className="px-4 pt-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold leading-tight text-foreground">
                {activity.title}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Hosted by{" "}
                {activity.vendor ? (
                  <button
                    type="button"
                    onClick={() => setVendorDialogOpen(true)}
                    className="font-semibold text-accent"
                  >
                    {activity.vendor.name}
                  </button>
                ) : (
                  activity.host
                )}
              </p>
              <div className="mt-2">
                <ActivityCategoryIndicators
                  categories={categories}
                  variant="pills"
                />
              </div>
              {activity.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {activity.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                void toggleFavoriteActivity(activity.id).catch(() => undefined)
              }
              disabled={isFavoriteUpdating}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
              aria-label={
                favorited
                  ? "Remove from favorited activities"
                  : "Add to favorited activities"
              }
            >
              <Heart
                size={17}
                fill={favorited ? "var(--brand-pink)" : "none"}
                stroke={
                  favorited ? "var(--brand-pink)" : "var(--muted-foreground)"
                }
              />
            </button>
          </div>

          {shareFeedback && (
            <p className="mt-2 text-xs text-muted-foreground" role="status">
              {shareFeedback}
            </p>
          )}

          {activity.vendor && (
            <button
              type="button"
              onClick={() => setVendorDialogOpen(true)}
              className="mt-4 w-full rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-secondary/70"
            >
              <UserCircle size={14} className="mb-2 text-accent" />
              <p className="text-[10px] text-muted-foreground">Vendor</p>
              <p className="text-xs font-semibold text-foreground">
                {activity.vendor.name}
              </p>
            </button>
          )}

          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              About this activity
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              {activity.description?.trim() ||
                "No activity description has been provided."}
            </p>
            {activity.suitability?.trim() && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Suitability
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  {activity.suitability}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-card p-4 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Friends joining
                </p>
                <FriendAvatars friends={activity.participatingFriends} max={5} />
              </div>
              {/*
              <div className="flex items-center gap-1">
                <Star size={12} fill="var(--brand-yellow)" stroke="none" />
                <span className="text-sm font-bold text-foreground">
                  {activity.rating}
                </span>
              </div>
              */}
            </div>
          </div>

          <div className="mt-4 pb-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Available sessions
              </p>
              <span className="text-[11px] text-muted-foreground">
                {openSessions.length} open
              </span>
            </div>

            {joinError && (
              <p className="mb-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {joinError}
              </p>
            )}
            {joinDisabledReason && !joinError && (
              <p className="mb-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
                {joinDisabledReason}
              </p>
            )}

            {openSessions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No open sessions are available right now.
              </div>
            ) : (
              <div className="grid gap-2">
                {openSessions.map((session) => {
                  const sessionId = getSessionRouteId(session);
                  const sessionFriends = session.participatingFriends ?? [];
                  const availableSlots = Math.max(
                    0,
                    Number(session.spots ?? 0) -
                      Number(session.registeredCount ?? 0),
                  );
                  const sessionGroupId = Number(session.groupId);
                  const joined =
                    (Number.isInteger(sessionGroupId) &&
                      groupChats.some((group) => group.id === sessionGroupId)) ||
                    sessionFriends.some((friend) =>
                      isSameHandle(friend.handle, profile.handle),
                    );
                  const isJoining = joiningSessionId === sessionId;
                  const durationMinutes = getSessionDurationMinutes(session);

                  return (
                    <div
                      key={String(session.id)}
                      className="rounded-2xl border border-border bg-card p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="truncate text-sm font-bold text-foreground">
                              {session.title}
                            </h3>
                            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-accent">
                              {formatSgdPrice(session.priceSgd)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                            {formatActivityDateTime(session.startsAt)}
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-accent" />
                              {formatActivityDate(session.startsAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-accent" />
                              {formatActivityTime(session.startsAt)}
                            </span>
                            {durationMinutes !== null && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} className="text-accent" />
                                {formatDuration(durationMinutes)}
                              </span>
                            )}
                            <span className="flex items-center gap-1 truncate">
                              <MapPin size={12} className="text-accent" />
                              <span className="truncate">{session.location}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={12} className="text-accent" />
                              {availableSlots}{" "}
                              {availableSlots === 1 ? "slot" : "slots"} available
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <FriendAvatars friends={sessionFriends} max={4} />
                        <button
                          type="button"
                          onClick={() => handleJoinSession(session)}
                          disabled={
                            isJoining ||
                            Boolean(joinDisabledReason) ||
                            sessionId === null ||
                            (!joined && availableSlots === 0)
                          }
                          className="min-w-28 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-accent-foreground transition-transform active:scale-[0.98] disabled:opacity-70"
                        >
                          {isJoining
                            ? Number(session.priceSgd) > 0
                              ? "Opening payment..."
                              : "Joining..."
                            : joined
                              ? "Open group chat"
                              : availableSlots === 0
                                ? "Full"
                                : Number(session.priceSgd) > 0
                                  ? `Pay ${formatSgdPrice(session.priceSgd)}`
                                  : "Join session"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <VendorProfileDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        vendor={activity.vendor ?? null}
      />
      <ActivityImageGallery
        images={activity.imageUrls}
        title={activity.title}
        open={imageGalleryOpen}
        onOpenChange={setImageGalleryOpen}
      />
    </div>
  );
}
