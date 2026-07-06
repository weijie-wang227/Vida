import type { ChatPreview } from "./chatPreviews.js";

type vidaCategory = "physical" | "social" | "cognitive" | "creative";

type AnyDoc = Record<string, any>;

function asObject(doc: AnyDoc) {
  return typeof doc.toObject === "function" ? doc.toObject() : doc;
}

function toIsoString(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

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

function getActivityStartsAt(activity: AnyDoc) {
  const item = asObject(activity ?? {});
  const startsAt = new Date(String(item.startsAt ?? ""));

  if (!Number.isNaN(startsAt.getTime())) {
    return startsAt.toISOString();
  }

  const fallback = new Date(toIsoString(item.createdAt ?? item.updatedAt));

  return fallback.toISOString();
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
  joiningUsersByActivityId = new Map<string, AnyDoc[]>(),
) {
  const item = asObject(message);
  const chat = asObject(item.chat ?? {});
  const sender = asObject(item.sender ?? {});
  const messageType = item.type === "activity_invite" ? item.type : "text";
  const activity = item.activity ? asObject(item.activity) : null;
  const createdAt = toIsoString(item.createdAt ?? item.updatedAt);
  const senderId = String(sender._id ?? "");
  const activityId = activity ? String(activity._id ?? "") : "";
  const joiningFriends = activityId
    ? (joiningUsersByActivityId.get(activityId) ?? []).map(serializeActivityJoinUser)
    : [];

  return {
    id: String(item._id),
    groupId: chat.mockId,
    type: messageType,
    sender: {
      id: senderId,
      name: sender.name ?? "Unknown user",
      handle: sender.handle ?? "",
      avatar: sender.avatarUrl ?? "",
      isAdmin: adminUserIds.has(senderId),
    },
    body: item.body,
    time: formatChatTime(createdAt),
    createdAt,
    activityInvite:
      messageType === "activity_invite" && activity
        ? {
            activity: {
              id: activity.mockId,
              title: activity.title,
              startsAt: getActivityStartsAt(activity),
              location: activity.location,
              durationMinutes: activity.durationMinutes,
              credits: getActivityCredits(activity),
              categories: (activity.categories ?? []) as vidaCategory[],
            },
            joiningFriends,
          }
        : undefined,
  };
}

export function serializeActivity(activity: AnyDoc, joiningUsers: AnyDoc[] = []) {
  const item = asObject(activity);
  const host = asObject(item.host);
  const vendor = item.vendor ? asObject(item.vendor) : null;
  const joiningFriends = joiningUsers.map((user: AnyDoc) => {
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
    host: host?.name ?? item.hostName ?? "Unknown host",
    startsAt: getActivityStartsAt(item),
    location: item.location,
    durationMinutes: item.durationMinutes,
    spots: item.spots,
    credits: getActivityCredits(item),
    rating: item.rating,
    categories: (item.categories ?? []) as vidaCategory[],
    tags: item.tags ?? [],
    vendor: vendor
      ? {
          id: String(vendor._id ?? item.vendor),
          name: vendor.name,
          profileUrl: vendor.profileUrl ?? "",
          description: vendor.description ?? "",
        }
      : undefined,
    joiningFriends,
    joinDisabledReason: item.joinDisabledReason,
  };

  if (!item.isPremium) {
    return baseActivity;
  }

  return {
    ...baseActivity,
    cover: item.cover,
  };
}

export function serializeActivityJoinUser(user: AnyDoc) {
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
    latitude: item.latitude,
    longitude: item.longitude,
    x: 0,
    y: 0,
    label: item.label,
    premium: item.premium,
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
