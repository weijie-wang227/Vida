import { useEffect, useState, type FormEvent } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import {
  AlertCircle,
  CalendarPlus,
  GraduationCap,
  Loader2,
  MessageCircle,
  Search,
  Star,
  Users,
} from "lucide-react";
import { fetchVendorActivityTemplates } from "../api/activities";
import {
  searchLocations,
  type LocationSearchResult,
} from "../api/locationSearch";
import { Card } from "../components/Card";
import { Sidebar, type VendorTab } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";
import { AttendancePage } from "./AttendancePage";
import { UpcomingActivitiesPage } from "./UpcomingActivitiesPage";
import type {
  ActivityTemplate,
  AuthUser,
  CreateActivityInput,
  Vendor,
  VendorActivity,
  VendorStats,
  VidaCategory,
} from "../api/types";

const categories: Array<{ value: VidaCategory; label: string }> = [
  { value: "physical", label: "Physical" },
  { value: "social", label: "Social" },
  { value: "cognitive", label: "Cognitive" },
  { value: "creative", label: "Creative" },
];

function formatActivityDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ActivityCreateForm({
  vendor,
  error,
  isSubmitting,
  onCreateActivity,
}: {
  vendor: Vendor;
  error: string | null;
  isSubmitting: boolean;
  onCreateActivity: (input: CreateActivityInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [spots, setSpots] = useState("10");
  const [credits, setCredits] = useState("0");
  const [isPremium, setIsPremium] = useState(false);
  const [skillsFuturePayable, setSkillsFuturePayable] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<VidaCategory[]>(
    [],
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [activityTemplateQuery, setActivityTemplateQuery] = useState("");
  const [isActivityTemplateSearchFocused, setIsActivityTemplateSearchFocused] =
    useState(false);
  const [activityTemplates, setActivityTemplates] = useState<
    ActivityTemplate[]
  >([]);
  const [isLoadingActivityTemplates, setIsLoadingActivityTemplates] =
    useState(false);
  const [activityTemplateError, setActivityTemplateError] = useState<
    string | null
  >(null);
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSearchResult[]
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isPremium) {
      setCredits("0");
    }
  }, [isPremium]);

  useEffect(() => {
    let isActive = true;
    setIsLoadingActivityTemplates(true);
    setActivityTemplateError(null);

    fetchVendorActivityTemplates()
      .then((templates) => {
        if (isActive) {
          setActivityTemplates(templates);
        }
      })
      .catch(() => {
        if (isActive) {
          setActivityTemplates([]);
          setActivityTemplateError("Unable to load past activities.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingActivityTemplates(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const query = location.trim();

    if (query.length < 2) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      setLocationSearchError(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSearchingLocation(true);
      setLocationSearchError(null);

      searchLocations(query)
        .then(setLocationSuggestions)
        .catch((error) => {
          setLocationSuggestions([]);
          setLocationSearchError(
            error instanceof Error
              ? error.message
              : "Unable to search places right now.",
          );
        })
        .finally(() => setIsSearchingLocation(false));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [location]);

  const toggleCategory = (category: VidaCategory) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const selectLocation = (result: LocationSearchResult) => {
    setLocation(result.label);
    setLatitude(String(result.latitude));
    setLongitude(String(result.longitude));
    setLocationSuggestions([]);
    setLocationSearchError(null);
  };

  const selectActivityTemplate = (template: ActivityTemplate) => {
    setTitle(template.title);
    setLocation(template.location);
    setLatitude(String(template.latitude));
    setLongitude(String(template.longitude));
    setDurationMinutes(String(template.durationMinutes));
    setSpots(String(template.spots));
    setCredits(String(template.credits));
    setIsPremium(template.credits > 0);
    setSelectedCategories(template.categories);
    setActivityTemplateQuery(template.title);
    setIsActivityTemplateSearchFocused(false);
    setLocationSuggestions([]);
    setLocationSearchError(null);
    setLocalError(null);
  };

  const normalizedTemplateQuery = activityTemplateQuery.trim().toLowerCase();
  const matchingActivityTemplates = (
    normalizedTemplateQuery
      ? activityTemplates.filter((template) =>
          `${template.title} ${template.location}`
            .toLowerCase()
            .includes(normalizedTemplateQuery),
        )
      : activityTemplates
  ).slice(0, 5);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const startsAtIso = startsAt ? new Date(startsAt).toISOString() : "";
    const latitudeValue = Number(latitude);
    const longitudeValue = Number(longitude);
    const durationValue = Number(durationMinutes);
    const spotsValue = Number(spots);
    const creditsValue = isPremium ? Number(credits) : 0;

    if (!startsAtIso || Number.isNaN(new Date(startsAtIso).getTime())) {
      setLocalError("Choose a valid date and time.");
      return;
    }

    if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) {
      setLocalError("Enter valid latitude and longitude values.");
      return;
    }

    if (selectedCategories.length === 0) {
      setLocalError("Choose at least one category.");
      return;
    }

    await onCreateActivity({
      title: title.trim(),
      startsAt: startsAtIso,
      location: location.trim(),
      latitude: latitudeValue,
      longitude: longitudeValue,
      durationMinutes: durationValue,
      spots: spotsValue,
      credits: creditsValue,
      categories: selectedCategories,
      vendorId: vendor.id,
      createAsVendor: true,
      isPremium,
      skillsFuturePayable,
    });
  };

  return (
    <Card title="Create Activity">
      <form className="activity-form" onSubmit={handleSubmit}>
        <label className="activity-form__wide">
          <span>Copy From Past Activity</span>
          <div className="location-search-field">
            <Search size={16} className="activity-template-search__icon" />
            <input
              value={activityTemplateQuery}
              onChange={(event) => setActivityTemplateQuery(event.target.value)}
              onBlur={() => setIsActivityTemplateSearchFocused(false)}
              onFocus={() => setIsActivityTemplateSearchFocused(true)}
              placeholder="Search activities you created"
            />
            {isLoadingActivityTemplates && (
              <Loader2
                size={16}
                className="spin location-search-field__loader"
              />
            )}
          </div>
          {activityTemplateError && (
            <p className="location-search-error">{activityTemplateError}</p>
          )}
          {isActivityTemplateSearchFocused &&
            matchingActivityTemplates.length > 0 && (
            <div className="location-suggestions">
              {matchingActivityTemplates.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectActivityTemplate(activity)}
                >
                  <span>{activity.title}</span>
                  <em>{activity.location}</em>
                </button>
              ))}
            </div>
          )}
        </label>

        <label>
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <label>
          <span>Date and time</span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            required
          />
        </label>

        <label className="activity-form__wide">
          <span>Location Search</span>
          <div className="location-search-field">
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Search a place in Singapore"
              required
            />
            {isSearchingLocation && (
              <Loader2
                size={16}
                className="spin location-search-field__loader"
              />
            )}
          </div>
          {locationSearchError && (
            <p className="location-search-error">{locationSearchError}</p>
          )}
          {locationSuggestions.length > 0 && (
            <div className="location-suggestions">
              {locationSuggestions.map((result) => (
                <button
                  key={`${result.latitude}-${result.longitude}-${result.label}`}
                  type="button"
                  onClick={() => selectLocation(result)}
                >
                  <span>{result.label}</span>
                  <em>
                    {result.latitude.toFixed(5)}, {result.longitude.toFixed(5)}
                  </em>
                </button>
              ))}
            </div>
          )}
        </label>

        <label>
          <span>Duration minutes</span>
          <input
            type="number"
            min={15}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
            required
          />
        </label>

        <label>
          <span>Spots</span>
          <input
            type="number"
            min={1}
            value={spots}
            onChange={(event) => setSpots(event.target.value)}
            required
          />
        </label>

        <label>
          <span>Credits</span>
          <input
            type="number"
            min={0}
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
            disabled={!isPremium}
            required
          />
        </label>

        <fieldset className="activity-form__wide activity-toggle-fieldset">
          <legend>Payment options</legend>
          <div>
            <label
              className={`activity-toggle-card ${isPremium ? "activity-toggle-card--active" : ""}`}
            >
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(event) => setIsPremium(event.target.checked)}
              />
              <span>
                <Star size={15} />
                Premium
              </span>
            </label>
            <label
              className={`activity-toggle-card ${
                skillsFuturePayable ? "activity-toggle-card--active" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={skillsFuturePayable}
                onChange={(event) =>
                  setSkillsFuturePayable(event.target.checked)
                }
              />
              <span>
                <GraduationCap size={15} />
                SkillsFuture Payable
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset className="activity-form__wide category-fieldset">
          <legend>Categories</legend>
          <div>
            {categories.map((category) => (
              <label
                key={category.value}
                className={`category-option category-option--${category.value} ${
                  selectedCategories.includes(category.value)
                    ? "category-option--active"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.value)}
                  onChange={() => toggleCategory(category.value)}
                />
                <span>{category.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {(localError || error) && (
          <p className="form-error activity-form__wide">
            {localError || error}
          </p>
        )}

        <button
          type="submit"
          className="primary-action activity-form__wide"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <CalendarPlus size={16} />
          )}
          Create Activity
        </button>
      </form>
    </Card>
  );
}

export function DashboardPage({
  user,
  vendor,
  activities,
  stats,
  activityError,
  isCreatingActivity,
  updatingActivityId,
  onCreateActivity,
  onToggleActivityOpen,
  onSignOut,
}: {
  user: AuthUser | null;
  vendor: Vendor | null;
  activities: VendorActivity[];
  stats: VendorStats;
  activityError: string | null;
  isCreatingActivity: boolean;
  updatingActivityId: string | null;
  onCreateActivity: (input: CreateActivityInput) => Promise<void>;
  onToggleActivityOpen: (
    activityId: number | string,
    isOpen: boolean,
  ) => Promise<void>;
  onSignOut: () => void;
}) {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const dashboardStats = [
    { value: stats.activities, label: "Activities" },
    { value: stats.pastActivities, label: "Past Activities" },
    { value: stats.peopleAttended, label: "People Attended" },
    { value: stats.attendanceRate, label: "Attendance Rate" },
    { value: stats.averageRating.toFixed(1), label: "Average Rating" },
  ];
  const handleTabChange = (tab: VendorTab) => {
    navigate(tab === "dashboard" ? "/dashboard" : "/upcoming");
  };

  return (
    <div className="vendor-app">
      <VendorLayout
        user={user}
        vendor={vendor}
        dashboardStats={dashboardStats}
        activities={activities}
        activityError={activityError}
        isCreateOpen={isCreateOpen}
        isCreatingActivity={isCreatingActivity}
        updatingActivityId={updatingActivityId}
        onCreateActivity={onCreateActivity}
        onToggleActivityOpen={onToggleActivityOpen}
        onCreateToggle={() => setIsCreateOpen((current) => !current)}
        onSignOut={onSignOut}
        onTabChange={handleTabChange}
      />
    </div>
  );
}

function VendorLayout({
  user,
  vendor,
  dashboardStats,
  activities,
  activityError,
  isCreateOpen,
  isCreatingActivity,
  updatingActivityId,
  onCreateActivity,
  onToggleActivityOpen,
  onCreateToggle,
  onSignOut,
  onTabChange,
}: {
  user: AuthUser | null;
  vendor: Vendor | null;
  dashboardStats: Array<{ value: number | string; label: string }>;
  activities: VendorActivity[];
  activityError: string | null;
  isCreateOpen: boolean;
  isCreatingActivity: boolean;
  updatingActivityId: string | null;
  onCreateActivity: (input: CreateActivityInput) => Promise<void>;
  onToggleActivityOpen: (
    activityId: number | string,
    isOpen: boolean,
  ) => Promise<void>;
  onCreateToggle: () => void;
  onSignOut: () => void;
  onTabChange: (tab: VendorTab) => void;
}) {
  const { pathname } = useLocation();
  const activeTab: VendorTab = pathname.startsWith("/upcoming")
    ? "upcoming"
    : "dashboard";
  const isAttendancePage = /^\/upcoming\/[^/]+\/attendance$/.test(pathname);

  return (
    <>
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      <div className="workspace">
        <TopBar
          accountName={vendor?.name || user?.handle || user?.name || "Vendor"}
          onSignOut={onSignOut}
        />

        <main className="dashboard">
          <div className="dashboard-heading">
            <div>
              <span>
                {activeTab === "dashboard"
                  ? "My Dashboard"
                  : isAttendancePage
                    ? "Attendance"
                    : "Upcoming"}
              </span>
              <h1>
                {activeTab === "dashboard"
                  ? (vendor?.name ?? "Vendor Dashboard")
                  : isAttendancePage
                    ? "Attendance"
                    : "Upcoming Activities"}
              </h1>
            </div>
            {activeTab === "dashboard" && (
              <button
                type="button"
                className={`primary-action dashboard-create-action ${
                  isCreateOpen ? "primary-action--muted" : ""
                }`}
                onClick={onCreateToggle}
              >
                <CalendarPlus size={17} />
                {isCreateOpen ? "Close Activity" : "Create Activity"}
              </button>
            )}
          </div>

          <Routes>
            <Route
              path="/dashboard"
              element={
                <DashboardHome
                  vendor={vendor}
                  dashboardStats={dashboardStats}
                  activities={activities}
                  activityError={activityError}
                  isCreateOpen={isCreateOpen}
                  isCreatingActivity={isCreatingActivity}
                  onCreateActivity={onCreateActivity}
                />
              }
            />
            <Route
              path="/upcoming"
              element={
                <UpcomingActivitiesPage
                  activities={activities}
                  error={activityError}
                  updatingActivityId={updatingActivityId}
                  onToggleActivityOpen={onToggleActivityOpen}
                />
              }
            />
            <Route
              path="/upcoming/:activityId/attendance"
              element={<AttendancePage activities={activities} />}
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      <button type="button" className="chat-fab" aria-label="Open chat">
        <MessageCircle size={21} />
      </button>
    </>
  );
}

function DashboardHome({
  vendor,
  dashboardStats,
  activities,
  activityError,
  isCreateOpen,
  isCreatingActivity,
  onCreateActivity,
}: {
  vendor: Vendor | null;
  dashboardStats: Array<{ value: number | string; label: string }>;
  activities: VendorActivity[];
  activityError: string | null;
  isCreateOpen: boolean;
  isCreatingActivity: boolean;
  onCreateActivity: (input: CreateActivityInput) => Promise<void>;
}) {
  const upcomingActivities = activities.filter((activity) => activity.isActive);
  const pastActivities = activities.filter((activity) => !activity.isActive);

  return (
    <>
      <section className="verification-alert">
        <AlertCircle size={17} />
        <span>
          {vendor?.name ?? "Your vendor profile"} is ready. Submit business
          verification to unlock payouts and featured placements.
        </span>
        <button type="button">Verify now</button>
      </section>

      <div className="dashboard__main dashboard__main--full">
        <Card className="order-card">
          <div className="order-stats order-stats--five">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="order-stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {isCreateOpen && vendor && (
          <ActivityCreateForm
            vendor={vendor}
            error={activityError}
            isSubmitting={isCreatingActivity}
            onCreateActivity={onCreateActivity}
          />
        )}

        <Card title="Upcoming">
          {upcomingActivities.length === 0 ? (
            <div className="empty-state">
              <CalendarPlus size={28} />
              <strong>No upcoming activities</strong>
              <span>
                Create an active activity to start tracking attendance.
              </span>
            </div>
          ) : (
            <div className="activity-table-wrap">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Attendance</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingActivities.map((activity) => (
                    <tr key={activity.id}>
                      <td>
                        <strong>{activity.title}</strong>
                      </td>
                      <td>{formatActivityDate(activity.startsAt)}</td>
                      <td>{activity.location}</td>
                      <td>
                        <span className="table-metric">
                          <Users size={15} />
                          {activity.attendance} / {activity.spots}
                        </span>
                      </td>
                      <td>
                        <span className="table-metric">
                          <Star size={15} />
                          {activity.rating.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Past Activities">
          {pastActivities.length === 0 ? (
            <div className="empty-state">
              <CalendarPlus size={28} />
              <strong>No past activities</strong>
              <span>Inactive activities will appear here.</span>
            </div>
          ) : (
            <div className="activity-table-wrap">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Attendance</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {pastActivities.map((activity) => (
                    <tr key={activity.id}>
                      <td>
                        <strong>{activity.title}</strong>
                      </td>
                      <td>{formatActivityDate(activity.startsAt)}</td>
                      <td>{activity.location}</td>
                      <td>
                        <span className="table-metric">
                          <Users size={15} />
                          {activity.attendance} / {activity.spots}
                        </span>
                      </td>
                      <td>
                        <span className="table-metric">
                          <Star size={15} />
                          {activity.rating.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
