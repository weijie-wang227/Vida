import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { CreateActivityInput, vidaCategory } from "../../lib/types";
import { SEARCH_MIN_QUERY_LENGTH } from "../../hooks/useDebouncedMinimumQuery";
import { useAppState } from "../../state";
import { searchPhotonLocations } from "./locationSearch";
import {
  initialFormState,
  type CreateActivityFormState,
  type CreateActivityModalProps,
  type PhotonSearchResult,
} from "./types";

export function useCreateActivityForm({
  open,
  onClose,
}: CreateActivityModalProps) {
  const { createActivity, groupChats, openActivity } = useAppState();
  const adminGroups = groupChats.filter((group) => group.isAdmin);
  const [form, setForm] = useState<CreateActivityFormState>(initialFormState);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    null,
  );
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<
    PhotonSearchResult[]
  >([]);
  const [debouncedLocationQuery, setDebouncedLocationQuery] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectMapPosition = useCallback((position: [number, number]) => {
    setSelectedPosition(position);
    setError(null);
  }, []);

  const selectSearchLocation = useCallback((result: PhotonSearchResult) => {
    setSelectedPosition([result.y, result.x]);
    setError(null);
    setLocationQuery(result.label);
    setDebouncedLocationQuery("");
    setLocationSuggestions([]);
    setLocationSearchError(null);
    setForm((current) => ({ ...current, location: result.label }));
  }, []);

  useEffect(() => {
    const query = debouncedLocationQuery.trim();
    const currentQuery = locationQuery.trim();

    if (
      !open ||
      query.length < SEARCH_MIN_QUERY_LENGTH ||
      query !== currentQuery ||
      (selectedPosition && query === form.location.trim())
    ) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      setLocationSearchError(null);
      return;
    }

    const controller = new AbortController();
    setIsSearchingLocation(true);
    setLocationSearchError(null);

    searchPhotonLocations(query)
      .then((results) => {
        if (!controller.signal.aborted) {
          setLocationSuggestions(results);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLocationSuggestions([]);
          setLocationSearchError("Unable to search places right now.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSearchingLocation(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    debouncedLocationQuery,
    form.location,
    locationQuery,
    open,
    selectedPosition,
  ]);

  const updateField = <Key extends keyof CreateActivityFormState>(
    field: Key,
    value: CreateActivityFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleCategory = (category: vidaCategory) => {
    setForm((current) => {
      const isSelected = current.categories.includes(category);

      return {
        ...current,
        categories: isSelected
          ? current.categories.filter((item) => item !== category)
          : [...current.categories, category],
      };
    });
  };

  const clearLocationQuery = () => {
    setLocationQuery("");
    setDebouncedLocationQuery("");
    setLocationSuggestions([]);
    setLocationSearchError(null);
  };

  const resetForm = () => {
    setForm(initialFormState);
    setSelectedPosition(null);
    setLocationQuery("");
    setDebouncedLocationQuery("");
    setLocationSuggestions([]);
    setLocationSearchError(null);
    setError(null);
  };

  const handleClose = () => {
    if (!isSaving) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const durationMinutes = Number(form.durationMinutes);
    const spots = Number(form.spots);
    const credits = Number(form.credits);
    const startsAt = `${form.date}T${form.time}:00+08:00`;

    if (!selectedPosition) {
      setError("Drop a pin on the map for this activity.");
      return;
    }

    if (!form.date || !form.time || Number.isNaN(new Date(startsAt).getTime())) {
      setError("Choose a valid date and time.");
      return;
    }

    if (form.categories.length === 0) {
      setError("Choose at least one vida category.");
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes < 15) {
      setError("Set a duration of at least 15 minutes.");
      return;
    }

    if (!Number.isFinite(spots) || spots < 1) {
      setError("Set at least one available spot.");
      return;
    }

    if (!Number.isFinite(credits) || credits < 0) {
      setError("Credits cannot be negative.");
      return;
    }

    const payload: CreateActivityInput = {
      title: form.title.trim(),
      startsAt,
      location: form.location.trim(),
      latitude: selectedPosition[0],
      longitude: selectedPosition[1],
      durationMinutes,
      spots,
      credits,
      categories: form.categories,
      groupId: form.linkedGroupId ? Number(form.linkedGroupId) : undefined,
    };

    try {
      setIsSaving(true);
      const activity = await createActivity(payload);

      setIsSaving(false);
      resetForm();
      onClose();
      openActivity(activity.id);
    } catch (error) {
      setIsSaving(false);
      setError(error instanceof Error ? error.message : "Unable to create activity.");
    }
  };

  return {
    clearLocationQuery,
    error,
    form,
    adminGroups,
    handleClose,
    handleSubmit,
    isSaving,
    isSearchingLocation,
    locationQuery,
    locationSearchError,
    locationSuggestions,
    selectMapPosition,
    selectSearchLocation,
    selectedPosition,
    setDebouncedLocationQuery,
    setLocationQuery,
    toggleCategory,
    updateField,
  };
}
