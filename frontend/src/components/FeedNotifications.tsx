import { Bell, Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../app/components/ui/sheet";
import { formatRelativeTimeFromNow } from "../lib/time";
import type { Notification } from "../lib/types";

type FeedNotificationsProps = {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => Promise<void>;
};

export function FeedNotifications({
  notifications,
  onMarkAsRead,
}: FeedNotificationsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showReviewSubmitted, setShowReviewSubmitted] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpenNotifications = params.get("notifications") === "1";
    const shouldShowReviewSubmitted = params.get("reviewSubmitted") === "1";

    if (!shouldOpenNotifications && !shouldShowReviewSubmitted) {
      return;
    }

    setIsOpen(true);
    setShowReviewSubmitted(shouldShowReviewSubmitted);
    params.delete("notifications");
    params.delete("reviewSubmitted");
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  const handleNotificationClick = async (
    link: string | undefined,
    notificationId: string,
  ) => {
    if (!link) {
      return;
    }

    setMarkingReadId(notificationId);

    try {
      await onMarkAsRead(notificationId);
    } finally {
      setMarkingReadId(null);
    }

    setIsOpen(false);
    navigate(link);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingReadId(notificationId);

    try {
      await onMarkAsRead(notificationId);
    } finally {
      setMarkingReadId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
        aria-label="Notifications"
      >
        <Bell size={15} className="text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
        )}
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[78vh] gap-0 rounded-t-3xl border-border p-0 sm:mx-auto sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-4 pb-3 pr-12 pt-5 text-left">
            <SheetTitle className="text-base">Notifications</SheetTitle>
            <SheetDescription>
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "You're all caught up"}
            </SheetDescription>
          </SheetHeader>

          <div className="max-h-[58vh] overflow-y-auto px-4 py-3 scrollbar-minimal">
            {showReviewSubmitted && (
              <div className="mb-3 flex gap-3 rounded-2xl border border-border bg-secondary px-3 py-3">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground">
                    Review submitted
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    Thanks for sharing your feedback.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewSubmitted(false)}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-background/70 text-muted-foreground"
                  aria-label="Dismiss review submitted message"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex gap-3 rounded-2xl border border-border bg-card px-3 py-3"
                  >
                    <span
                      className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                        notification.read ? "bg-muted" : "bg-accent"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleNotificationClick(
                          notification.link,
                          notification.id,
                        )
                      }
                      disabled={!notification.link}
                      className="min-w-0 flex-1 text-left disabled:cursor-default"
                    >
                      <span className="block text-xs font-bold text-foreground">
                        {notification.title}
                      </span>
                      <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">
                        {notification.content}
                      </span>
                      <span className="mt-2 block text-[10px] font-semibold text-muted-foreground">
                        {formatRelativeTimeFromNow(notification.dateReceived)}
                      </span>
                    </button>
                    {!notification.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={markingReadId === notification.id}
                        className="self-start rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-foreground disabled:opacity-60"
                      >
                        {markingReadId === notification.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          "Mark as read"
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[180px] items-center justify-center text-center">
                <p className="max-w-[220px] text-sm leading-relaxed text-muted-foreground">
                  No notifications yet.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
