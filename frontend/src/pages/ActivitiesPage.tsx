import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Accessibility,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  Coins,
  GraduationCap,
  HandHeart,
  Heart,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router";
import { fetchAvailableTags } from "../api";
import { BaseSearchBar } from "../components/BaseSearchBar";
import { PremiumCard, StandardRow } from "../components/ActivityCards";
import { activityCollections } from "../lib/activityCollections";
import {
  formatActivityDate,
  formatActivityTime,
  hasPremiumSession,
} from "../lib/activityPresentation";
import type { Activity, AvailableTag } from "../lib/types";
import { useAppState } from "../state";

const ActivityMap = lazy(() =>
  import("../components/ActivityMap").then((module) => ({
    default: module.ActivityMap,
  })),
);
type ActivitySort = "location" | "time";

const collectionIcons = {
  free: Coins,
  premium: Star,
  skillsfuture: GraduationCap,
  volunteer: HandHeart,
  aac: Accessibility,
};

function searchableActivityText(activity: Activity) {
  return [
    activity.title,
    activity.host,
    activity.location,
    formatActivityDate(activity.startsAt),
    formatActivityTime(activity.startsAt),
    activity.categories.join(" "),
    activity.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function activityStartTime(activity: Activity) {
  const value = new Date(activity.startsAt).getTime();
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
}

function HeaderAction({
  active = false,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full backdrop-blur-sm transition active:scale-90 ${
        active ? "bg-white text-[#183c82]" : "bg-white/15 text-white"
      }`}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function DiscoveryHero() {
  return (
    <section className="relative h-[218px] overflow-hidden rounded-b-[44px] bg-gradient-to-r from-[#2852a4] to-[#3769c3] px-5 pt-9 text-white">
      <div className="absolute right-5 top-8 flex h-[126px] w-[126px] items-center justify-center rounded-full bg-white/10">
        <Sparkles size={70} className="text-[#ffd166]" />
      </div>
      <div className="relative z-10 max-w-[66%]">
        <h1 className="text-[26px] font-bold leading-[31px]">
          Discover. Join. Enjoy.
        </h1>
        <p className="mt-2.5 text-[15px] leading-[22px] text-white/90">
          Find activities that fit your vibe and make every moment count.
        </p>
        <span className="mt-3 inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white text-[#183c82]">
          <ChevronDown size={20} className="-rotate-90" />
        </span>
      </div>
    </section>
  );
}

function SortButton({
  label,
  selected,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  selected: boolean;
  icon: typeof MapPin;
  tone: "blue" | "green";
  onClick: () => void;
}) {
  const selectedClass =
    tone === "blue"
      ? "bg-[#e8f0fc] text-[#173b75]"
      : "bg-[#eaf5e8] text-[#1b5e2e]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[18px] border px-2 text-[13px] font-medium transition ${
        selected
          ? `border-transparent ${selectedClass}`
          : "border-border bg-secondary text-foreground"
      }`}
      aria-pressed={selected}
    >
      <Icon size={20} className="flex-shrink-0" />
      <span className="truncate">{label}</span>
      <ChevronDown size={16} className="flex-shrink-0" />
    </button>
  );
}

function TagSelector({
  tags,
  selectedTag,
  errorMessage,
  onSelect,
}: {
  tags: AvailableTag[];
  selectedTag: string | null;
  errorMessage: string | null;
  onSelect: (tag: string) => void;
}) {
  if (errorMessage && tags.length === 0) {
    return (
      <p className="px-5 py-4 text-[13px] text-muted-foreground">
        Activity tags are temporarily unavailable.
      </p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto px-3.5 py-4 scrollbar-minimal">
      {tags.map((tag) => {
        const selected = selectedTag === tag.name;

        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onSelect(tag.name)}
            className={`flex min-w-[74px] flex-shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center transition ${
              selected
                ? "border-[#2852a4] bg-[#eaf0ff] text-[#2852a4]"
                : "border-border bg-card text-muted-foreground"
            }`}
            aria-pressed={selected}
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-secondary">
              {tag.imageUrl ? (
                <img
                  src={tag.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Tag size={17} />
              )}
            </span>
            <span className="max-w-[70px] truncate text-[10px] font-semibold">
              {tag.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ActivityCollections() {
  const navigate = useNavigate();

  return (
    <section className="pb-3">
      <h2 className="px-[18px] pb-2.5 text-[17px] font-bold text-foreground">
        Explore activities
      </h2>
      <div className="flex gap-2.5 overflow-x-auto px-[18px] pb-1 scrollbar-minimal">
        {activityCollections.map((collection) => {
          const Icon = collectionIcons[collection.id];

          return (
            <button
              key={collection.id}
              type="button"
              onClick={() =>
                navigate(`/activities/collections/${collection.id}`)
              }
              className="relative h-[172px] w-[158px] flex-shrink-0 text-center"
            >
              <span className="absolute inset-x-0 bottom-0 h-32 rounded-[20px] border border-border bg-card shadow-sm" />
              <span
                className="absolute left-1/2 top-0 z-10 flex h-[90px] w-[90px] -translate-x-1/2 items-center justify-center rounded-[18px]"
                style={{
                  background: `linear-gradient(145deg, ${collection.accent}33, ${collection.accent}88)`,
                  color: collection.accent,
                }}
              >
                <Icon size={42} />
              </span>
              <span className="absolute inset-x-3 bottom-4 z-10">
                <span className="line-clamp-2 text-[13px] font-semibold leading-4 text-foreground">
                  {collection.title}
                </span>
                <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                  {collection.previewText}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeading({
  title,
  subtitle,
  icon: Icon,
  iconColor,
}: {
  title: string;
  subtitle: string;
  icon: typeof Star;
  iconColor: string;
}) {
  return (
    <div className="flex items-center px-[18px] pb-2 pt-2">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${iconColor}20`, color: iconColor }}
      >
        <Icon size={19} />
      </span>
      <span className="pl-2.5">
        <span className="block text-[17px] font-bold text-foreground">
          {title}
        </span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </div>
  );
}

export function ActivitiesPage() {
  const navigate = useNavigate();
  const {
    premiumActivities,
    setShowMap,
    showMap,
    standardActivities,
  } = useAppState();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ActivitySort>("time");
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([]);
  const [tagError, setTagError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    fetchAvailableTags()
      .then((tags) => {
        if (!ignore) {
          setAvailableTags(tags);
          setTagError(null);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setTagError(
            error instanceof Error ? error.message : "Unable to load tags.",
          );
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const visibleActivities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = [...premiumActivities, ...standardActivities].filter(
      (activity) => {
        const matchesQuery =
          !query || searchableActivityText(activity).includes(query);
        const matchesTag =
          selectedTag === null ||
          activity.tags.some((tag) =>
            tag.localeCompare(selectedTag, undefined, {
              sensitivity: "accent",
            }) === 0,
          );

        return matchesQuery && matchesTag;
      },
    );

    return filtered.sort((left, right) => {
      if (sortBy === "location") {
        const locationOrder = left.location.localeCompare(right.location);
        if (locationOrder !== 0) {
          return locationOrder;
        }
      }

      const timeOrder = activityStartTime(left) - activityStartTime(right);
      return timeOrder || left.title.localeCompare(right.title);
    });
  }, [
    premiumActivities,
    searchQuery,
    selectedTag,
    sortBy,
    standardActivities,
  ]);
  const visiblePremiumActivities = visibleActivities.filter(
    hasPremiumSession,
  );
  const visibleStandardActivities = visibleActivities.filter(
    (activity) => !hasPremiumSession(activity),
  );
  const hasActiveQuery = searchQuery.trim() !== "" || selectedTag !== null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <header className="flex-shrink-0 bg-gradient-to-b from-[#183c82] to-[#2852a4] px-5 pb-3.5 pt-3 text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="mr-auto flex min-w-0 items-center gap-1 text-[17px] font-medium"
          >
            <span className="truncate">SINGAPORE</span>
            <ChevronDown size={20} />
          </button>
          <HeaderAction
            label="View favorited activities"
            onClick={() => navigate("/activities/favorited")}
          >
            <Heart size={20} />
          </HeaderAction>
          <HeaderAction
            label="View activities calendar"
            onClick={() => navigate("/activities/calendar")}
          >
            <CalendarDays size={20} />
          </HeaderAction>
          <HeaderAction
            active={showMap}
            label={showMap ? "Show activity list" : "Show activity map"}
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? <ArrowLeft size={20} /> : <Navigation size={19} />}
          </HeaderAction>
        </div>
        <div className="relative mt-3">
          <Search
            size={21}
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#171717]"
          />
          <BaseSearchBar
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Join an activity now"
            ariaLabel="Search activities"
            showIcon={false}
            clearable
            clearAriaLabel="Clear activity search"
            className="flex h-14 items-center rounded-[22px] border-0 bg-white pl-11 pr-3 text-[#171717] shadow-none"
            inputClassName="h-full min-w-0 flex-1 bg-transparent text-sm leading-normal text-[#171717] outline-none placeholder:text-[#8b8b8b]"
          />
        </div>
      </header>

      {showMap ? (
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={null}>
            <ActivityMap onClose={() => setShowMap(false)} />
          </Suspense>
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto scrollbar-minimal">
          <DiscoveryHero />

          <div className="sticky top-0 z-20 flex gap-2.5 bg-background px-4 py-3 shadow-sm">
            <SortButton
              label="Sort by Location"
              selected={sortBy === "location"}
              icon={MapPin}
              tone="blue"
              onClick={() => setSortBy("location")}
            />
            <SortButton
              label="Sort by Time"
              selected={sortBy === "time"}
              icon={Clock3}
              tone="green"
              onClick={() => setSortBy("time")}
            />
          </div>

          <TagSelector
            tags={availableTags}
            selectedTag={selectedTag}
            errorMessage={tagError}
            onSelect={(tag) =>
              setSelectedTag((current) => (current === tag ? null : tag))
            }
          />

          <ActivityCollections />

          {visiblePremiumActivities.length > 0 && (
            <section className="pb-4">
              <SectionHeading
                title="Premium activities"
                subtitle="Elevated experiences picked for you"
                icon={Star}
                iconColor="#e0a11c"
              />
              <div className="flex gap-3 overflow-x-auto px-[18px] py-1 scrollbar-minimal">
                {visiblePremiumActivities.map((activity) => (
                  <PremiumCard key={activity.id} activity={activity} />
                ))}
              </div>
            </section>
          )}

          <section className="pb-5">
            <SectionHeading
              title="All upcoming activities"
              subtitle="Find your next thing to do"
              icon={CalendarDays}
              iconColor="#2852a4"
            />
            {visibleStandardActivities.length > 0 ? (
              visibleStandardActivities.map((activity) => (
                <StandardRow key={activity.id} activity={activity} />
              ))
            ) : (
              <div className="flex flex-col items-center px-8 py-10 text-center text-muted-foreground">
                <Tag size={30} />
                <p className="mt-2.5 text-sm">
                  {hasActiveQuery
                    ? "No upcoming activities match your search."
                    : "No upcoming activities yet."}
                </p>
              </div>
            )}
          </section>
        </main>
      )}

      {/* Participant activity creation is temporarily disabled. */}
    </div>
  );
}
