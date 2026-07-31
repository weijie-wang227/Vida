import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarPlus,
  CircleDollarSign,
  GraduationCap,
  HandHeart,
  Loader2,
  Save,
  Star,
} from "lucide-react";
import {
  searchLocations,
  type LocationSearchResult,
} from "../../api/locationSearch";
import type {
  Activity,
  CreateSessionInput,
  CreateVendorSessionResponse,
  Session,
  UpdateSessionInput,
  UpdateVendorSessionResponse,
  Vendor,
} from "../../api/types";
import { Card } from "../Card";

type PaymentMode = "free" | "premium" | "skillsfuture";

type SessionCreatePanelProps = {
  activity: Activity | null;
  activityId: number | string | undefined;
  vendor: Vendor | null;
  selectedDate: string;
  error: string | null;
  isSubmitting: boolean;
  onCreateSession?: (
    input: CreateSessionInput,
  ) => Promise<CreateVendorSessionResponse>;
  onCreated?: (
    response: CreateVendorSessionResponse,
    input: CreateSessionInput,
  ) => void;
  session?: Session;
  onUpdateSession?: (
    sessionId: number | string,
    input: UpdateSessionInput,
  ) => Promise<UpdateVendorSessionResponse>;
  onUpdated?: (
    response: UpdateVendorSessionResponse,
    input: UpdateSessionInput,
  ) => void;
  onCancel?: () => void;
  className?: string;
};

function getDatePart(value: string | undefined, fallback: string) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return fallback;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTimePart(value: string | undefined, fallback: string) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return fallback;
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export function SessionCreatePanel({
  activity,
  activityId,
  vendor,
  selectedDate,
  error,
  isSubmitting,
  onCreateSession,
  onCreated,
  session,
  onUpdateSession,
  onUpdated,
  onCancel,
  className = "",
}: SessionCreatePanelProps) {
  const isEditing = Boolean(session);
  const [title, setTitle] = useState(session?.title ?? activity?.title ?? "");
  const [instructor, setInstructor] = useState(session?.instructor ?? "");
  const [sessionDate, setSessionDate] = useState(
    getDatePart(session?.startsAt, selectedDate),
  );
  const [sessionTime, setSessionTime] = useState(
    getTimePart(session?.startsAt, "09:00"),
  );
  const [sessionEndDate, setSessionEndDate] = useState(
    getDatePart(session?.endAt, selectedDate),
  );
  const [sessionEndTime, setSessionEndTime] = useState(
    getTimePart(session?.endAt, "10:00"),
  );
  const [location, setLocation] = useState(session?.location ?? "");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [latitude, setLatitude] = useState(
    session ? String(session.lat) : "",
  );
  const [longitude, setLongitude] = useState(
    session ? String(session.lng) : "",
  );
  const [spots, setSpots] = useState(String(session?.spots ?? 10));
  const [price, setPrice] = useState(String(session?.priceSgd ?? 0));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    session?.skillsFuturePayable
      ? "skillsfuture"
      : session?.isPremium
        ? "premium"
        : "free",
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSearchResult[]
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(
    null,
  );
  const isVolunteer = activity?.isVolunteer ?? false;

  useEffect(() => {
    if (selectedDate) {
      setSessionDate(selectedDate);
      setSessionEndDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isVolunteer || paymentMode === "free") {
      setPrice("0");
    }
  }, [isVolunteer, paymentMode]);

  useEffect(() => {
    const query = locationSearchQuery.trim();
    let isCurrentSearch = true;

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
        .then((results) => {
          if (isCurrentSearch) {
            setLocationSuggestions(results);
          }
        })
        .catch((searchError) => {
          if (isCurrentSearch) {
            setLocationSuggestions([]);
            setLocationSearchError(
              searchError instanceof Error
                ? searchError.message
                : "Unable to search places right now.",
            );
          }
        })
        .finally(() => {
          if (isCurrentSearch) {
            setIsSearchingLocation(false);
          }
        });
    }, 300);

    return () => {
      isCurrentSearch = false;
      window.clearTimeout(timeoutId);
    };
  }, [locationSearchQuery]);

  const selectLocation = (result: LocationSearchResult) => {
    setLocation(result.label);
    setLocationSearchQuery("");
    setLatitude(String(result.latitude));
    setLongitude(String(result.longitude));
    setLocationSuggestions([]);
    setLocationSearchError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!isEditing && !vendor) {
      setLocalError("Create a vendor profile before adding sessions.");
      return;
    }

    if (!isEditing && !activityId) {
      setLocalError("Open an activity first, then choose a session date.");
      return;
    }

    const titleValue = title.trim();
    const startsAtValue =
      sessionDate && sessionTime ? `${sessionDate}T${sessionTime}` : "";
    const startsAtIso = startsAtValue
      ? new Date(startsAtValue).toISOString()
      : "";
    const endAtValue =
      sessionEndDate && sessionEndTime
        ? `${sessionEndDate}T${sessionEndTime}`
        : "";
    const endAtIso = endAtValue ? new Date(endAtValue).toISOString() : "";
    const latitudeValue = Number(latitude);
    const longitudeValue = Number(longitude);
    const spotsValue = Number(spots);
    const priceValue =
      isVolunteer || paymentMode === "free" ? 0 : Number(price);

    if (!titleValue) {
      setLocalError("Enter a session title.");
      return;
    }

    if (!startsAtIso || Number.isNaN(new Date(startsAtIso).getTime())) {
      setLocalError("Choose a valid date and time.");
      return;
    }

    if (!endAtIso || Number.isNaN(new Date(endAtIso).getTime())) {
      setLocalError("Choose a valid end time.");
      return;
    }

    if (
      new Date(endAtIso).getTime() - new Date(startsAtIso).getTime() <
      15 * 60 * 1000
    ) {
      setLocalError(
        "Session end time must be at least 15 minutes after its start time.",
      );
      return;
    }

    if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) {
      setLocalError("Choose a valid session location.");
      return;
    }

    if (!Number.isFinite(spotsValue) || spotsValue < 1) {
      setLocalError("Session spots must be at least 1.");
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setLocalError("Price cannot be negative.");
      return;
    }

    const details: UpdateSessionInput = {
      title: titleValue,
      instructor: instructor.trim(),
      startsAt: startsAtIso,
      endAt: endAtIso,
      location: location.trim(),
      lat: latitudeValue,
      lng: longitudeValue,
      spots: spotsValue,
      priceSgd: priceValue,
      isPremium: !isVolunteer && paymentMode === "premium",
      skillsFuturePayable:
        !isVolunteer && paymentMode === "skillsfuture",
    };

    try {
      if (session && onUpdateSession) {
        const sessionId = session.mockId ?? session.id ?? session.objectId;
        const response = await onUpdateSession(sessionId, details);

        onUpdated?.(response, details);
        return;
      }

      if (!vendor || !activityId || !onCreateSession) {
        setLocalError("Open an activity first, then choose a session date.");
        return;
      }

      const payload: CreateSessionInput = {
        ...details,
        activityId,
        vendorId: vendor.id,
        createAsVendor: true,
      };
      const response = await onCreateSession(payload);
      onCreated?.(response, payload);
    } catch (submissionError) {
      setLocalError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create session.",
      );
    }
  };

  return (
    <Card
      title={isEditing ? "Edit Session" : "Create Session"}
      className={`session-inline-panel ${className}`.trim()}
    >
      <form className="activity-form" onSubmit={handleSubmit}>
        <label className="activity-form__wide">
          <span>Session Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            placeholder="Session title"
            required
          />
        </label>

        <label>
          <span>Instructor</span>
          <input
            value={instructor}
            onChange={(event) => setInstructor(event.target.value)}
            maxLength={120}
            placeholder="Instructor name"
          />
        </label>

        <label className="activity-form__wide">
          <span>Location Search</span>
          <div className="location-search-field">
            <input
              value={location}
              onChange={(event) => {
                const value = event.target.value;
                setLocation(value);
                setLocationSearchQuery(value);
                setLatitude("");
                setLongitude("");
              }}
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
                    {result.latitude.toFixed(5)},{" "}
                    {result.longitude.toFixed(5)}
                  </em>
                </button>
              ))}
            </div>
          )}
        </label>

        <label>
          <span>Start Date</span>
          <input
            type="date"
            value={sessionDate}
            onChange={(event) => setSessionDate(event.target.value)}
            required
          />
        </label>

        <label>
          <span>Start Time</span>
          <input
            type="time"
            value={sessionTime}
            onChange={(event) => setSessionTime(event.target.value)}
            required
          />
        </label>

        <label>
          <span>End date</span>
          <input
            type="date"
            value={sessionEndDate}
            min={sessionDate || undefined}
            onChange={(event) => setSessionEndDate(event.target.value)}
            required
          />
        </label>

        <label>
          <span>End time</span>
          <input
            type="time"
            value={sessionEndTime}
            onChange={(event) => setSessionEndTime(event.target.value)}
            required
          />
        </label>

        <label>
          <span>Spots</span>
          <input
          type="number"
            min={Math.max(1, session?.registeredCount ?? 1)}
            value={spots}
            onChange={(event) => setSpots(event.target.value)}
            required
          />
        </label>

        {isVolunteer ? (
          <div className="activity-form__wide volunteer-activity-payment-note">
            <HandHeart size={18} />
            <div>
              <strong>Volunteer session</strong>
              <span>Payment is disabled and this session will be free.</span>
            </div>
          </div>
        ) : (
          <fieldset className="activity-form__wide activity-toggle-fieldset">
            <legend>Payment options</legend>
            <div>
              <label
                className={`activity-toggle-card ${
                  paymentMode === "free" ? "activity-toggle-card--active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="session-payment-mode"
                  checked={paymentMode === "free"}
                  onChange={() => setPaymentMode("free")}
                />
                <span>
                  <CircleDollarSign size={15} />
                  Free
                </span>
              </label>
              <label
                className={`activity-toggle-card ${
                  paymentMode === "premium"
                    ? "activity-toggle-card--active"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="session-payment-mode"
                  checked={paymentMode === "premium"}
                  onChange={() => setPaymentMode("premium")}
                />
                <span>
                  <Star size={15} />
                  Premium
                </span>
              </label>
              <label
                className={`activity-toggle-card ${
                  paymentMode === "skillsfuture"
                    ? "activity-toggle-card--active"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="session-payment-mode"
                  checked={paymentMode === "skillsfuture"}
                  onChange={() => setPaymentMode("skillsfuture")}
                />
                <span>
                  <GraduationCap size={15} />
                  SkillsFuture Payable
                </span>
              </label>
            </div>
            <label className="activity-form__wide activity-price-field">
              <span>Price (SGD)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                disabled={paymentMode === "free"}
                required
              />
            </label>
          </fieldset>
        )}

        {(localError || error) && (
          <p className="form-error activity-form__wide">
            {localError || error}
          </p>
        )}

        <div className="activity-form__wide session-form-actions">
          {isEditing && onCancel && (
            <button
              type="button"
              className="secondary-action"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="primary-action"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 size={16} className="spin" />
            ) : isEditing ? (
              <Save size={16} />
            ) : (
              <CalendarPlus size={16} />
            )}
            {isEditing ? "Save Changes" : "Create Session"}
          </button>
        </div>
      </form>
    </Card>
  );
}
