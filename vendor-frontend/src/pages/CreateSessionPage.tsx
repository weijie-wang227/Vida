import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  CalendarPlus,
  Loader2,
} from "lucide-react";
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
  const [title, setTitle] = useState("");
  const [sessionDate, setSessionDate] = useState(selectedDate);
  const [sessionTime, setSessionTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
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
    }
  }, [selectedDate]);

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
        .catch((searchError) => {
          setLocationSuggestions([]);
          setLocationSearchError(
            searchError instanceof Error
              ? searchError.message
              : "Unable to search places right now.",
          );
        })
        .finally(() => setIsSearchingLocation(false));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [location]);

  const selectLocation = (result: LocationSearchResult) => {
    setLocation(result.label);
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
    const latitudeValue = Number(latitude);
    const longitudeValue = Number(longitude);
    const durationValue = Number(durationMinutes);
    const spotsValue = Number(spots);

    if (!startsAtIso || Number.isNaN(new Date(startsAtIso).getTime())) {
      setLocalError("Choose a valid date and time.");
      return;
    }

    if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) {
      setLocalError("Choose a valid session location.");
      return;
    }

    if (!Number.isFinite(durationValue) || durationValue < 15) {
      setLocalError("Session duration must be at least 15 minutes.");
      return;
    }

    if (!Number.isFinite(spotsValue) || spotsValue < 1) {
      setLocalError("Session spots must be at least 1.");
      return;
    }

    const payload: CreateSessionInput = {
      activityId,
      title: title.trim(),
      startsAt: startsAtIso,
      location: location.trim(),
      lat: latitudeValue,
      lng: longitudeValue,
      durationMinutes: durationValue,
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

      setTitle("");
      setSessionDate(selectedDate);
      setSessionTime("09:00");
      setLocation("");
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
      <Card title="Create Session">
        <form className="activity-form" onSubmit={handleSubmit}>
          <label>
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label>
            <span>Date</span>
            <input
              type="date"
              value={sessionDate}
              onChange={(event) => setSessionDate(event.target.value)}
              disabled={Boolean(selectedDate)}
              required
            />
          </label>

          <label>
            <span>Time</span>
            <input
              type="time"
              value={sessionTime}
              onChange={(event) => setSessionTime(event.target.value)}
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
                      {result.latitude.toFixed(5)},{" "}
                      {result.longitude.toFixed(5)}
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
