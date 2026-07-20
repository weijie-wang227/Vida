import { useEffect, useState } from "react";
import { CalendarDays, Loader2, UserRound, X } from "lucide-react";
import { fetchVendorChatUserActivities } from "../../api/chats";
import type {
  VendorChatMessage,
  VendorChatProfileActivity,
} from "../../api/types";

export type VendorChatProfileUser = VendorChatMessage["sender"];

export function ChatUserProfileDialog({
  user,
  onClose,
}: {
  user: VendorChatProfileUser | null;
  onClose: () => void;
}) {
  const [activities, setActivities] = useState<VendorChatProfileActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setActivities([]);
      setError(null);
      return;
    }

    let active = true;

    setIsLoading(true);
    setError(null);
    fetchVendorChatUserActivities(user.id)
      .then((rows) => {
        if (active) {
          setActivities(rows);
        }
      })
      .catch((loadError) => {
        if (active) {
          setActivities([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load activity history.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, user]);

  if (!user) {
    return null;
  }

  return (
    <div className="vendor-modal" role="dialog" aria-modal="true" aria-label={`${user.name} profile`}>
      <div className="vendor-modal__panel chat-profile-dialog">
        <div className="chat-profile-dialog__hero">
          <button
            type="button"
            className="icon-button chat-profile-dialog__close"
            onClick={onClose}
            aria-label="Close profile"
          >
            <X size={18} />
          </button>
          <div className="chat-profile-dialog__avatar">
            {user.avatar ? (
              <img src={user.avatar} alt="" />
            ) : (
              <UserRound size={30} />
            )}
          </div>
          <h2>{user.name}</h2>
          <span>{user.handle || "Vida member"}</span>
        </div>

        <section className="chat-profile-dialog__history">
          <h3><CalendarDays size={15} /> Past activities</h3>
          {isLoading ? (
            <div className="empty-state empty-state--compact">
              <Loader2 size={18} className="spin" />
              <span>Loading activities</span>
            </div>
          ) : error ? (
            <p className="chat-profile-dialog__note">{error}</p>
          ) : activities.length === 0 ? (
            <p className="chat-profile-dialog__note">No visible past activities.</p>
          ) : (
            <div className="chat-profile-dialog__activities">
              {activities.map((activity) => (
                <article key={String(activity.id)}>
                  <strong>{activity.title}</strong>
                  <span>{activity.location}</span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
