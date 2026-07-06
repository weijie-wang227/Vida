import {
  Edit3,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../app/components/ui/dropdown-menu";
import { formatRelativeTimeFromNow } from "../lib/time";
import type { FeedPost, FeedPostGroupReference } from "../lib/types";
import { ActivityCategoryIndicators } from "./ActivityCategoryIndicators";
import { FriendAvatar } from "./FriendAvatars";

type FeedPostCardProps = {
  post: FeedPost;
  liked: boolean;
  isLiking: boolean;
  isOwnPost: boolean;
  isDeleting: boolean;
  joinedReferencedGroup: boolean;
  onGroupButton: (group: FeedPostGroupReference) => void;
  onToggleLike: (postId: number) => void;
  onOpenComments: (postId: number) => void;
  onStartEdit: (postId: number) => void;
  onDelete: (postId: number) => void;
};

export function FeedPostCard({
  post,
  liked,
  isLiking,
  isOwnPost,
  isDeleting,
  joinedReferencedGroup,
  onGroupButton,
  onToggleLike,
  onOpenComments,
  onStartEdit,
  onDelete,
}: FeedPostCardProps) {
  const contextLabel = post.group?.name ?? post.activity;
  const hasCategorySummary =
    post.categories.length > 0 && post.durationMinutes !== undefined;

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <FriendAvatar
          user={{
            name: post.user,
            handle: post.handle,
            avatar: post.avatar,
          }}
          className="h-9 w-9"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">
            {post.user}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTimeFromNow(post.createdAt)}
            </span>
            {contextLabel && (
              <>
                <span className="text-muted-foreground opacity-40">/</span>
                <span className="truncate text-[10px] text-accent">
                  {contextLabel}
                </span>
              </>
            )}
          </div>
          {hasCategorySummary && (
            <div className="mt-1">
              <ActivityCategoryIndicators
                categories={post.categories}
                durationMinutes={post.durationMinutes ?? 0}
                variant="pills"
              />
            </div>
          )}
        </div>
        {isOwnPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-secondary"
                aria-label="Post menu"
              >
                {isDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MoreHorizontal size={16} />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                disabled={isDeleting}
                onSelect={() => onStartEdit(post.id)}
              >
                <Edit3 size={14} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isDeleting}
                variant="destructive"
                onSelect={() => onDelete(post.id)}
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {post.image && (
        <div className="aspect-[4/3] overflow-hidden bg-secondary">
          <img src={post.image} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="px-4 pb-1 pt-2.5">
        {post.group && (
          <button
            type="button"
            onClick={() => onGroupButton(post.group as FeedPostGroupReference)}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 text-left active:bg-secondary/60"
          >
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-secondary">
              <img
                src={post.group.avatar}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">
                {post.group.name}
              </p>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Users size={10} />
                <span>{post.group.members} members</span>
              </div>
            </div>
            <span className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-foreground">
              {joinedReferencedGroup ? "Open" : "Join"}
            </span>
          </button>
        )}

        <p className="text-[12px] leading-snug text-foreground">
          <span className="font-semibold">{post.user} </span>
          {post.caption}
        </p>

        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            disabled={isLiking}
            className="flex items-center gap-1.5"
            aria-label={liked ? "Unlike post" : "Like post"}
          >
            <Heart
              size={19}
              fill={liked ? "var(--brand-pink)" : "none"}
              stroke={liked ? "var(--brand-pink)" : "var(--muted-foreground)"}
              strokeWidth={1.5}
            />
            <span className="text-xs text-muted-foreground">
              {post.likesCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onOpenComments(post.id)}
            className="flex items-center gap-1.5"
            aria-label={`Open comments for ${post.user}'s post`}
          >
            <MessageCircle
              size={19}
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
            />
            <span className="text-xs text-muted-foreground">
              {post.comments}
            </span>
          </button>
          <button type="button" className="ml-auto" aria-label="Share post">
            <Share2
              size={17}
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>
      <div className="mx-4 mt-3 h-px bg-border" />
    </div>
  );
}
