import type { ChatPreview } from "./chatPreviews.js";
import {
  getChatMessageType,
  normalizeChatMessagePayload,
  type ChatMessageType,
} from "./chatMessages.js";
import { toIsoString } from "./utils/date.js";
import { asObject } from "./utils/mongoose.js";

type vidaCategory = "physical" | "social" | "cognitive" | "creative";

type AnyDoc = Record<string, any>;

function formatChatTime(value: unknown) {
  const date = new Date(toIsoString(value));

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getActivityCredits(activity: AnyDoc) {
  const item = asObject(activity ?? {});
  const credits = Number(item.credits);

  if (Number.isFinite(credits)) {
    return credits;
  }

  const price = Number(item.price);

  if (Number.isFinite(price)) {
    return price;
  }

  if (typeof item.price === "string") {
    const match = item.price.match(/\d+(?:\.\d+)?/);

    if (match) {
      return Number(match[0]);
    }
  }

  return 0;
}

function getSessionDuration(sessionValue: unknown) {
  const session = asObject((sessionValue ?? {}) as AnyDoc);
  const duration = Number(session.duration ?? session.durationMinutes);

  return Number.isFinite(duration) ? duration : 0;
}

function getActivitySessions(activity: AnyDoc) {
  const item = asObject(activity ?? {});

  if (Array.isArray(item.sessions)) {
    return item.sessions.map((session: AnyDoc) => asObject(session));
  }

  if (item.primarySession) {
    return [asObject(item.primarySession)];
  }

  return [];
}

function getPrimarySession(activity: AnyDoc) {
  const sessions = getActivitySessions(activity);

  if (sessions.length > 0) {
    return sessions[0];
  }

  return asObject(activity ?? {});
}

function getActivityStartsAt(activity: AnyDoc, sessionValue?: unknown) {
  const item = asObject((sessionValue ?? getPrimarySession(activity)) as AnyDoc);
  const activityItem = asObject(activity ?? {});
  const startsAt = new Date(String(item.startsAt ?? ""));

  if (!Number.isNaN(startsAt.getTime())) {
    return startsAt.toISOString();
  }

  const fallback = new Date(
    toIsoString(item.createdAt ?? activityItem.createdAt ?? activityItem.updatedAt),
  );

  return fallback.toISOString();
}

function getActivityHost(activity: AnyDoc) {
  const item = asObject(activity ?? {});
  const host = asObject(item.host ?? item.vendor ?? {});

  return host;
}

export function serializeTagNames(tagsValue: unknown) {
  if (!Array.isArray(tagsValue)) {
    return [];
  }

  return tagsValue
    .map((tagValue) => {
      if (typeof tagValue === "string") {
        return tagValue;
      }

      const tag = asObject((tagValue ?? {}) as AnyDoc);

      return typeof tag.name === "string" ? tag.name : "";
    })
    .filter(Boolean);
}

export function serializeFriend(friendship: AnyDoc) {
  const item = asObject(friendship);
  const friend = asObject(item.friendId);

  return {
    id: friend.mockId,
    name: friend.name,
    handle: friend.handle,
    avatar: friend.avatarUrl,
  };
}

export function serializeProfile(user: AnyDoc) {
  const item = asObject(user);

  return {
    name: item.name,
    handle: item.handle,
    avatar: item.avatarUrl,
    bio: item.bio ?? "",
    stats: item.stats ?? [],
  };
}

export function serializeAuthUser(user: AnyDoc) {
  const item = asObject(user);

  return {
    id: String(item._id ?? item.mockId),
    email: item.email,
    ...serializeProfile(item),
  };
}

export function serializeNotification(notification: AnyDoc) {
  const item = asObject(notification);

  return {
    id: String(item._id),
    dateReceived: toIsoString(item.dateReceived ?? item.createdAt),
    title: item.title,
    content: item.content,
    link: item.link || undefined,
    read: Boolean(item.read),
  };
}

export function serializeVendor(vendor: AnyDoc) {
  const item = asObject(vendor);
  const owner = asObject(item.owner ?? {});

  return {
    id: String(item._id),
    owner: String(owner._id ?? item.owner),
    name: item.name,
    profileUrl: item.profileUrl ?? "",
    description: item.description ?? "",
    numAttended: item.numAttended ?? 0,
    allEvents: Array.isArray(item.allEvents ?? item.allActivities)
      ? (item.allEvents ?? item.allActivities).map((event: unknown) =>
          String(asObject(event as AnyDoc)._id ?? event),
        )
      : [],
  };
}

export function serializeChat(
  chat: AnyDoc,
  preview?: ChatPreview,
  isAdmin = false,
  adminUserIds = new Set<string>(),
) {
  const item = asObject(chat);
  const members = Array.isArray(item.members)
    ? item.members.map((member: unknown) =>
        serializeChatMember(member, adminUserIds),
      )
    : [];

  return {
    id: item.mockId,
    name: item.name,
    members: item.members?.length || 0,
    memberList: members,
    avatar: item.avatar,
    lastMessage: preview?.lastMessage ?? item.lastMessage ?? "",
    time: preview?.time ?? item.time ?? "",
    unread: item.unread ?? 0,
    isAdmin,
  };
}

function serializeChatMember(
  memberValue: unknown,
  adminUserIds = new Set<string>(),
) {
  const member =
    typeof memberValue === "object" && memberValue !== null
      ? asObject(memberValue as AnyDoc)
      : {};
  const id = String(member._id ?? memberValue ?? "");

  return {
    id,
    name: member.name ?? "Unknown user",
    handle: member.handle ?? "",
    avatar: member.avatarUrl ?? "",
    isAdmin: adminUserIds.has(id),
  };
}

export function serializeChatMessage(
  message: AnyDoc,
  adminUserIds = new Set<string>(),
  participatingUsersBySessionId = new Map<string, AnyDoc[]>(),
  pollResultsByMessageId = new Map<
    string,
    {
      voteCounts: Record<string, number>;
      selectedOptionIds: string[];
      totalVotes: number;
    }
  >(),
) {
  const item = asObject(message);
  const chat = asObject(item.chat ?? {});
  const sender = asObject(item.sender ?? {});
  const messageType = getChatMessageType(item.type);
  const storedPayload = normalizeChatMessagePayload(
    messageType as never,
    item.payload,
  );
  const createdAt = toIsoString(item.createdAt ?? item.updatedAt);
  const senderId = String(sender._id ?? "");
  const messageId = String(item._id);
  const payloadSerializers: Record<ChatMessageType, (payload: any) => unknown> = {
    text: (payload) => payload,
    activity_invite: (payload) => ({
      ...payload,
      participatingFriends: (
        participatingUsersBySessionId.get(String(payload.session.objectId)) ?? []
      ).map(serializeParticipationUser),
    }),
    poll: (payload) => {
      const result = pollResultsByMessageId.get(messageId) ?? {
        voteCounts: {},
        selectedOptionIds: [],
        totalVotes: 0,
      };
      const selectedOptionIds = new Set(result.selectedOptionIds);

      return {
        ...payload,
        options: payload.options.map((option: Record<string, any>) => ({
          ...option,
          votes: result.voteCounts[option.id] ?? 0,
          selected: selectedOptionIds.has(option.id),
        })),
        totalVotes: result.totalVotes,
      };
    },
  };

  return {
    id: messageId,
    groupId: chat.mockId,
    type: messageType,
    schemaVersion: Number(item.schemaVersion) || 1,
    sender: {
      id: senderId,
      name: sender.name ?? "Unknown user",
      handle: sender.handle ?? "",
      avatar: sender.avatarUrl ?? "",
      isAdmin: adminUserIds.has(senderId),
    },
    time: formatChatTime(createdAt),
    createdAt,
    payload: payloadSerializers[messageType](storedPayload),
  };
}

export function serializeActivity(
  activity: AnyDoc,
  participatingUsers: AnyDoc[] = [],
) {
  const item = asObject(activity);
  const host = getActivityHost(item);
  const primarySession = getPrimarySession(item);
  const sessions = getActivitySessions(item).map(serializeSession);
  const participatingFriends = participatingUsers.map((user: AnyDoc) => {
    const friend = asObject(user);

    return {
      id: friend.mockId,
      name: friend.name,
      handle: friend.handle,
      avatar: friend.avatarUrl,
    };
  });
  const baseActivity = {
    id: item.mockId,
    title: item.title,
    description: item.description ?? "",
    host: host?.name ?? item.hostName ?? "Unknown host",
    startsAt: getActivityStartsAt(item, primarySession),
    location: primarySession.location ?? item.location,
    lat: primarySession.lat ?? item.lat,
    lng: primarySession.lng ?? item.lng,
    latitude: primarySession.lat ?? item.latitude,
    longitude: primarySession.lng ?? item.longitude,
    duration: getSessionDuration(primarySession),
    durationMinutes: getSessionDuration(primarySession),
    spots: primarySession.spots,
    registeredCount: Number(
      primarySession.registeredCount ?? participatingFriends.length,
    ),
    attendedCount: Number(primarySession.attendedCount ?? 0),
    credits: getActivityCredits(primarySession),
    rating: item.rating,
    categories: (item.categories ?? []) as vidaCategory[],
    tags: serializeTagNames(item.tags),
    isVolunteer: Boolean(item.isVolunteer),
    isAAC: Boolean(item.isAAC),
    isPremium: Boolean(primarySession.isPremium),
    skillsFuturePayable: Boolean(primarySession.skillsFuturePayable),
    isOpen: primarySession.isOpen !== false,
    isActive: primarySession.isActive !== false,
    cover: item.cover || undefined,
    vendor: host?._id
      ? {
          id: String(host._id ?? item.host),
          name: host.name,
          profileUrl: host.profileUrl ?? "",
          description: host.description ?? "",
        }
      : undefined,
    sessions,
    participatingFriends,
    joinDisabledReason: item.joinDisabledReason,
  };

  return baseActivity;
}

export function serializeSession(session: AnyDoc) {
  const item = asObject(session);
  const activity = item.activity ? asObject(item.activity) : null;
  const chat = item.chat ? asObject(item.chat) : null;
  const duration = getSessionDuration(item);

  return {
    id: item.mockId ?? String(item._id ?? ""),
    objectId: String(item._id ?? ""),
    activityId: activity?.mockId ?? String(activity?._id ?? item.activity ?? ""),
    title: item.title,
    startsAt: getActivityStartsAt(activity ?? item, item),
    duration,
    durationMinutes: duration,
    spots: item.spots,
    registeredCount: Number(item.registeredCount ?? 0),
    attendedCount: Number(item.attendedCount ?? 0),
    credits: getActivityCredits(item),
    chat: chat?._id ? String(chat._id) : String(item.chat ?? ""),
    groupId: chat?.mockId,
    isPremium: Boolean(item.isPremium),
    skillsFuturePayable: Boolean(item.skillsFuturePayable),
    isOpen: item.isOpen !== false,
    isActive: item.isActive !== false,
    location: item.location,
    lat: item.lat,
    lng: item.lng,
    latitude: item.lat,
    longitude: item.lng,
  };
}

export function serializeParticipationUser(user: AnyDoc) {
  const friend = asObject(user);

  return {
    id: friend.mockId,
    name: friend.name,
    handle: friend.handle,
    avatar: friend.avatarUrl,
  };
}

export function serializeMapPin(pin: AnyDoc) {
  const item = asObject(pin);
  const activity = asObject(item.activity);

  return {
    id: item.mockId,
    activityId: activity.mockId,
    sessionId: item.mockId,
    registeredCount: Number(item.registeredCount ?? 0),
    latitude: item.lat ?? item.latitude,
    longitude: item.lng ?? item.longitude,
    x: 0,
    y: 0,
    label: item.title ?? item.label,
    premium: item.isPremium ?? item.premium,
    categories: (activity.categories ?? []) as vidaCategory[],
  };
}

type FeedPostMetrics =
  | number
  | {
      commentCount?: number;
      likeCount?: number;
      likedByCurrentUser?: boolean;
    };

export function serializeFeedPost(post: AnyDoc, metricsValue?: FeedPostMetrics) {
  const item = asObject(post);
  const user = asObject(item.user);
  const activity = item.activity ? asObject(item.activity) : null;
  const group = item.group ? asObject(item.group) : null;
  const metrics =
    typeof metricsValue === "number" ? { commentCount: metricsValue } : metricsValue;
  const likeCount = metrics?.likeCount ?? item.likesCount ?? 0;

  return {
    id: item.mockId,
    user: user.name,
    handle: user.handle,
    avatar: user.avatarUrl,
    createdAt: toIsoString(item.createdAt ?? item.updatedAt),
    caption: item.caption,
    image: item.image || undefined,
    likesCount: likeCount,
    likedByMe: metrics?.likedByCurrentUser ?? false,
    comments: metrics?.commentCount ?? item.comments,
    activity: activity?.title ?? group?.name,
    durationMinutes: item.durationMinutes ?? activity?.durationMinutes,
    categories: ((item.categories?.length ? item.categories : activity?.categories) ??
      []) as vidaCategory[],
    group: group
      ? {
          id: group.mockId,
          name: group.name,
          avatar: group.avatar,
          members: group.members?.length || 0,
        }
      : undefined,
  };
}

export function serializeComment(comment: AnyDoc) {
  const item = asObject(comment);
  const post = asObject(item.post ?? {});
  const user = asObject(item.user ?? {});
  const createdAt = toIsoString(item.createdAt ?? item.updatedAt);

  return {
    id: String(item._id),
    postId: post.mockId,
    user: user.name ?? "Unknown user",
    handle: user.handle ?? "",
    avatar: user.avatarUrl ?? "",
    body: item.body,
    createdAt,
  };
}
