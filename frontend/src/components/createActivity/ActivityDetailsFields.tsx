import {
  Calendar,
  Clock,
  Image,
  MapPin,
  MessageCircle,
  Tag,
  Timer,
  Users,
} from "lucide-react";
import type { AvailableTag, GroupChat, vidaCategory } from "../../lib/types";
import { NumberStepper } from "./NumberStepper";
import type { CreateActivityFormState } from "./types";
import { VitaCategorySelector } from "./VitaCategorySelector";

export function ActivityDetailsFields({
  form,
  adminGroups,
  availableTags,
  isLoadingTags,
  onCategoryToggle,
  onCoverFileChange,
  onFieldChange,
  onTagToggle,
  tagLoadError,
}: {
  form: CreateActivityFormState;
  adminGroups: GroupChat[];
  availableTags: AvailableTag[];
  isLoadingTags: boolean;
  onCategoryToggle: (category: vidaCategory) => void;
  onCoverFileChange: (file: File | null) => void;
  onFieldChange: <Key extends keyof CreateActivityFormState>(
    field: Key,
    value: CreateActivityFormState[Key],
  ) => void;
  onTagToggle: (tagId: string) => void;
  tagLoadError: string | null;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
          Title
        </span>
        <input
          value={form.title}
          onChange={(event) => onFieldChange("title", event.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-input-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Morning qigong in the park"
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Image size={13} />
          Cover Image
        </span>
        <div className="rounded-xl border border-border bg-input-background p-3">
          {form.coverPreview ? (
            <img
              src={form.coverPreview}
              alt=""
              className="mb-3 h-32 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-muted-foreground">
              No cover selected
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                onCoverFileChange(event.target.files?.[0] ?? null)
              }
              className="min-w-0 flex-1 text-xs text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-foreground"
            />
            {form.coverFile && (
              <button
                type="button"
                onClick={() => onCoverFileChange(null)}
                className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-foreground"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </label>

      {adminGroups.length > 0 && (
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <MessageCircle size={13} />
            Tag Group Chat
          </span>
          <select
            value={form.linkedGroupId}
            onChange={(event) =>
              onFieldChange("linkedGroupId", event.target.value)
            }
            className="h-11 w-full rounded-xl border border-border bg-input-background px-3 text-sm text-foreground outline-none"
          >
            <option value="">New group chat</option>
            {adminGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
          Place Name
        </span>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-input-background px-3">
          <MapPin size={15} className="text-muted-foreground" />
          <input
            value={form.location}
            onChange={(event) => onFieldChange("location", event.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Bishan-Ang Mo Kio Park"
            required
          />
        </div>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Calendar size={13} />
            Date
          </span>
          <input
            type="date"
            value={form.date}
            onChange={(event) => onFieldChange("date", event.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-input-background px-3 text-sm text-foreground outline-none"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Clock size={13} />
            Time
          </span>
          <input
            type="time"
            value={form.time}
            onChange={(event) => onFieldChange("time", event.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-input-background px-3 text-sm text-foreground outline-none"
            required
          />
        </label>
      </div>

      <VitaCategorySelector
        value={form.categories}
        onToggle={onCategoryToggle}
      />

      <fieldset>
        <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Tag size={13} />
          Tags
        </legend>
        {isLoadingTags ? (
          <p className="text-xs text-muted-foreground">Loading available tags...</p>
        ) : tagLoadError ? (
          <p className="text-xs text-destructive-foreground">{tagLoadError}</p>
        ) : availableTags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tags are available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = form.tagIds.includes(tag.id);

              return (
                <label
                  key={tag.id}
                  className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${
                    isSelected
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border bg-input-background text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onTagToggle(tag.id)}
                    className="accent-accent"
                  />
                  {tag.name}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <NumberStepper
          icon={<Timer size={12} />}
          label="Duration"
          min={15}
          step={15}
          suffix="minutes"
          value={form.durationMinutes}
          onChange={(value) => onFieldChange("durationMinutes", value)}
        />
        <NumberStepper
          icon={<Users size={12} />}
          label="Spots"
          min={1}
          step={1}
          suffix="open spots"
          value={form.spots}
          onChange={(value) => onFieldChange("spots", value)}
        />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
          Credits
        </span>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-input-background px-3">
          <input
            type="number"
            min={0}
            step={1}
            value={form.credits}
            onChange={(event) => onFieldChange("credits", event.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
            required
          />
          <span className="text-xs font-semibold text-muted-foreground">
            credits
          </span>
        </div>
      </label>
    </div>
  );
}
