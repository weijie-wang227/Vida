import {
  ImagePlus,
  Loader2,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { uploadImageToR2 } from "../api/uploads";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../app/components/ui/sheet";
import { FeedNotifications } from "../components/FeedNotifications";
import { FeedPostCard } from "../components/FeedPostCard";
import { FriendAvatar } from "../components/FriendAvatars";
import { FloatingActionButton } from "../components/FloatingActionButton";
import {
  categoryIcon,
  formatDuration,
  vidaCategories,
  vidaCategoryColor,
  vidaCategoryLabel,
} from "../lib/activityPresentation";
import type { FeedPostGroupReference, vidaCategory } from "../lib/types";
import { useAppState } from "../state";
import { formatRelativeTimeFromNow } from "../lib/time";

const maxImageBytes = 3 * 1024 * 1024;
const defaultCategories: vidaCategory[] = ["social"];
const hourOptions = [0, 1, 2, 3, 4, 5, 6];
const minuteOptions = [0, 15, 30, 45];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

export function FeedPage() {
  const {
    authUser,
    createFeedComment,
    createFeedPost,
    deleteFeedPost,
    feedComments,
    feedPosts,
    groupChats,
    joinGroup,
    loadFeedComments,
    likedPostIds,
    markNotificationAsRead,
    notifications,
    openGroup,
    profile,
    togglePostLike,
    updateFeedPost,
  } = useAppState();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedCategories, setSelectedCategories] =
    useState<vidaCategory[]>(defaultCategories);
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinuteRemainder, setDurationMinuteRemainder] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [joinPromptGroup, setJoinPromptGroup] =
    useState<FeedPostGroupReference | null>(null);
  const [joinPromptError, setJoinPromptError] = useState<string | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);
  const [commentPostId, setCommentPostId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [likingPostIds, setLikingPostIds] = useState<Record<number, boolean>>(
    {},
  );
  const [likeError, setLikeError] = useState<string | null>(null);
  const [feedActionError, setFeedActionError] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const selectedCommentPost =
    commentPostId === null
      ? null
      : (feedPosts.find((post) => post.id === commentPostId) ?? null);
  const selectedPostComments =
    commentPostId === null ? [] : (feedComments[commentPostId] ?? []);
  const selectedEditPost =
    editingPostId === null
      ? null
      : (feedPosts.find((post) => post.id === editingPostId) ?? null);
  const durationMinutes = durationHours * 60 + durationMinuteRemainder;

  const resetComposer = () => {
    setCaption("");
    setSelectedGroupId("");
    setSelectedCategories(defaultCategories);
    setDurationHours(1);
    setDurationMinuteRemainder(0);
    setImageFile(null);
    setImagePreviewUrl("");
    setImageName("");
    setComposerError(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setComposerError(null);

    if (!file.type.startsWith("image/")) {
      setComposerError("Choose a PNG, JPEG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > maxImageBytes) {
      setComposerError("Choose an image under 3 MB.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);

      setImageFile(file);
      setImagePreviewUrl(dataUrl);
      setImageName(file.name);
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Unable to read image.",
      );
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreviewUrl("");
    setImageName("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleCreatePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCaption = caption.trim();

    if (!trimmedCaption) {
      setComposerError("Write something before posting.");
      return;
    }

    if (selectedCategories.length === 0) {
      setComposerError("Choose at least one category.");
      return;
    }

    if (durationMinutes <= 0) {
      setComposerError("Choose an activity duration.");
      return;
    }

    setComposerError(null);
    setIsPosting(true);

    try {
      const uploadedImageUrl = imageFile
        ? await uploadImageToR2(imageFile, "posts")
        : undefined;

      await createFeedPost({
        caption: trimmedCaption,
        image: uploadedImageUrl,
        groupId: selectedGroupId ? Number(selectedGroupId) : undefined,
        categories: selectedCategories,
        durationMinutes,
      });
      resetComposer();
      setIsComposerOpen(false);
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Unable to create post.",
      );
    } finally {
      setIsPosting(false);
    }
  };

  const handleGroupButton = (group: FeedPostGroupReference) => {
    const currentGroup = groupChats.find((item) => item.id === group.id);

    if (currentGroup) {
      openGroup(currentGroup.id);
      return;
    }

    setJoinPromptError(null);
    setJoinPromptGroup(group);
  };

  const handleJoinGroup = async () => {
    if (!joinPromptGroup) {
      return;
    }

    setJoiningGroupId(joinPromptGroup.id);
    setJoinPromptError(null);

    try {
      await joinGroup(joinPromptGroup.id);
      setJoinPromptGroup(null);
    } catch (error) {
      setJoinPromptError(
        error instanceof Error ? error.message : "Unable to join group.",
      );
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleOpenComments = async (postId: number) => {
    setCommentPostId(postId);
    setCommentDraft("");
    setCommentsError(null);
    setIsLoadingComments(true);

    try {
      await loadFeedComments(postId);
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : "Unable to load comments.",
      );
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleCommentSheetChange = (open: boolean) => {
    if (open) {
      return;
    }

    setCommentPostId(null);
    setCommentDraft("");
    setCommentsError(null);
    setIsLoadingComments(false);
    setIsPostingComment(false);
  };

  const handleCreateComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (commentPostId === null) {
      return;
    }

    const body = commentDraft.trim();

    if (!body) {
      setCommentsError("Write a comment before sending.");
      return;
    }

    setCommentsError(null);
    setIsPostingComment(true);

    try {
      await createFeedComment(commentPostId, { body });
      setCommentDraft("");
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : "Unable to add comment.",
      );
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleTogglePostLike = async (postId: number) => {
    setLikingPostIds((current) => ({ ...current, [postId]: true }));
    setLikeError(null);

    try {
      await togglePostLike(postId);
    } catch (error) {
      setLikeError(
        error instanceof Error ? error.message : "Unable to update like.",
      );
    } finally {
      setLikingPostIds((current) => {
        const { [postId]: _postId, ...next } = current;

        return next;
      });
    }
  };

  const handleToggleComposerCategory = (category: vidaCategory) => {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        return current.filter((item) => item !== category);
      }

      return [...current, category];
    });
  };

  const handleStartEditPost = (postId: number) => {
    const post = feedPosts.find((item) => item.id === postId);

    if (!post) {
      return;
    }

    setEditingPostId(post.id);
    setEditCaption(post.caption);
    setFeedActionError(null);
  };

  const handleEditSheetChange = (open: boolean) => {
    if (open) {
      return;
    }

    setEditingPostId(null);
    setEditCaption("");
    setIsSavingEdit(false);
    setFeedActionError(null);
  };

  const handleSavePostEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingPostId === null) {
      return;
    }

    const caption = editCaption.trim();

    if (!caption) {
      setFeedActionError("Write something before saving.");
      return;
    }

    setIsSavingEdit(true);
    setFeedActionError(null);

    try {
      await updateFeedPost(editingPostId, { caption });
      setEditingPostId(null);
      setEditCaption("");
    } catch (error) {
      setFeedActionError(
        error instanceof Error ? error.message : "Unable to update post.",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    setDeletingPostId(postId);
    setFeedActionError(null);

    try {
      await deleteFeedPost(postId);

      if (commentPostId === postId) {
        handleCommentSheetChange(false);
      }

      if (editingPostId === postId) {
        handleEditSheetChange(false);
      }
    } catch (error) {
      setFeedActionError(
        error instanceof Error ? error.message : "Unable to delete post.",
      );
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-foreground">Feed</h1>
        <FeedNotifications
          notifications={notifications}
          onMarkAsRead={markNotificationAsRead}
        />
      </div>

      {likeError && (
        <p className="mx-4 mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
          {likeError}
        </p>
      )}

      {feedActionError && editingPostId === null && (
        <p className="mx-4 mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
          {feedActionError}
        </p>
      )}

      {isComposerOpen && (
        <div className="px-4 pb-3">
          <form
            onSubmit={handleCreatePost}
            className="rounded-2xl border border-border bg-card p-3 shadow-lg shadow-black/10"
          >
            <div className="flex gap-2.5">
              <FriendAvatar user={profile} className="h-9 w-9" />
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                className="min-h-[82px] min-w-0 flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Share something with your friends"
                maxLength={1200}
              />
            </div>

            {imagePreviewUrl && (
              <div className="relative mt-3 overflow-hidden rounded-xl bg-secondary">
                <img
                  src={imagePreviewUrl}
                  alt=""
                  className="max-h-64 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur"
                  aria-label="Remove selected image"
                >
                  <X size={15} />
                </button>
                {imageName && (
                  <p className="absolute bottom-2 left-2 max-w-[82%] truncate rounded-full bg-background/80 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">
                    {imageName}
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 grid gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  Reference group
                </span>
                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  disabled={groupChats.length === 0}
                  className="h-10 w-full rounded-xl border border-border bg-input-background px-3 text-xs text-foreground outline-none disabled:opacity-60"
                >
                  <option value="">No group</option>
                  {groupChats.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  Categories
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {vidaCategories.map((category) => {
                    const selected = selectedCategories.includes(category);
                    const color = vidaCategoryColor[category];

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleToggleComposerCategory(category)}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-bold transition"
                        style={{
                          borderColor: selected ? color : "var(--border)",
                          backgroundColor: selected
                            ? `${color}22`
                            : "transparent",
                          color: selected ? color : "var(--muted-foreground)",
                        }}
                        aria-pressed={selected}
                      >
                        {categoryIcon(category, 13)}
                        {vidaCategoryLabel[category]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  Duration
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="sr-only">Hours</span>
                    <select
                      value={durationHours}
                      onChange={(event) =>
                        setDurationHours(Number(event.target.value))
                      }
                      className="h-10 w-full rounded-xl border border-border bg-input-background px-3 text-xs text-foreground outline-none"
                    >
                      {hourOptions.map((hours) => (
                        <option key={hours} value={hours}>
                          {hours} {hours === 1 ? "hr" : "hrs"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="sr-only">Minutes</span>
                    <select
                      value={durationMinuteRemainder}
                      onChange={(event) =>
                        setDurationMinuteRemainder(Number(event.target.value))
                      }
                      className="h-10 w-full rounded-xl border border-border bg-input-background px-3 text-xs text-foreground outline-none"
                    >
                      {minuteOptions.map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {minutes} min
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {composerError && (
              <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {composerError}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                aria-label="Upload image"
              >
                <ImagePlus size={16} />
              </button>
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                {formatDuration(durationMinutes)} / {selectedCategories.length}{" "}
                selected
              </span>
              <button
                type="submit"
                disabled={
                  isPosting ||
                  !caption.trim() ||
                  selectedCategories.length === 0 ||
                  durationMinutes <= 0
                }
                className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-bold text-accent-foreground disabled:opacity-60"
              >
                {isPosting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Post
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        {feedPosts.map((post) => {
          const liked = Boolean(likedPostIds[post.id] ?? post.likedByMe);
          const isLiking = Boolean(likingPostIds[post.id]);
          const joinedReferencedGroup = post.group
            ? groupChats.some((group) => group.id === post.group?.id)
            : false;
          const isOwnPost =
            post.handle === authUser?.handle || post.handle === profile.handle;
          const isDeleting = deletingPostId === post.id;

          return (
            <FeedPostCard
              key={post.id}
              post={post}
              liked={liked}
              isLiking={isLiking}
              isOwnPost={isOwnPost}
              isDeleting={isDeleting}
              joinedReferencedGroup={joinedReferencedGroup}
              onGroupButton={handleGroupButton}
              onToggleLike={handleTogglePostLike}
              onOpenComments={handleOpenComments}
              onStartEdit={handleStartEditPost}
              onDelete={handleDeletePost}
            />
          );
        })}
        <div className="h-6" />
      </div>

      <FloatingActionButton
        onClick={() => {
          setIsComposerOpen((current) => !current);
          setComposerError(null);
        }}
        aria-label={isComposerOpen ? "Close post composer" : "Add post"}
      >
        {isComposerOpen ? (
          <X size={21} color="var(--accent-foreground)" strokeWidth={2.5} />
        ) : (
          <Plus size={22} color="var(--accent-foreground)" strokeWidth={2.5} />
        )}
      </FloatingActionButton>

      <Sheet
        open={commentPostId !== null}
        onOpenChange={handleCommentSheetChange}
      >
        <SheetContent
          side="bottom"
          className="max-h-[86vh] gap-0 rounded-t-3xl border-border p-0 sm:mx-auto sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-4 pb-3 pr-12 pt-5 text-left">
            <SheetTitle className="truncate text-base">
              {selectedCommentPost
                ? `${selectedCommentPost.user}'s post`
                : "Comments"}
            </SheetTitle>
            <SheetDescription>
              {selectedCommentPost
                ? `${selectedCommentPost.comments} comments`
                : "Post comments"}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-[220px] flex-1 overflow-y-auto px-4 py-3 scrollbar-minimal">
            {isLoadingComments ? (
              <div className="flex min-h-[180px] items-center justify-center">
                <Loader2
                  size={18}
                  className="animate-spin text-muted-foreground"
                />
              </div>
            ) : selectedPostComments.length > 0 ? (
              <div className="space-y-3">
                {selectedPostComments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <FriendAvatar
                      user={{
                        name: comment.user,
                        handle: comment.handle,
                        avatar: comment.avatar,
                      }}
                      className="h-8 w-8"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-xs font-bold text-foreground">
                          {comment.user}
                        </p>
                        <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                          {formatRelativeTimeFromNow(comment.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-[12px] leading-relaxed text-foreground">
                        {comment.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[180px] items-center justify-center text-center">
                <p className="max-w-[220px] text-sm leading-relaxed text-muted-foreground">
                  No comments yet.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border bg-background px-4 py-3">
            {commentsError && (
              <p className="mb-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {commentsError}
              </p>
            )}
            <form
              onSubmit={handleCreateComment}
              className="flex items-end gap-2 rounded-2xl bg-secondary px-3 py-2"
            >
              <FriendAvatar user={profile} className="h-8 w-8" />
              <textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                className="max-h-24 min-h-8 min-w-0 flex-1 resize-none bg-transparent py-1 text-sm leading-snug text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Add a comment"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!commentDraft.trim() || isPostingComment}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-60"
                aria-label="Send comment"
              >
                {isPostingComment ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={editingPostId !== null} onOpenChange={handleEditSheetChange}>
        <SheetContent
          side="bottom"
          className="gap-0 rounded-t-3xl border-border p-0 sm:mx-auto sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-4 pb-3 pr-12 pt-5 text-left">
            <SheetTitle className="text-base">Edit post</SheetTitle>
            <SheetDescription>Update the body of your post.</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSavePostEdit} className="px-4 py-4">
            <textarea
              value={editCaption}
              onChange={(event) => setEditCaption(event.target.value)}
              className="min-h-[140px] w-full resize-none rounded-2xl border border-border bg-input-background px-3 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Edit your post"
              maxLength={1200}
              autoFocus
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                {editCaption.length}/1200
              </span>
              {selectedEditPost && (
                <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                  {formatRelativeTimeFromNow(selectedEditPost.createdAt)}
                </span>
              )}
            </div>

            {feedActionError && (
              <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {feedActionError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleEditSheetChange(false)}
                className="h-11 rounded-2xl bg-secondary text-sm font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSavingEdit ||
                  !editCaption.trim() ||
                  editCaption.trim() === selectedEditPost?.caption
                }
                className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent text-sm font-bold text-accent-foreground disabled:opacity-70"
              >
                {isSavingEdit && <Loader2 size={15} className="animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {joinPromptGroup && (
        <div className="absolute inset-0 z-50 flex items-end bg-background/70 p-4 backdrop-blur-sm">
          <div className="w-full rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-secondary">
                <img
                  src={joinPromptGroup.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold text-foreground">
                  {joinPromptGroup.name}
                </h2>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users size={12} />
                  <span>{joinPromptGroup.members} members</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Join this group to open the chat and keep up with future plans.
            </p>

            {joinPromptError && (
              <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {joinPromptError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setJoinPromptGroup(null);
                  setJoinPromptError(null);
                }}
                className="h-11 rounded-2xl bg-secondary text-sm font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleJoinGroup}
                disabled={joiningGroupId === joinPromptGroup.id}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent text-sm font-bold text-accent-foreground disabled:opacity-70"
              >
                {joiningGroupId === joinPromptGroup.id && (
                  <Loader2 size={15} className="animate-spin" />
                )}
                Join group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
