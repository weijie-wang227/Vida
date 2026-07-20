import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  fetchAvailableTags,
  fetchCreatedActivityTemplates,
} from "../../api/activities";
import { uploadImageToR2 } from "../../api/uploads";
import type {
  ActivityTemplate,
  AvailableTag,
  CreateActivityInput,
  vidaCategory,
} from "../../lib/types";
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
  enableActivityTemplates = false,
  open,
  onClose,
}: CreateActivityModalProps & { enableActivityTemplates?: boolean }) {
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
  const [activityTemplateQuery, setActivityTemplateQuery] = useState("");
  const [activityTemplates, setActivityTemplates] = useState<ActivityTemplate[]>([]);
  const [isLoadingActivityTemplates, setIsLoadingActivityTemplates] = useState(false);
  const [activityTemplateError, setActivityTemplateError] = useState<string | null>(
    null,
  );
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [tagLoadError, setTagLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isActive = true;
    setIsLoadingTags(true);
    setTagLoadError(null);

    fetchAvailableTags()
      .then((tags) => {
        if (isActive) {
          setAvailableTags(tags);
        }
      })
      .catch(() => {
        if (isActive) {
          setAvailableTags([]);
          setTagLoadError("Unable to load available tags.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingTags(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !enableActivityTemplates) {
      return;
    }

    let isActive = true;
    setIsLoadingActivityTemplates(true);
    setActivityTemplateError(null);

    fetchCreatedActivityTemplates()
      .then((templates) => {
        if (isActive) {
          setActivityTemplates(templates);
        }
      })
      .catch(() => {
        if (isActive) {
          setActivityTemplates([]);
          setActivityTemplateError("Unable to load your past activities.");
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
  }, [enableActivityTemplates, open]);

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

  const selectActivityTemplate = useCallback((template: ActivityTemplate) => {
    const groupId = template.groupId === undefined ? "" : String(template.groupId);

    setForm((current) => ({
      ...current,
      title: template.title,
      location: template.location,
      durationMinutes: String(template.durationMinutes),
      spots: String(template.spots),
      credits: String(template.credits),
      categories:
        template.categories.length > 0 ? template.categories : current.categories,
      linkedGroupId:
        groupId && adminGroups.some((group) => String(group.id) === groupId)
          ? groupId
          : current.linkedGroupId,
    }));
    setSelectedPosition([template.latitude, template.longitude]);
    setLocationQuery(template.location);
    setDebouncedLocationQuery("");
    setLocationSuggestions([]);
    setLocationSearchError(null);
    setActivityTemplateQuery(template.title);
    setError(null);
  }, [adminGroups]);

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

  const updateCoverFile = (file: File | null) => {
    setForm((current) => {
      if (current.coverPreview) {
        URL.revokeObjectURL(current.coverPreview);
      }

      return {
        ...current,
        coverFile: file,
        coverPreview: file ? URL.createObjectURL(file) : "",
      };
    });
    setError(null);
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

  const toggleTag = (tagId: string) => {
    setForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId)
        ? current.tagIds.filter((id) => id !== tagId)
        : [...current.tagIds, tagId],
    }));
  };

  const clearLocationQuery = () => {
    setLocationQuery("");
    setDebouncedLocationQuery("");
    setLocationSuggestions([]);
    setLocationSearchError(null);
  };

  const resetForm = () => {
    setForm((current) => {
      if (current.coverPreview) {
        URL.revokeObjectURL(current.coverPreview);
      }

      return initialFormState;
    });
    setSelectedPosition(null);
    setLocationQuery("");
    setDebouncedLocationQuery("");
    setLocationSuggestions([]);
    setLocationSearchError(null);
    setActivityTemplateQuery("");
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
      tagIds: form.tagIds,
      groupId: form.linkedGroupId ? Number(form.linkedGroupId) : undefined,
    };

    try {
      setIsSaving(true);
      if (form.coverFile) {
        payload.cover = await uploadImageToR2(form.coverFile, "activities");
      }
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

  return {
    activityTemplateError,
    activityTemplateQuery,
    availableTags,
    clearLocationQuery,
    error,
    form,
    adminGroups,
    handleClose,
    handleSubmit,
    isLoadingActivityTemplates,
    isLoadingTags,
    isSaving,
    isSearchingLocation,
    locationQuery,
    locationSearchError,
    locationSuggestions,
    matchingActivityTemplates,
    selectActivityTemplate,
    selectMapPosition,
    selectSearchLocation,
    selectedPosition,
    setActivityTemplateQuery,
    setDebouncedLocationQuery,
    setLocationQuery,
    tagLoadError,
    toggleCategory,
    toggleTag,
    updateCoverFile,
    updateField,
  };
}
