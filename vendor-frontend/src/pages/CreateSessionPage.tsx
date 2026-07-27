import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, CalendarPlus, Loader2 } from "lucide-react";
import {
  searchLocations,
  type LocationSearchResult,
} from "../api/locationSearch";
import type {
  CreateSessionInput,
  CreateVendorSessionResponse,
  Vendor,
} from "../api/types";
import { Card } from "../components/Card";

export function CreateSessionPage({
  vendor,
  error,
  isSubmitting,
  onCreateSession,
}: {
  vendor: Vendor | null;
  error: string | null;
  isSubmitting: boolean;
  onCreateSession: (
    input: CreateSessionInput,
  ) => Promise<CreateVendorSessionResponse>;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get("date") ?? "";
  const activityId = searchParams.get("activityId") ?? undefined;
  const [instructor, setInstructor] = useState("");
  const [sessionDate, setSessionDate] = useState(selectedDate);
  const [sessionTime, setSessionTime] = useState("09:00");
  const [sessionEndDate, setSessionEndDate] = useState(selectedDate);
  const [sessionEndTime, setSessionEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [spots, setSpots] = useState("10");
  const [localError, setLocalError] = useState<string | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSearchResult[]
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (selectedDate) {
      setSessionDate(selectedDate);
      setSessionEndDate(selectedDate);
    }
  }, [selectedDate]);

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

    if (!vendor) {
      setLocalError("Create a vendor profile before adding sessions.");
      return;
    }

    if (!activityId) {
      setLocalError("Open an activity first, then choose a session date.");
      return;
    }

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

    const payload: CreateSessionInput = {
      activityId,
      instructor: instructor.trim(),
      startsAt: startsAtIso,
      endAt: endAtIso,
      location: location.trim(),
      lat: latitudeValue,
      lng: longitudeValue,
      spots: spotsValue,
      vendorId: vendor.id,
      createAsVendor: true,
    };

    try {
      const response = await onCreateSession(payload);
      const createdSessionId = response.session?.id;
      const createdActivityId = response.session?.activityId ?? activityId;

      if (createdSessionId) {
        navigate(
          `/activities/${createdActivityId}/sessions/${createdSessionId}`,
        );
        return;
      }

      setInstructor("");
      setSessionDate(selectedDate);
      setSessionTime("09:00");
      setSessionEndDate(selectedDate);
      setSessionEndTime("10:00");
      setLocation("");
      setLocationSearchQuery("");
      setLatitude("");
      setLongitude("");
      setDurationMinutes("60");
      setSpots("10");
    } catch (submissionError) {
      setLocalError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create session.",
      );
    }
  };

  return (
    <div className="dashboard__main dashboard__main--full">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/activities")}
      >
        <ArrowLeft size={16} />
        Back to activities
      </button>

      <Card title="Create Session">
        <form className="activity-form" onSubmit={handleSubmit}>
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
              min={1}
              value={spots}
              onChange={(event) => setSpots(event.target.value)}
              required
            />
          </label>

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
            Create Session
          </button>
        </form>
      </Card>
    </div>
  );
}
