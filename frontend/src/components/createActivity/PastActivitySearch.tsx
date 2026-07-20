import { Clock3, Loader2 } from "lucide-react";
import { useState } from "react";
import { BaseSearchBar } from "../BaseSearchBar";
import type { ActivityTemplate } from "../../lib/types";

export function PastActivitySearch({
  activities,
  error,
  isLoading,
  onQueryChange,
  onSelectActivity,
  query,
}: {
  activities: ActivityTemplate[];
  error: string | null;
  isLoading: boolean;
  onQueryChange: (value: string) => void;
  onSelectActivity: (activity: ActivityTemplate) => void;
  query: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card/75 p-3">
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Clock3 size={13} />
          Copy From Past Session
        </span>
        <BaseSearchBar
          value={query}
          onValueChange={onQueryChange}
          onBlur={() => setIsFocused(false)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search activities you created"
          className="flex h-11 items-center gap-2 rounded-xl border border-border bg-input-background px-3"
          iconSize={15}
          endAdornment={
            isLoading ? (
              <Loader2
                size={15}
                className="animate-spin text-muted-foreground"
              />
            ) : null
          }
        />
      </label>

      {error && <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>}

      {isFocused && activities.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border">
          {activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelectActivity(activity);
                setIsFocused(false);
              }}
              className="block w-full border-b border-border bg-background px-3 py-2 text-left last:border-b-0 hover:bg-secondary"
            >
              <span className="block truncate text-sm font-bold text-foreground">
                {activity.title}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {activity.location}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
