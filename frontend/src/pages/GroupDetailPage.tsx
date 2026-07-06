import {
  ArrowUpRight,
  Ban,
  Calendar,
  ChevronLeft,
  Clock,
  Info,
  Loader2,
  LogOut,
  MapPin,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserMinus,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../app/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../app/components/ui/alert-dialog";
import {
  formatActivityDate,
  formatActivityTime,
} from "../lib/activityPresentation";
import { FriendAvatar, FriendAvatars } from "../components/FriendAvatars";
import type { GroupMember } from "../lib/types";
import { useAppState } from "../state";

type ConfirmMemberAction = {
  type: "remove" | "blacklist";
  member: GroupMember;
};

export function GroupDetailPage() {
  const {
    authUser,
    appointGroupAdmin,
    chatMessages,
    blacklistGroupMember,
    deleteGroup,
    groupChats,
    isLoading,
    leaveGroup,
    loadGroupMessages,
    profile,
    removeGroupMember,
    sendGroupMessage,
  } = useAppState();
  const navigate = useNavigate();
  const { groupId: groupIdParam } = useParams();
  const groupId = Number(groupIdParam);
  const [draft, setDraft] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isMemberSheetOpen, setIsMemberSheetOpen] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [pendingMemberAction, setPendingMemberAction] = useState<string | null>(
    null,
  );
  const [confirmMemberAction, setConfirmMemberAction] =
    useState<ConfirmMemberAction | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const group = groupChats.find((chat) => chat.id === groupId);
  const messages = Number.isFinite(groupId) ? chatMessages[groupId] ?? [] : [];
  const groupMembers = [...(group?.memberList ?? [])].sort((left, right) => {
    if (left.isAdmin !== right.isAdmin) {
      return left.isAdmin ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  useEffect(() => {
    if (!Number.isFinite(groupId)) {
      return;
    }

    loadGroupMessages(groupId).catch((error) => {
      setMessageError(
        error instanceof Error ? error.message : "Unable to load messages.",
      );
    });
  }, [groupId, loadGroupMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!Number.isFinite(groupId)) {
      return;
    }

    const body = draft.trim();

    if (!body) {
      return;
    }

    setMessageError(null);
    setIsSending(true);

    try {
      await sendGroupMessage(groupId, body);
      setDraft("");
    } catch (error) {
      setMessageError(
        error instanceof Error ? error.message : "Unable to send message.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const runMemberAction = async (
    actionKey: string,
    action: () => Promise<void>,
  ) => {
    setMemberActionError(null);
    setPendingMemberAction(actionKey);

    try {
      await action();
    } catch (error) {
      setMemberActionError(
        error instanceof Error ? error.message : "Unable to update group.",
      );
    } finally {
      setPendingMemberAction(null);
    }
  };

  const handleLeaveGroup = () => {
    void runMemberAction("leave", () => leaveGroup(groupId));
  };

  const handleDeleteGroup = () => {
    if (!window.confirm(`Delete ${group?.name ?? "this group"}?`)) {
      return;
    }

    void runMemberAction("delete", () => deleteGroup(groupId));
  };

  const handleRemoveMember = (memberId: string) => {
    void runMemberAction(`remove:${memberId}`, () =>
      removeGroupMember(groupId, memberId).then(() => undefined),
    );
  };

  const handleBlacklistMember = (memberId: string) => {
    void runMemberAction(`blacklist:${memberId}`, () =>
      blacklistGroupMember(groupId, memberId).then(() => undefined),
    );
  };

  const handleAppointAdmin = (memberId: string) => {
    void runMemberAction(`admin:${memberId}`, () =>
      appointGroupAdmin(groupId, memberId).then(() => undefined),
    );
  };

  const handleConfirmMemberAction = () => {
    const action = confirmMemberAction;

    setConfirmMemberAction(null);

    if (!action) {
      return;
    }

    if (action.type === "remove") {
      handleRemoveMember(action.member.id);
      return;
    }

    handleBlacklistMember(action.member.id);
  };

  if (!group) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-border">
          <button
            onClick={() => navigate("/groups")}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Back to groups"
          >
            <ChevronLeft size={17} className="text-foreground" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
            Group
          </h1>
        </div>
        <div className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isLoading ? "Loading group..." : "Group not found."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-border">
        <button
          onClick={() => navigate("/groups")}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Back to groups"
        >
          <ChevronLeft size={17} className="text-foreground" />
        </button>
        <button
          type="button"
          onClick={() => setIsMemberSheetOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left transition-colors active:bg-secondary/60"
          aria-label={`View ${group.name} members`}
        >
          <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-secondary">
            <img
              src={group.avatar}
              alt={group.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-foreground">
              {group.name}
            </h1>
            <div className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
              <Users size={10} className="flex-shrink-0" />
              <span>{group.members} members</span>
              {group.isAdmin && (
                <span className="ml-1 inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                  <ShieldCheck size={9} />
                  Admin
                </span>
              )}
            </div>
          </div>
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
            <Info size={14} className="text-muted-foreground" />
          </span>
        </button>
      </div>

      <Sheet open={isMemberSheetOpen} onOpenChange={setIsMemberSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[82vh] gap-0 rounded-t-3xl border-border p-0 sm:mx-auto sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-4 pb-3 pr-12 pt-5 text-left">
            <SheetTitle className="truncate text-base">
              {group.name}
            </SheetTitle>
            <SheetDescription>
              {group.members} current members
            </SheetDescription>
          </SheetHeader>
          <div className="max-h-[calc(82vh-96px)] overflow-y-auto px-4 py-2 scrollbar-minimal">
            <div className="flex gap-2 border-b border-border py-3">
              <button
                type="button"
                onClick={handleLeaveGroup}
                disabled={Boolean(pendingMemberAction)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-60"
              >
                {pendingMemberAction === "leave" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <LogOut size={13} />
                )}
                Leave group
              </button>
              {group.isAdmin && (
                <button
                  type="button"
                  onClick={handleDeleteGroup}
                  disabled={Boolean(pendingMemberAction)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-60"
                >
                  {pendingMemberAction === "delete" ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  Delete group
                </button>
              )}
            </div>
            {memberActionError && (
              <p className="mt-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {memberActionError}
              </p>
            )}
            {groupMembers.length > 0 ? (
              groupMembers.map((member) => {
                const isCurrentUser =
                  member.id === authUser?.id || member.handle === profile.handle;

                return (
                  <div
                    key={member.id || member.handle}
                    className="flex items-center gap-3 border-b border-border py-3 last:border-0"
                  >
                    <FriendAvatar user={member} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {member.name}
                        </p>
                        {isCurrentUser && (
                          <span className="flex-shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                            You
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {member.handle}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {member.isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent">
                          <ShieldCheck size={11} />
                          Admin
                        </span>
                      )}
                      {group.isAdmin && !isCurrentUser && !member.isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAppointAdmin(member.id)}
                            disabled={Boolean(pendingMemberAction)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent disabled:opacity-60"
                            aria-label={`Appoint ${member.name} as admin`}
                          >
                            {pendingMemberAction === `admin:${member.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <UserPlus size={13} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmMemberAction({
                                type: "remove",
                                member,
                              })
                            }
                            disabled={Boolean(pendingMemberAction)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground disabled:opacity-60"
                            aria-label={`Remove ${member.name}`}
                          >
                            {pendingMemberAction === `remove:${member.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <UserMinus size={13} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmMemberAction({
                                type: "blacklist",
                                member,
                              })
                            }
                            disabled={Boolean(pendingMemberAction)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive-foreground disabled:opacity-60"
                            aria-label={`Blacklist ${member.name}`}
                          >
                            {pendingMemberAction === `blacklist:${member.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Ban size={13} />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Member details are unavailable right now.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={Boolean(confirmMemberAction)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmMemberAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmMemberAction?.type === "blacklist"
                ? "Ban this member?"
                : "Kick this member?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMemberAction?.type === "blacklist"
                ? `${confirmMemberAction.member.name} will be removed from ${group.name} and blocked from joining again.`
                : `${confirmMemberAction?.member.name ?? "This member"} will be removed from ${group.name}. They can rejoin later if they still have access.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmMemberAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmMemberAction?.type === "blacklist" ? "Ban" : "Kick"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex-1 overflow-y-auto scrollbar-minimal px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="max-w-[220px] text-sm leading-relaxed text-muted-foreground">
              No messages yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isMine =
                message.sender.id === authUser?.id ||
                message.sender.handle === profile.handle;
              const invite = message.activityInvite;
              const senderAvatar = (
                <FriendAvatar user={message.sender} className="h-7 w-7" />
              );

              if (message.type === "activity_invite" && invite) {
                const joinedFriends = invite.joiningFriends;

                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${
                      isMine ? "justify-end" : ""
                    }`}
                  >
                    {!isMine && senderAvatar}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/activities/${invite.activity.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/activities/${invite.activity.id}`);
                        }
                      }}
                      className={`max-w-[86%] rounded-2xl border px-3 py-3 text-left shadow-sm transition-transform active:scale-[0.99] ${
                        isMine
                          ? "rounded-br-md border-accent/25 bg-accent/10"
                          : "rounded-bl-md border-border bg-card"
                      }`}
                      aria-label={`Open ${invite.activity.title}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[10px] font-semibold text-accent">
                              {message.sender.name}
                            </p>
                            {message.sender.isAdmin && (
                              <span className="rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-muted-foreground">
                            {message.time}
                          </p>
                        </div>
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <ArrowUpRight size={13} />
                        </div>
                      </div>

                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Activity Invite
                      </p>
                      <h3 className="mt-1 text-sm font-bold leading-tight text-foreground">
                        {invite.activity.title}
                      </h3>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Calendar size={11} className="flex-shrink-0 text-accent" />
                          <span className="truncate">
                            {formatActivityDate(invite.activity.startsAt)}
                          </span>
                        </div>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Clock size={11} className="flex-shrink-0 text-accent" />
                          <span className="truncate">
                            {formatActivityTime(invite.activity.startsAt)}
                          </span>
                        </div>
                        <div className="col-span-2 flex min-w-0 items-center gap-1.5">
                          <MapPin size={11} className="flex-shrink-0 text-accent" />
                          <span className="truncate">
                            {invite.activity.location}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-border pt-2">
                        {joinedFriends.length > 0 ? (
                          <FriendAvatars friends={joinedFriends} max={4} />
                        ) : (
                          <p className="text-[10px] text-muted-foreground">
                            No one has joined yet.
                          </p>
                        )}
                      </div>
                    </div>
                    {isMine && senderAvatar}
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${
                    isMine ? "justify-end" : ""
                  }`}
                >
                  {!isMine && senderAvatar}
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                      isMine
                        ? "rounded-br-md bg-accent text-accent-foreground"
                        : "rounded-bl-md bg-card text-foreground border border-border"
                    }`}
                  >
                    {isMine && message.sender.isAdmin && (
                      <div className="mb-1 flex justify-end">
                        <span className="rounded-full border border-accent-foreground/20 bg-accent-foreground/10 px-1.5 py-0.5 text-[9px] font-medium text-accent-foreground/75">
                          Admin
                        </span>
                      </div>
                    )}
                    {!isMine && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <p className="text-[10px] font-semibold text-accent">
                          {message.sender.name}
                        </p>
                        {message.sender.isAdmin && (
                          <span className="rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                            Admin
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-[12px] leading-snug">{message.body}</p>
                    <p
                      className={`mt-1 text-[9px] ${
                        isMine
                          ? "text-accent-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {message.time}
                    </p>
                  </div>
                  {isMine && senderAvatar}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background px-4 py-3">
        {messageError && (
          <p className="mb-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
            {messageError}
          </p>
        )}
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2"
        >
          <FriendAvatar user={profile} className="h-7 w-7" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Message group"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSending}
            className="h-8 w-8 rounded-full bg-accent flex items-center justify-center"
            aria-label="Send message"
          >
            <Send size={14} className="text-accent-foreground" />
          </button>
        </form>
      </div>
    </div>
  );
}
