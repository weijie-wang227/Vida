import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Timer,
  Users,
} from "lucide-react";
import type { GroupChat, vidaCategory } from "../../lib/types";
import { NumberStepper } from "./NumberStepper";
import type { CreateActivityFormState } from "./types";
import { vidaCategorySelector } from "./vidaCategorySelector";

export function ActivityDetailsFields({
  form,
  adminGroups,
  onCategoryToggle,
  onFieldChange,
}: {
  form: CreateActivityFormState;
  adminGroups: GroupChat[];
  onCategoryToggle: (category: vidaCategory) => void;
  onFieldChange: <Key extends keyof CreateActivityFormState>(
    field: Key,
    value: CreateActivityFormState[Key],
  ) => void;
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

      <vidaCategorySelector
        value={form.categories}
        onToggle={onCategoryToggle}
      />

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
