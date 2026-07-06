import { useState } from "react";
import { UserRound } from "lucide-react";
import type { Friend } from "../lib/types";
import {
  UserProfileDialog,
  type ProfileDialogUser,
} from "./UserProfileDialog";

type FriendAvatarsProps = {
  friends: Friend[];
  max?: number;
};

type FriendAvatarProps = {
  user: ProfileDialogUser;
  className?: string;
  imageClassName?: string;
  disabled?: boolean;
};

export function FriendAvatar({
  user,
  className = "h-5 w-5",
  imageClassName = "",
  disabled = false,
}: FriendAvatarProps) {
  const [open, setOpen] = useState(false);
  const fallbackInitial = user.name[0] ?? user.handle[1] ?? "?";
  const baseClassName =
    "relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary transition-transform";
  const interactiveClassName =
    "hover:z-10 hover:scale-110 focus:z-10 focus:outline-none focus:ring-2 focus:ring-accent";

  if (disabled) {
    return (
      <span className={`${baseClassName} ${className}`}>
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className={`h-full w-full object-cover ${imageClassName}`}
          />
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground">
            {fallbackInitial}
          </span>
        )}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
        className={`${baseClassName} ${interactiveClassName} ${className}`}
        aria-label={`View ${user.name}'s profile`}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt=""
            className={`h-full w-full object-cover ${imageClassName}`}
          />
        ) : (
          <UserRound size={14} className="text-muted-foreground" />
        )}
      </button>
      <UserProfileDialog open={open} onOpenChange={setOpen} user={user} />
    </>
  );
}

export function FriendAvatars({ friends, max = 3 }: FriendAvatarsProps) {
  const shown = friends.slice(0, max);
  const extra = friends.length - max;

  return (
    <>
      <div className="flex items-center gap-1 mt-2">
        <div className="flex -space-x-1.5">
          {shown.map((friend) => (
            <FriendAvatar
              key={friend.id}
              user={friend}
              className="h-5 w-5 border border-card"
            />
          ))}
          {extra > 0 && (
            <div className="w-5 h-5 rounded-full border border-card bg-secondary flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground font-semibold">
                +{extra}
              </span>
            </div>
          )}
        </div>
        {friends.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {shown[0]?.name.split(" ")[0]}
            {shown.length > 1
              ? ` & ${friends.length - 1} friend${
                  friends.length - 1 > 1 ? "s" : ""
                } joining`
              : " is joining"}
          </span>
        )}
      </div>
    </>
  );
}
