import { CalendarDays, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchVendorActivities, fetchVendorProfile } from "../api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../app/components/ui/dialog";
import { formatActivityDate, formatActivityTime } from "../lib/activityPresentation";
import type { VendorActivity, VendorStats, VendorSummary } from "../lib/types";

type VendorProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: VendorSummary | null;
};

function VendorAvatar({ vendor }: { vendor: VendorSummary }) {
  if (vendor.profileUrl) {
    return (
      <img
        src={vendor.profileUrl}
        alt={vendor.name}
        className="mx-auto h-20 w-20 rounded-full border-4 border-background object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-background bg-accent text-2xl font-bold text-accent-foreground shadow-sm">
      {vendor.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-center">
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function VendorProfileDialog({
  open,
  onOpenChange,
  vendor,
}: VendorProfileDialogProps) {
  const [profile, setProfile] = useState<VendorSummary | null>(vendor);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [activities, setActivities] = useState<VendorActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const vendorId = vendor?.id;

  useEffect(() => {
    setProfile(vendor);
    setStats(null);
    setActivities([]);
    setError(null);

    if (!open || !vendorId) {
      return;
    }

    let ignore = false;

    Promise.all([fetchVendorProfile(vendorId), fetchVendorActivities(vendorId)])
      .then(([profileResponse, activitiesResponse]) => {
        if (ignore) {
          return;
        }

        setProfile(profileResponse.vendor ?? vendor);
        setStats(activitiesResponse.stats ?? profileResponse.stats);
        setActivities(activitiesResponse.activities);
      })
      .catch((loadError) => {
        if (!ignore) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load vendor profile.",
          );
        }
      });

    return () => {
      ignore = true;
    };
  }, [open, vendor, vendorId]);

  const currentVendor = profile ?? vendor;
  const pastActivities = activities.filter((activity) => {
    const startsAt = new Date(activity.startsAt).getTime();

    return Number.isFinite(startsAt) && startsAt <= Date.now();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] overflow-hidden rounded-2xl p-0">
        {currentVendor ? (
          <div>
            <div className="bg-secondary px-5 pb-5 pt-6 text-center">
              <VendorAvatar vendor={currentVendor} />
              <DialogHeader className="mt-3 items-center gap-1 text-center">
                <DialogTitle className="text-lg font-bold text-foreground">
                  {currentVendor.name}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground">
                  {currentVendor.description || "Vendor profile"}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-5 py-4 scrollbar-minimal">
              {stats && (
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <StatTile label="Activities" value={stats.activities} />
                  <StatTile label="Attended" value={stats.peopleAttended} />
                  <StatTile label="Rating" value={stats.averageRating || "-"} />
                </div>
              )}

              <div className="mb-3 flex items-center gap-2">
                <CalendarDays size={14} className="text-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Past activities
                </h3>
              </div>

              {error ? (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive-foreground">
                  {error}
                </p>
              ) : pastActivities.length > 0 ? (
                <div className="space-y-2">
                  {pastActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-xl border border-border bg-card px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {activity.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatActivityDate(activity.startsAt)} /{" "}
                        {formatActivityTime(activity.startsAt)} /{" "}
                        {activity.location}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {activity.attendance}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star size={11} fill="currentColor" stroke="none" />
                          {activity.rating || "-"}
                        </span>
                      </div>
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
