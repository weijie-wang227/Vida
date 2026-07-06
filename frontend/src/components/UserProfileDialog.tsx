import { useEffect, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { fetchPreviousActivities } from "../api/activities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../app/components/ui/dialog";
import type { PreviousActivity } from "../lib/types";

export type ProfileDialogUser = {
  id?: number | string;
  name: string;
  handle: string;
  avatar: string;
};

type UserProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ProfileDialogUser | null;
};

export function UserProfileDialog({
  open,
  onOpenChange,
  user,
}: UserProfileDialogProps) {
  const [previousActivities, setPreviousActivities] = useState<
    PreviousActivity[]
  >([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user?.id) {
      setPreviousActivities([]);
      setIsLoadingActivities(false);
      setActivityError(null);
      return;
    }

    let ignore = false;

    setIsLoadingActivities(true);
    setActivityError(null);

    fetchPreviousActivities(user.id)
      .then((activities) => {
        if (!ignore) {
          setPreviousActivities(activities);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setPreviousActivities([]);
          setActivityError(
            error instanceof Error
              ? error.message
              : "Unable to load past activities.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingActivities(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [open, user?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] rounded-2xl p-0 overflow-hidden">
        {user ? (
          <div>
            <div className="bg-secondary px-5 pb-5 pt-6 text-center">
              <img
                src={user.avatar}
                alt={user.name}
                className="mx-auto h-20 w-20 rounded-full border-4 border-background object-cover shadow-sm"
              />
              <DialogHeader className="mt-3 items-center gap-1 text-center">
                <DialogTitle className="text-lg font-bold text-foreground">
                  {user.name}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground">
                  {user.handle}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays size={14} className="text-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Past activities
                </h3>
              </div>

              {isLoadingActivities ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Loading activities
                </div>
              ) : activityError ? (
                <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                  {activityError}
                </p>
              ) : previousActivities.length > 0 ? (
                <div className="space-y-2">
                  {previousActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-xl border border-border bg-card px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {activity.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {activity.location}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                  No past activities yet.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
