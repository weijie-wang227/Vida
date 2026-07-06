import { Check, X } from "lucide-react";
import { ActivityDetailsFields } from "./createActivity/ActivityDetailsFields";
import { LocationSection } from "./createActivity/LocationSection";
import type { CreateActivityModalProps } from "./createActivity/types";
import { useCreateActivityForm } from "./createActivity/useCreateActivityForm";

export function CreateActivityModal({ open, onClose }: CreateActivityModalProps) {
  const activityForm = useCreateActivityForm({ open, onClose });

  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-5">
        <button
          type="button"
          onClick={activityForm.handleClose}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
          aria-label="Close create activity"
        >
          <X size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-foreground">
            Create Activity
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Drop a pin and add the essentials
          </p>
        </div>
        <button
          type="submit"
          form="create-activity-form"
          disabled={activityForm.isSaving}
          className="flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-bold text-accent-foreground disabled:opacity-65"
        >
          <Check size={13} />
          {activityForm.isSaving ? "Saving" : "Save"}
        </button>
      </div>

      <form
        id="create-activity-form"
        onSubmit={activityForm.handleSubmit}
        className="flex-1 overflow-y-auto px-4 pb-6 pt-4 scrollbar-minimal"
      >
        <LocationSection
          selectedPosition={activityForm.selectedPosition}
          locationQuery={activityForm.locationQuery}
          locationSuggestions={activityForm.locationSuggestions}
          isSearchingLocation={activityForm.isSearchingLocation}
          locationSearchError={activityForm.locationSearchError}
          onClearLocationQuery={activityForm.clearLocationQuery}
          onDebouncedLocationQueryChange={
            activityForm.setDebouncedLocationQuery
          }
          onLocationQueryChange={activityForm.setLocationQuery}
          onSelectMapPosition={activityForm.selectMapPosition}
          onSelectSearchLocation={activityForm.selectSearchLocation}
        />

        {activityForm.error && (
          <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
            {activityForm.error}
          </p>
        )}

        <ActivityDetailsFields
          adminGroups={activityForm.adminGroups}
          form={activityForm.form}
          onCategoryToggle={activityForm.toggleCategory}
          onFieldChange={activityForm.updateField}
        />
      </form>
    </div>
  );
}
