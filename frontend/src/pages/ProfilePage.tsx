import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertCircle,
  AtSign,
  CheckCircle2,
  Check,
  FileText,
  ImagePlus,
  Edit3,
  Loader2,
  LogOut,
  MessageCircle,
  QrCode,
  Settings,
  Trash2,
  UserRound,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../app/components/ui/alert-dialog";
import { checkHandleAvailability, searchFriendsByHandle } from "../api/profile";
import { uploadImageToR2 } from "../api/uploads";
import { BaseSearchBar } from "../components/BaseSearchBar";
import { FriendAvatar } from "../components/FriendAvatars";
import type { FriendSearchResult } from "../lib/types";
import { useAppState } from "../state";

const maxProfileImageBytes = 3 * 1024 * 1024;
const maxBioLength = 240;

function normalizeProfileHandle(value: string, fallback: string) {
  const base = (value || fallback)
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]+/g, "");

  return `@${(base || "vidauser").slice(0, 24)}`;
}

function hasHandleCharacters(value: string) {
  return /[a-z0-9_]/i.test(value.replace(/^@+/, ""));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const {
    addFriend,
    authUser,
    clearFriendInviteResult,
    friends,
    friendInviteFeedback,
    friendInviteFriend,
    profile,
    removeFriend,
    signOut,
    showProfileFriends,
    openSettings,
    setShowProfileFriends,
    updateProfile,
  } = useAppState();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [shareFeedback, setShareFeedback] = useState("");
  const [addFriendSearchQuery, setAddFriendSearchQuery] = useState("");
  const [debouncedAddFriendSearchQuery, setDebouncedAddFriendSearchQuery] =
    useState("");
  const [friendSearchResults, setFriendSearchResults] = useState<
    FriendSearchResult[]
  >([]);
  const [friendSearchError, setFriendSearchError] = useState<string | null>(
    null,
  );
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
  const [addFriendFeedback, setAddFriendFeedback] = useState<string | null>(
    null,
  );
  const [removeFriendFeedback, setRemoveFriendFeedback] = useState<string | null>(
    null,
  );
  const [removingFriendId, setRemovingFriendId] = useState<number | null>(null);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [debouncedFriendSearchQuery, setDebouncedFriendSearchQuery] =
    useState("");
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editHandle, setEditHandle] = useState(profile.handle);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editAvatar, setEditAvatar] = useState(profile.avatar);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState("");
  const [editImageName, setEditImageName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [handleStatus, setHandleStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const inviteUrl =
    authUser?.id && typeof window !== "undefined"
      ? `${window.location.origin}/profile?friendId=${encodeURIComponent(
          authUser.id,
        )}`
      : "";
  const qrFeedback = shareFeedback;
  const activeAddFriendSearchQuery = debouncedAddFriendSearchQuery.trim();
  const activeFriendSearchQuery = debouncedFriendSearchQuery.toLowerCase();
  const filteredFriends = activeFriendSearchQuery
    ? friends.filter((friend) =>
        [friend.name, friend.handle]
          .join(" ")
          .toLowerCase()
          .includes(activeFriendSearchQuery),
      )
    : friends;
  const editedAvatarSrc = editAvatarPreview || editAvatar;
  const handleNotice =
    handleStatus === "checking"
      ? "Checking handle"
      : handleStatus === "available"
        ? "Handle available"
        : handleStatus === "taken"
          ? "That handle is already in use. Please choose another."
          : "";
  const friendHandles = new Set(friends.map((friend) => friend.handle));

  useEffect(() => {
    if (!activeAddFriendSearchQuery) {
      setFriendSearchResults([]);
      setFriendSearchError(null);
      setIsSearchingFriends(false);
      return;
    }

    let ignore = false;

    setIsSearchingFriends(true);
    setFriendSearchError(null);

    searchFriendsByHandle(activeAddFriendSearchQuery)
      .then((results) => {
        if (ignore) {
          return;
        }

        setFriendSearchResults(results);
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        setFriendSearchResults([]);
        setFriendSearchError(
          error instanceof Error ? error.message : "Unable to search users.",
        );
      })
      .finally(() => {
        if (!ignore) {
          setIsSearchingFriends(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeAddFriendSearchQuery]);

  const openEditProfile = () => {
    setEditName(profile.name);
    setEditHandle(profile.handle);
    setEditBio(profile.bio);
    setEditAvatar(profile.avatar);
    setEditAvatarFile(null);
    setEditAvatarPreview("");
    setEditImageName("");
    setEditError(null);
    setHandleStatus("idle");
    setIsEditProfileOpen(true);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const closeEditProfile = () => {
    if (isSavingProfile) {
      return;
    }

    setIsEditProfileOpen(false);
    setEditError(null);
  };

  const ensureHandleAvailable = async (candidate: string) => {
    if (!candidate.trim() || !hasHandleCharacters(candidate)) {
      setHandleStatus("taken");
      setEditError("Handle must include letters, numbers, or underscores.");
      return null;
    }

    const normalizedHandle = normalizeProfileHandle(candidate, editName);
    setEditHandle(normalizedHandle);

    if (normalizedHandle === profile.handle) {
      setHandleStatus("idle");
      return normalizedHandle;
    }

    setHandleStatus("checking");

    const availability = await checkHandleAvailability(normalizedHandle);
    setEditHandle(availability.handle);

    if (!availability.available) {
      setHandleStatus("taken");
      setEditError(
        availability.message ||
          "That handle is already in use. Please choose another.",
      );
      return null;
    }

    setHandleStatus("available");
    setEditError(null);
    return availability.handle;
  };

  const handleEditHandleBlur = async () => {
    try {
      await ensureHandleAvailable(editHandle);
    } catch (error) {
      setHandleStatus("idle");
      setEditError(
        error instanceof Error ? error.message : "Unable to check handle.",
      );
    }
  };

  const handleProfileImageChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setEditError(null);

    if (!file.type.startsWith("image/")) {
      setEditError("Choose a PNG, JPEG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > maxProfileImageBytes) {
      setEditError("Choose an image under 3 MB.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);

      setEditAvatarFile(file);
      setEditAvatarPreview(dataUrl);
      setEditImageName(file.name);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Unable to read image.",
      );
    }
  };

  const clearProfileImageFile = () => {
    setEditAvatarFile(null);
    setEditAvatarPreview("");
    setEditImageName("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleShareProfileLink = async () => {
    if (!inviteUrl) {
      setShareFeedback("Sign in again to create your profile link.");
      return;
    }

    const shareData = {
      title: `${profile.name} on vida`,
      text: `Add ${profile.name} as a friend on vida.`,
      url: inviteUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareFeedback("Profile link shared.");
        return;
      }

      await navigator.clipboard.writeText(inviteUrl);
      setShareFeedback("Profile link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        await navigator.clipboard.writeText(inviteUrl);
        setShareFeedback("Profile link copied.");
      } catch {
        setShareFeedback(inviteUrl);
      }
    }
  };

  const handleAddDiscoveredFriend = async (friend: FriendSearchResult) => {
    setAddingFriendId(friend.id);
    setAddFriendFeedback(null);

    try {
      const addedFriend = await addFriend(friend.id);

      setShowProfileFriends(false);
      setAddFriendFeedback(`${addedFriend.name} added successfully.`);
    } catch (error) {
      setAddFriendFeedback(
        error instanceof Error ? error.message : "Unable to add friend.",
      );
    } finally {
      setAddingFriendId(null);
    }
  };

  const handleRemoveFriend = async (friendId: number, friendName: string) => {
    setRemovingFriendId(friendId);
    setRemoveFriendFeedback(null);

    try {
      await removeFriend(friendId);
      setRemoveFriendFeedback(`${friendName} removed from your friends.`);
    } catch (error) {
      setRemoveFriendFeedback(
        error instanceof Error ? error.message : "Unable to remove friend.",
      );
    } finally {
      setRemovingFriendId(null);
    }
  };

  const handleEditProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = editName.trim();
    const bio = editBio.trim();

    if (!name) {
      setEditError("Name is required.");
      return;
    }

    if (bio.length > maxBioLength) {
      setEditError(`Bio must be ${maxBioLength} characters or less.`);
      return;
    }

    setEditError(null);
    setIsSavingProfile(true);

    try {
      const availableHandle = await ensureHandleAvailable(editHandle);

      if (!availableHandle) {
        return;
      }

      const avatar = editAvatarFile
        ? await uploadImageToR2(editAvatarFile, "profiles")
        : editAvatar.trim();

      await updateProfile({
        name,
        handle: availableHandle,
        bio,
        avatar,
      });
      setIsEditProfileOpen(false);
      clearProfileImageFile();
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Unable to update profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-background">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <h2 className="text-base font-semibold text-foreground flex-1">
          My Profile
        </h2>
        <button
          type="button"
          onClick={openSettings}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Open settings"
        >
          <Settings size={14} className="text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={openEditProfile}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Edit profile"
        >
          <Edit3 size={14} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        <div className="flex flex-col items-center px-4 pb-5">
          <div className="relative mb-3">
            <FriendAvatar
              user={{ ...profile, id: authUser?.id }}
              className="h-20 w-20 border-2 border-accent"
            />
          </div>
          <h2 className="text-lg font-bold text-foreground">{profile.name}</h2>
          <p className="text-xs text-accent font-medium mb-1">
            {profile.handle}
          </p>
          <p className="text-[12px] text-muted-foreground text-center leading-relaxed max-w-[260px]">
            {profile.bio}
          </p>

          <div className="flex gap-6 mt-4 py-3 border-y border-border w-full justify-center">
            {profile.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="text-base font-bold text-foreground">
                  {stat.value}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex bg-secondary rounded-xl p-1 mb-4">
            {[
              { id: false, icon: <QrCode size={13} />, label: "Add Friends" },
              { id: true, icon: <Users size={13} />, label: "Friends" },
            ].map((item) => (
              <button
                key={String(item.id)}
                onClick={() => setShowProfileFriends(item.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  showProfileFriends === item.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          {!showProfileFriends ? (
            <div className="flex flex-col bg-card rounded-2xl p-5 border border-border">
              <BaseSearchBar
                value={addFriendSearchQuery}
                onValueChange={(value) => {
                  setAddFriendSearchQuery(value);
                  setAddFriendFeedback(null);
                }}
                onDebouncedQueryChange={setDebouncedAddFriendSearchQuery}
                placeholder="Search handles"
                ariaLabel="Search users by handle"
                className="flex h-10 items-center gap-2 rounded-xl bg-secondary px-3"
                inputClassName="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                iconSize={17}
                clearable
                minLength={2}
              />
              {activeAddFriendSearchQuery ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-border">
                  {isSearchingFriends ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                      <Loader2 size={13} className="animate-spin" />
                      Searching
                    </div>
                  ) : friendSearchError ? (
                    <p className="px-3 py-4 text-center text-xs text-destructive-foreground">
                      {friendSearchError}
                    </p>
                  ) : friendSearchResults.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No discoverable users found.
                    </p>
                  ) : (
                    friendSearchResults.map((friend, index) => {
                      const alreadyFriend = friendHandles.has(friend.handle);
                      const isAdding = addingFriendId === friend.id;

                      return (
                        <div
                          key={friend.id}
                          className={`flex items-center gap-3 px-3 py-2.5 ${
                            index < friendSearchResults.length - 1
                              ? "border-b border-border"
                              : ""
                          }`}
                        >
                          <FriendAvatar user={friend} className="h-9 w-9" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-semibold text-foreground">
                              {friend.name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {friend.handle}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddDiscoveredFriend(friend)}
                            disabled={alreadyFriend || isAdding}
                            className="flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-[11px] font-bold text-accent-foreground disabled:bg-secondary disabled:text-muted-foreground"
                          >
                            {isAdding ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : alreadyFriend ? (
                              <Check size={12} />
                            ) : (
                              <UserPlus size={12} />
                            )}
                            {alreadyFriend ? "Added" : "Add"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
              {addFriendFeedback ? (
                <p
                  className="mt-2 max-w-full break-words text-center text-[11px] text-muted-foreground"
                  aria-live="polite"
                >
                  {addFriendFeedback}
                </p>
              ) : null}
              <p className="mt-5 text-xs text-muted-foreground mb-4 text-center">
                Scan to add {profile.name} as a friend
              </p>
              <div className="mx-auto w-40 h-40 bg-white rounded-xl p-2.5 mb-4">
                {inviteUrl ? (
                  <QRCodeSVG
                    value={inviteUrl}
                    size={140}
                    level="M"
                    marginSize={2}
                    title={`${profile.name} vida friend invite`}
                  />
                ) : null}
              </div>
              <div className="flex items-center justify-center gap-2">
                <FriendAvatar
                  user={{ ...profile, id: authUser?.id }}
                  className="h-6 w-6"
                />
                <span className="text-xs font-semibold text-foreground">
                  {profile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {profile.handle}
                </span>
              </div>
              <button
                type="button"
                onClick={handleShareProfileLink}
                className="mt-3 flex items-center gap-1.5 text-xs text-accent font-medium disabled:opacity-50"
                disabled={!inviteUrl}
              >
                <UserPlus size={12} />
                Share my profile link
              </button>
              {qrFeedback ? (
                <p
                  className="mt-2 max-w-full break-words text-center text-[11px] text-muted-foreground"
                  aria-live="polite"
                >
                  {qrFeedback}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <BaseSearchBar
                value={friendSearchQuery}
                onValueChange={setFriendSearchQuery}
                onDebouncedQueryChange={setDebouncedFriendSearchQuery}
                placeholder="Search friends"
                ariaLabel="Search friends"
                className="flex h-10 items-center gap-2 border-b border-border px-3"
                inputClassName="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                iconSize={17}
              />
              {filteredFriends.length === 0 && (
                <p className="px-3 py-5 text-center text-xs text-muted-foreground">
                  No friends match your search.
                </p>
              )}
              {removeFriendFeedback ? (
                <p className="border-b border-border px-3 py-2 text-[11px] text-muted-foreground">
                  {removeFriendFeedback}
                </p>
              ) : null}
              {filteredFriends.map((friend, index) => (
                <div
                  key={friend.id}
                  className={`flex items-center gap-3 px-3 py-2.5 ${
                    index < filteredFriends.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <FriendAvatar user={friend} className="h-9 w-9" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">
                      {friend.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {friend.handle}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary"
                      aria-label={`Message ${friend.name}`}
                    >
                      <MessageCircle
                        size={12}
                        className="text-muted-foreground"
                      />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary disabled:opacity-50"
                          aria-label={`Remove ${friend.name}`}
                          disabled={removingFriendId === friend.id}
                        >
                          {removingFriendId === friend.id ? (
                            <Loader2
                              size={12}
                              className="animate-spin text-muted-foreground"
                            />
                          ) : (
                            <Trash2
                              size={12}
                              className="text-muted-foreground"
                            />
                          )}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Remove {friend.name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the friendship for both of you.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() =>
                              handleRemoveFriend(friend.id, friend.name)
                            }
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={signOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-secondary py-3 text-sm font-semibold text-foreground"
          >
            <LogOut size={15} className="text-muted-foreground" />
            Sign out
          </button>
        </div>
      </div>

      {friendInviteFriend ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 px-5 backdrop-blur-sm">
          <div className="w-full max-w-[320px] rounded-3xl border border-border bg-card p-5 text-center shadow-2xl shadow-black/25">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
              <CheckCircle2 size={26} className="text-accent" />
            </div>
            <FriendAvatar
              user={friendInviteFriend}
              className="mx-auto h-20 w-20 border-2 border-accent"
            />
            <h2 className="mt-3 text-lg font-bold text-foreground">
              Friend added successfully
            </h2>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {friendInviteFriend.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {friendInviteFriend.handle}
            </p>
            <button
              type="button"
              onClick={clearFriendInviteResult}
              className="mt-5 h-11 w-full rounded-2xl bg-accent text-sm font-bold text-accent-foreground"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {friendInviteFeedback && !friendInviteFriend ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 px-5 backdrop-blur-sm">
          <div className="w-full max-w-[320px] rounded-3xl border border-border bg-card p-5 text-center shadow-2xl shadow-black/25">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
              <AlertCircle size={26} className="text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {friendInviteFeedback === "Friend not found."
                ? "Friend not found"
                : "Unable to add friend"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {friendInviteFeedback}
            </p>
            <button
              type="button"
              onClick={clearFriendInviteResult}
              className="mt-5 h-11 w-full rounded-2xl bg-accent text-sm font-bold text-accent-foreground"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {isEditProfileOpen ? (
        <div className="absolute inset-0 z-40 flex flex-col bg-background">
          <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-5">
            <button
              type="button"
              onClick={closeEditProfile}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
              aria-label="Close edit profile"
            >
              <X size={16} />
            </button>
            <h2 className="min-w-0 flex-1 truncate text-base font-bold text-foreground">
              Edit Profile
            </h2>
            <button
              type="submit"
              form="edit-profile-form"
              disabled={isSavingProfile || handleStatus === "checking"}
              className="flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-bold text-accent-foreground disabled:opacity-65"
            >
              {isSavingProfile ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              {isSavingProfile ? "Saving" : "Save"}
            </button>
          </div>

          <form
            id="edit-profile-form"
            onSubmit={handleEditProfileSubmit}
            className="flex-1 overflow-y-auto px-4 pb-6 pt-4 scrollbar-minimal"
          >
            <div className="mb-5 flex flex-col items-center">
              <FriendAvatar
                user={{
                  name: editName || "Profile photo",
                  handle: editHandle,
                  avatar: editedAvatarSrc,
                }}
                className="h-24 w-24 border-2 border-accent"
                disabled
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleProfileImageChange}
              />
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-semibold text-foreground"
                >
                  <ImagePlus size={13} className="text-muted-foreground" />
                  Choose photo
                </button>
                {editAvatarFile ? (
                  <button
                    type="button"
                    onClick={clearProfileImageFile}
                    className="flex h-9 items-center rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {editImageName ? (
                <p className="mt-2 max-w-full truncate text-[11px] text-muted-foreground">
                  {editImageName}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Profile photo URL
                </span>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-input-background px-3">
                  <ImagePlus size={16} className="text-muted-foreground" />
                  <input
                    value={editAvatar}
                    onChange={(event) => {
                      setEditAvatar(event.target.value);
                      setEditAvatarPreview("");
                      setEditAvatarFile(null);
                      setEditImageName("");
                    }}
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Name
                </span>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-input-background px-3">
                  <UserRound size={16} className="text-muted-foreground" />
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="Your name"
                    autoComplete="name"
                    maxLength={80}
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Handle
                </span>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-input-background px-3">
                  <AtSign size={16} className="text-muted-foreground" />
                  <input
                    value={editHandle}
                    onBlur={handleEditHandleBlur}
                    onChange={(event) => {
                      setEditHandle(event.target.value);
                      setHandleStatus("idle");
                      setEditError(null);
                    }}
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="yourhandle"
                    autoComplete="username"
                    required
                  />
                </div>
                {handleNotice ? (
                  <p
                    className={`mt-1.5 flex items-center gap-1 text-[11px] ${
                      handleStatus === "taken"
                        ? "text-destructive-foreground"
                        : "text-muted-foreground"
                    }`}
                    aria-live="polite"
                  >
                    {handleStatus === "checking" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : null}
                    {handleNotice}
                  </p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Bio
                </span>
                <div className="flex gap-2 rounded-2xl border border-border bg-input-background px-3 py-3">
                  <FileText
                    size={16}
                    className="mt-0.5 flex-shrink-0 text-muted-foreground"
                  />
                  <textarea
                    value={editBio}
                    onChange={(event) => setEditBio(event.target.value)}
                    className="min-h-24 min-w-0 flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="Share a little about yourself"
                    maxLength={maxBioLength}
                  />
                </div>
                <p className="mt-1.5 text-right text-[10px] text-muted-foreground">
                  {editBio.length}/{maxBioLength}
                </p>
              </label>
            </div>

            {editError ? (
              <p
                className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground"
                aria-live="polite"
              >
                {editError}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
