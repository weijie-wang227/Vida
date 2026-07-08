import { lazy, Suspense, useRef, useState } from "react";
import type { TouchEvent } from "react";
import {
  CalendarCheck,
  ChevronDown,
  Clock3,
  Coins,
  Filter,
  GraduationCap,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Plus,
  Star,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../app/components/ui/sheet";
import { BaseSearchBar } from "../components/BaseSearchBar";
import { PremiumCard, StandardRow } from "../components/ActivityCards";
import { FloatingActionButton } from "../components/FloatingActionButton";
import {
  categoryIcon,
  formatActivityDate,
  formatActivityTime,
  vidaCategories,
  vidaCategoryColor,
  vidaCategoryLabel,
} from "../lib/activityPresentation";
import type { Activity, vidaCategory } from "../lib/types";
import { useAppState } from "../state";

const ActivityMap = lazy(() =>
  import("../components/ActivityMap").then((module) => ({
    default: module.ActivityMap,
  })),
);
const CreateActivityModal = lazy(() =>
  import("../components/CreateActivityModal").then((module) => ({
    default: module.CreateActivityModal,
  })),
);
const userLocation = { latitude: 1.321, longitude: 103.845 };
type ActivityRank = "earliest" | "proximity" | "price";
type PaymentFilter = "free" | "premium" | "skillsfuture";

const rankOptions: {
  id: ActivityRank;
  label: string;
  description: string;
  Icon: typeof Clock3;
}[] = [
  {
    id: "earliest",
    label: "Earliest time",
    description: "Soonest activities first",
    Icon: Clock3,
  },
  {
    id: "proximity",
    label: "Proximity",
    description: "Closest activities first",
    Icon: MapPin,
  },
  {
    id: "price",
    label: "Price",
    description: "Lowest credits first",
    Icon: Coins,
  },
];

const paymentFilterOptions: {
  id: PaymentFilter;
  label: string;
  Icon: typeof Coins;
}[] = [
  {
    id: "free",
    label: "Free",
    Icon: Coins,
  },
  {
    id: "premium",
    label: "Premium",
    Icon: Star,
  },
  {
    id: "skillsfuture",
    label: "SkillsFuture",
    Icon: GraduationCap,
  },
];

function searchableActivityText(activity: Activity) {
  return [
    activity.title,
    activity.host,
    activity.startsAt,
    formatActivityDate(activity.startsAt),
    formatActivityTime(activity.startsAt),
    activity.location,
    String(activity.credits),
    // activity.rating,
    activity.categories.join(" "),
    activity.tags.join(" "),
    activity.skillsFuturePayable ? "skillsfuture skills future payable" : "",
    activity.joiningFriends
      .map((friend) => `${friend.name} ${friend.handle}`)
      .join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function getActivityStartTime(activity: Activity) {
  const time = new Date(activity.startsAt).getTime();

  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function getDistanceScore(
  activity: Activity,
  activityCoordinates: Map<number, { latitude: number; longitude: number }>,
) {
  const coordinates = activityCoordinates.get(activity.id);

  if (!coordinates) {
    return Number.POSITIVE_INFINITY;
  }

  const latitudeDistance = coordinates.latitude - userLocation.latitude;
  const longitudeDistance = coordinates.longitude - userLocation.longitude;

  return latitudeDistance * latitudeDistance + longitudeDistance * longitudeDistance;
}

function sortActivities(
  activities: Activity[],
  rankBy: ActivityRank,
  activityCoordinates: Map<number, { latitude: number; longitude: number }>,
) {
  return [...activities].sort((firstActivity, secondActivity) => {
    if (rankBy === "proximity") {
      const distanceDifference =
        getDistanceScore(firstActivity, activityCoordinates) -
        getDistanceScore(secondActivity, activityCoordinates);

      if (distanceDifference !== 0) {
        return distanceDifference;
      }
    }

    if (rankBy === "price") {
      const priceDifference = firstActivity.credits - secondActivity.credits;

      if (priceDifference !== 0) {
        return priceDifference;
      }
    }

    const timeDifference =
      getActivityStartTime(firstActivity) - getActivityStartTime(secondActivity);

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return firstActivity.title.localeCompare(secondActivity.title);
  });
}

export function ActivitiesPage() {
  const {
    joinedActivityIds,
    mapPins,
    premiumActivities,
    profile,
    setShowMap,
    showMap,
    standardActivities,
  } = useAppState();
  const startY = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [createActivityOpen, setCreateActivityOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<vidaCategory[]>(
    [],
  );
  const [rankBy, setRankBy] = useState<ActivityRank>("earliest");
  const [showAllUpcomingActivities, setShowAllUpcomingActivities] =
    useState(false);
  const activeSearchQuery = debouncedSearchQuery.toLowerCase();
  const activityCoordinates = new Map(
    mapPins.map((pin) => [
      pin.activityId,
      { latitude: pin.latitude, longitude: pin.longitude },
    ]),
  );
  const activityMatchesSearch = (activity: Activity) =>
    searchableActivityText(activity).includes(activeSearchQuery);
  const activityMatchesCategories = (activity: Activity) =>
    selectedCategories.length === 0 ||
    activity.categories.some((category) => selectedCategories.includes(category));
  const activityMatchesPaymentFilter = (activity: Activity) => {
    if (paymentFilter === "free") {
      return !activity.isPremium && activity.credits === 0;
    }

    if (paymentFilter === "premium") {
      return activity.isPremium;
    }

    if (paymentFilter === "skillsfuture") {
      return activity.skillsFuturePayable;
    }

    return true;
  };
  const activityMatchesFilters = (activity: Activity) =>
    (!activeSearchQuery || activityMatchesSearch(activity)) &&
    activityMatchesCategories(activity) &&
    activityMatchesPaymentFilter(activity);
  const filteredPremiumActivities = sortActivities(
    premiumActivities.filter(activityMatchesFilters),
    rankBy,
    activityCoordinates,
  );
  const filteredStandardActivities = sortActivities(
    standardActivities.filter(activityMatchesFilters),
    rankBy,
    activityCoordinates,
  );
  const filteredActivities = [
    ...filteredPremiumActivities,
    ...filteredStandardActivities,
  ];
  const activeFilterCount =
    selectedCategories.length +
    (rankBy === "earliest" ? 0 : 1) +
    (paymentFilter ? 1 : 0);
  const hasActiveFilters =
    selectedCategories.length > 0 || rankBy !== "earliest" || Boolean(paymentFilter);
  const joinedActivityOrder = new Map(
    joinedActivityIds.map((activityId, index) => [activityId, index]),
  );
  const upcomingActivities = filteredActivities
    .filter((activity) =>
      activity.joiningFriends.some((friend) => friend.handle === profile.handle),
    )
    .sort((firstActivity, secondActivity) => {
      const firstOrder =
        joinedActivityOrder.get(firstActivity.id) ?? Number.POSITIVE_INFINITY;
      const secondOrder =
        joinedActivityOrder.get(secondActivity.id) ?? Number.POSITIVE_INFINITY;

      if (firstOrder === secondOrder) {
        return 0;
      }

      return firstOrder - secondOrder;
    });
  const visibleUpcomingActivities = showAllUpcomingActivities
    ? upcomingActivities
    : upcomingActivities.slice(0, 3);
  const canExpandUpcomingActivities = upcomingActivities.length > 3;
  const hasSearchResults =
    filteredPremiumActivities.length > 0 || filteredStandardActivities.length > 0;

  const handleToggleCategory = (category: vidaCategory) => {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        return current.filter((item) => item !== category);
      }

      return [...current, category];
    });
  };

  const handleResetFilters = () => {
    setPaymentFilter(null);
    setSelectedCategories([]);
    setRankBy("earliest");
  };

  const handleTogglePaymentFilter = (filter: PaymentFilter) => {
    setPaymentFilter((current) => (current === filter ? null : filter));
  };

  const handleTouchStart = (event: TouchEvent) => {
    startY.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (startY.current === null) {
      return;
    }

    if (startY.current - event.changedTouches[0].clientY < -50) {
      setShowMap(true);
    }

    startY.current = null;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Activities</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Singapore</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMap(!showMap)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              showMap
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
            aria-label={showMap ? "Show activity list" : "Show map"}
          >
            <Navigation size={15} />
          </button>
          <button
            onClick={() => setFiltersOpen(true)}
            className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              hasActiveFilters
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
            aria-label="Filter activities"
          >
            <Filter size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {!showMap && (
        <div className="px-4 pb-3">
          <BaseSearchBar
            value={searchQuery}
            onValueChange={setSearchQuery}
            onDebouncedQueryChange={setDebouncedSearchQuery}
            inputRef={searchInputRef}
            placeholder="Search activities"
            ariaLabel="Search activities"
            showIcon={false}
            clearable
            clearAriaLabel="Clear activity search"
          />
          <div className="mt-3 grid grid-cols-3 gap-3">
            {paymentFilterOptions.map(({ id, label, Icon }) => {
              const selected = paymentFilter === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTogglePaymentFilter(id)}
                  className="flex min-w-0 flex-col items-center gap-1.5 text-center transition-colors"
                  aria-pressed={selected}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
                      selected
                        ? "border-accent bg-accent text-accent-foreground shadow-sm"
                        : "border-border bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span
                    className={`max-w-full truncate text-[11px] font-bold ${
                      selected ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!showMap && (
        <button
          onClick={() => setShowMap(true)}
          className="flex flex-col items-center gap-0.5 pb-1 opacity-40"
        >
          <span className="text-[10px] text-muted-foreground">
            Pull for map
          </span>
          <ChevronDown size={11} className="text-muted-foreground" />
        </button>
      )}

      {showMap ? (
        <div
          className="flex-1 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Suspense fallback={null}>
            <ActivityMap onClose={() => setShowMap(false)} />
          </Suspense>
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto scrollbar-minimal"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {filteredPremiumActivities.length > 0 && (
            <>
              <div className="px-4 mb-2">
                <div className="flex items-center gap-2">
                  <Star size={11} fill="var(--brand-yellow)" stroke="none" />
                  <span
                    className="text-[11px] font-bold tracking-wider"
                    style={{ color: "var(--brand-yellow)" }}
                  >
                    PREMIUM EXPERIENCES
                  </span>
                </div>
              </div>
              <div className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-minimal">
                {filteredPremiumActivities.map((activity) => (
                  <PremiumCard key={activity.id} activity={activity} />
                ))}
              </div>
            </>
          )}
          {upcomingActivities.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarCheck size={12} className="text-accent" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Upcoming Activities
                </span>
                <div className="flex-1 h-px bg-border" />
                {canExpandUpcomingActivities && (
                  <button
                    onClick={() =>
                      setShowAllUpcomingActivities((current) => !current)
                    }
                    className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={
                      showAllUpcomingActivities
                        ? "Show fewer upcoming activities"
                        : "Show all upcoming activities"
                    }
                  >
                    {showAllUpcomingActivities ? (
                      <Minimize2 size={13} />
                    ) : (
                      <Maximize2 size={13} />
                    )}
                  </button>
                )}
              </div>
              {visibleUpcomingActivities.map((activity) => (
                <StandardRow key={activity.id} activity={activity} />
              ))}
            </div>
          )}
          {filteredStandardActivities.length > 0 && (
            <div className="px-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  All Activities
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {filteredStandardActivities.map((activity) => (
                <StandardRow key={activity.id} activity={activity} />
              ))}
            </div>
          )}
          {(activeSearchQuery || hasActiveFilters) && !hasSearchResults && (
            <div className="flex min-h-40 items-center justify-center px-8 text-center">
              <p className="text-sm text-muted-foreground">
                No activities match your filters.
              </p>
            </div>
          )}
          <div className="h-6" />
        </div>
      )}

      {!showMap && (
        <FloatingActionButton
          onClick={() => setCreateActivityOpen(true)}
          aria-label="Add activity"
        >
          <Plus size={22} color="var(--accent-foreground)" strokeWidth={2.5} />
        </FloatingActionButton>
      )}

      {createActivityOpen && (
        <Suspense fallback={null}>
          <CreateActivityModal
            open={createActivityOpen}
            onClose={() => setCreateActivityOpen(false)}
          />
        </Suspense>
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="bottom"
          className="gap-0 rounded-t-3xl border-border p-0 sm:mx-auto sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-4 pb-3 pr-12 pt-5 text-left">
            <SheetTitle className="text-base">Filter activities</SheetTitle>
            <SheetDescription>
              Choose categories and rank the activity list.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 py-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Categories
                </span>
                {selectedCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([])}
                    className="text-[11px] font-semibold text-accent"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {vidaCategories.map((category) => {
                  const selected = selectedCategories.includes(category);
                  const color = vidaCategoryColor[category];

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleToggleCategory(category)}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-bold transition"
                      style={{
                        borderColor: selected ? color : "var(--border)",
                        backgroundColor: selected ? `${color}22` : "transparent",
                        color: selected ? color : "var(--muted-foreground)",
                      }}
                      aria-pressed={selected}
                    >
                      {categoryIcon(category, 13)}
                      {vidaCategoryLabel[category]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Rank by
              </span>
              <div className="grid gap-2">
                {rankOptions.map(({ id, label, description, Icon }) => {
                  const selected = rankBy === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRankBy(id)}
                      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                        selected
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border bg-secondary/60 text-muted-foreground"
                      }`}
                      aria-pressed={selected}
                    >
                      <span
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                          selected ? "bg-accent text-accent-foreground" : "bg-card"
                        }`}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-bold">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                          {description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
                className="h-11 rounded-2xl bg-secondary text-sm font-bold text-foreground disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="h-11 rounded-2xl bg-accent text-sm font-bold text-accent-foreground"
              >
                Apply
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
