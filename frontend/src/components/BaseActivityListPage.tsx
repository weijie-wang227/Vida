import { ChevronLeft, Heart, Loader2, RefreshCw } from "lucide-react";
import type { Activity } from "../lib/types";
import { StandardRow } from "./ActivityCards";

export function BaseActivityListPage({
  title,
  activities,
  isLoading,
  errorMessage,
  emptyMessage,
  onBack,
  onRetry,
  onFavoriteChanged,
}: {
  title: string;
  activities: Activity[];
  isLoading: boolean;
  errorMessage: string | null;
  emptyMessage: string;
  onBack: () => void;
  onRetry: () => void;
  onFavoriteChanged?: (activity: Activity, favorited: boolean) => void;
}) {
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-16 flex-shrink-0 items-center border-b border-border bg-card px-2.5 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition active:bg-secondary"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="min-w-0 flex-1 truncate pl-1.5 text-xl font-bold text-foreground">
          {title}
        </h1>
      </header>

      {isLoading && activities.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-[#2852a4]" />
        </div>
      ) : errorMessage && activities.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2852a4] px-4 text-sm font-semibold text-white"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf0ff]">
            <Heart size={27} className="text-[#2852a4]" />
          </span>
          <p className="mt-4 text-base font-semibold text-foreground">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-3 scrollbar-minimal">
          {errorMessage && (
            <p className="mx-5 mb-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
              {errorMessage}
            </p>
          )}
          {activities.map((activity) => (
            <StandardRow
              key={activity.id}
              activity={activity}
              onFavoriteChanged={(favorited) =>
                onFavoriteChanged?.(activity, favorited)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
