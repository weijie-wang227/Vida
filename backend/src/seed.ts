import "./env.js";
import mongoose, { Types } from "mongoose";
import { createAvatarUrl, createPasswordRecord } from "./auth.js";
import { connectDB, disconnectDB } from "./db.js";
import {
  activities,
  feedComments,
  feedLikes,
  feedPosts,
  friends,
  groupChats,
  notifications,
  profile,
} from "./data.js";
import {
  AdminModel,
  ActivityModel,
  BlacklistModel,
  ChatMessageModel,
  ChatModel,
  CommentModel,
  FavouriteModel,
  FeedPostModel,
  FriendshipModel,
  LikeModel,
  NotificationModel,
  PollVoteModel,
  RatingModel,
  SessionParticipationModel,
  SessionModel,
  SettingsModel,
  TagModel,
  UserModel,
  VendorModel,
} from "./models/VidaData.js";
import type { ActivitySeed } from "./data.js";
import { reconcileParticipationCounters } from "./services/participationReconciliation.js";

const legacyCollections = [
  "profiles",
  "friends",
  "groupChats",
  "activityJoins",
  "sessionJoins",
  "mapPins",
];

const allActivities: ActivitySeed[] = activities;
const testUserSeed = {
  mockId: 9,
  name: "test",
  handle: "@test",
  email: "test@gmail.com",
  password: "12345678",
  friendMockIds: [1, 2, 3, 7],
  chatMockIds: [1, 2, 3, 8],
  adminChatMockId: 1,
  joinedActivitySeedIds: [1, 3, 4, 8],
};
const activityChatByTitle = new Map<string, number>([
  ["Tai Chi at Fort Canning", 1],
  ["Hawker Heritage Food Walk", 5],
  ["Botanic Gardens Photography", 3],
  ["Morning Walk - East Coast Park", 2],
  ["Senior Chess Club", 6],
  ["Cantonese Cooking Class", 4],
  ["Kelong Fishing Day Trip", 7],
  ["Book Club - Cafe Meeting", 8],
]);

function slugEmail(handle: string) {
  return `${handle.replace(/^@/, "")}@vida.local`;
}

function seedHandle(name: string) {
  return `@${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24)}`;
}

function requireSeedValue<T>(value: T | null | undefined, description: string) {
  if (!value) {
    throw new Error(`Seed data is missing ${description}.`);
  }

  return value;
}

function uniqueObjectIds(ids: Types.ObjectId[]) {
  const seen = new Set<string>();

  return ids.filter((id) => {
    const key = String(id);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function dropLegacyCollections() {
  const collections = await mongoose.connection.db?.listCollections().toArray();
  const existingCollections = new Set(collections?.map((item) => item.name));

  await Promise.all(
    legacyCollections
      .filter((collection) => existingCollections.has(collection))
      .map((collection) => mongoose.connection.db?.dropCollection(collection)),
  );
}

async function seed() {
  try {
    const connected = await connectDB();

    if (!connected) {
      throw new Error("MONGODB_URI is required to seed the vida database.");
    }

    await dropLegacyCollections();

    await Promise.all([
      UserModel.deleteMany(),
      FriendshipModel.deleteMany(),
      ChatModel.deleteMany(),
      AdminModel.deleteMany(),
      BlacklistModel.deleteMany(),
      ChatMessageModel.deleteMany(),
      PollVoteModel.deleteMany(),
      ActivityModel.deleteMany(),
      SessionModel.deleteMany(),
      SessionParticipationModel.deleteMany(),
      FavouriteModel.deleteMany(),
      FeedPostModel.deleteMany(),
      CommentModel.deleteMany(),
      LikeModel.deleteMany(),
      NotificationModel.deleteMany(),
      RatingModel.deleteMany(),
      SettingsModel.deleteMany(),
      TagModel.deleteMany(),
      VendorModel.deleteMany(),
    ]);

    const linda = await UserModel.create({
      mockId: 0,
      name: profile.name,
      handle: profile.handle,
      email: slugEmail(profile.handle),
      avatarUrl: profile.avatar,
      bio: profile.bio,
      stats: profile.stats,
    });

    const userByMockId = new Map<number, Types.ObjectId>([[0, linda._id]]);
    const userByName = new Map<string, Types.ObjectId>([[profile.name, linda._id]]);
    const userByHandle = new Map<string, Types.ObjectId>([
      [profile.handle, linda._id],
    ]);
    let nextSeedUserMockId =
      Math.max(testUserSeed.mockId, ...friends.map((friend) => friend.id)) + 1;

    for (const friend of friends) {
      const existingUserId = userByHandle.get(friend.handle);

      if (existingUserId) {
        userByMockId.set(friend.id, existingUserId);
        userByName.set(friend.name, existingUserId);
        continue;
      }

      const user = await UserModel.create({
        mockId: friend.id,
        name: friend.name,
        handle: friend.handle,
        email: slugEmail(friend.handle),
        avatarUrl: friend.avatar,
      });

      userByMockId.set(friend.id, user._id);
      userByName.set(friend.name, user._id);
      userByHandle.set(friend.handle, user._id);
    }

    for (const hostName of new Set(
      allActivities.map((activity) => activity.host),
    )) {
      if (userByName.has(hostName)) {
        continue;
      }

      const handle = seedHandle(hostName);
      const email = slugEmail(handle);
      const user = await UserModel.create({
        mockId: nextSeedUserMockId,
        name: hostName,
        handle,
        email,
        avatarUrl: createAvatarUrl(hostName, email),
      });

      userByMockId.set(nextSeedUserMockId, user._id);
      userByName.set(hostName, user._id);
      userByHandle.set(handle, user._id);
      nextSeedUserMockId += 1;
    }

    const vendorByName = new Map<string, Types.ObjectId>();

    for (const hostName of new Set(
      allActivities.map((activity) => activity.host),
    )) {
      const owner = requireSeedValue(
        userByName.get(hostName),
        `vendor owner "${hostName}"`,
      );
      const vendor = await VendorModel.create({
        owner,
        name: hostName,
        profileUrl: "",
        description: "",
        numAttended: 0,
        allActivities: [],
      });

      vendorByName.set(hostName, vendor._id);
    }

    const testUser = await UserModel.create({
      mockId: testUserSeed.mockId,
      name: testUserSeed.name,
      handle: testUserSeed.handle,
      email: testUserSeed.email,
      avatarUrl: createAvatarUrl(testUserSeed.name, testUserSeed.email),
      bio: "Test account for local development.",
      stats: [
        { value: "4", label: "Activities" },
        { value: String(testUserSeed.friendMockIds.length), label: "Friends" },
        { value: "0", label: "Posts" },
      ],
      ...createPasswordRecord(testUserSeed.password),
    });

    userByMockId.set(testUserSeed.mockId, testUser._id);
    userByName.set(testUserSeed.name, testUser._id);
    userByHandle.set(testUserSeed.handle, testUser._id);

    for (const friend of friends) {
      const friendId = requireSeedValue(
        userByMockId.get(friend.id),
        `friend user ${friend.id}`,
      );

      if (String(friendId) === String(linda._id)) {
        continue;
      }

      await FriendshipModel.create([
        {
          userId: linda._id,
          friendId,
        },
        {
          userId: friendId,
          friendId: linda._id,
        },
      ]);
    }

    for (const friendMockId of testUserSeed.friendMockIds) {
      const friendId = requireSeedValue(
        userByMockId.get(friendMockId),
        `test friend user ${friendMockId}`,
      );
      if (String(friendId) === String(testUser._id)) {
        continue;
      }

      await FriendshipModel.create([
        {
          userId: testUser._id,
          friendId,
        },
        {
          userId: friendId,
          friendId: testUser._id,
        },
      ]);
    }

    const chatByMockId = new Map<number, Types.ObjectId>();
    const testChatMockIds = new Set(testUserSeed.chatMockIds);

    for (const chat of groupChats) {
      const chatMembers = uniqueObjectIds([
        linda._id,
        ...friends
          .slice(0, 5)
          .map((friend) =>
            requireSeedValue(
              userByMockId.get(friend.id),
              `chat member "${friend.name}" for chat "${chat.name}"`,
            ),
          ),
        ...(testChatMockIds.has(chat.id) ? [testUser._id] : []),
      ]);
      const savedChat = await ChatModel.create({
        mockId: chat.id,
        name: chat.name,
        avatar: chat.avatar,
        members: chatMembers,
        lastMessage: "",
        time: "",
        unread: chat.unread,
      });
      await AdminModel.create({
        user: linda._id,
        group: savedChat._id,
      });
      if (chat.id === testUserSeed.adminChatMockId) {
        await AdminModel.create({
          user: testUser._id,
          group: savedChat._id,
        });
      }

      chatByMockId.set(chat.id, savedChat._id);
    }

    const activityBySeedId = new Map<number, Types.ObjectId>();
    const tagDocuments = await TagModel.create(
      Array.from(new Set(allActivities.flatMap((activity) => activity.tags))).map(
        (name) => ({ name }),
      ),
    );
    const tagIdByName = new Map(
      tagDocuments.map((tag) => [tag.name, tag._id]),
    );

    for (const activity of allActivities) {
      const chatMockId = requireSeedValue(
        activityChatByTitle.get(activity.title),
        `chat mapping for activity "${activity.title}"`,
      );
      const chatId = requireSeedValue(
        chatByMockId.get(chatMockId),
        `chat ${chatMockId} for activity "${activity.title}"`,
      );
      const host = requireSeedValue(
        vendorByName.get(activity.host),
        `host vendor "${activity.host}" for activity "${activity.title}"`,
      );
      const participatingFriends = activity.participatingFriends
        .map((friend) =>
          requireSeedValue(
            userByMockId.get(friend.id),
            `joining friend "${friend.name}" for activity "${activity.title}"`,
          ),
        );
      const activityJoiningUsers = testUserSeed.joinedActivitySeedIds.includes(
        activity.id,
      )
        ? [...participatingFriends, testUser._id]
        : participatingFriends;
      const activityJoiningUserIds = uniqueObjectIds(activityJoiningUsers);
      const startsAt = new Date(activity.startsAt);
      const seededStatus = startsAt.getTime() < Date.now()
        ? "attended"
        : "registered";
      const attendedCount = seededStatus === "attended"
        ? activityJoiningUserIds.length
        : 0;
      const savedActivity = await ActivityModel.create({
        mockId: activity.id,
        title: activity.title,
        description: activity.description ?? "",
        host,
        rating: activity.rating,
        categories: activity.categories,
        cover: activity.cover,
        tags: activity.tags.map((name) =>
          requireSeedValue(tagIdByName.get(name), `tag "${name}"`),
        ),
        sessionsNum: 1,
        registeredCount: activityJoiningUserIds.length,
        attendedCount,
      });
      const savedSession = await SessionModel.create({
        mockId: activity.id,
        activity: savedActivity._id,
        title: activity.title,
        startsAt,
        duration: activity.durationMinutes,
        spots: activity.spots,
        registeredCount: activityJoiningUserIds.length,
        attendedCount,
        credits: activity.credits,
        chat: chatId,
        isPremium: activity.isPremium,
        skillsFuturePayable: activity.skillsFuturePayable ?? false,
        isOpen: true,
        isActive: true,
        location: activity.location,
        lat: activity.lat,
        lng: activity.lng,
      });

      activityBySeedId.set(activity.id, savedActivity._id);
      await VendorModel.findByIdAndUpdate(host, {
        $addToSet: { allActivities: savedActivity._id },
      });

      const activityJoinRows = activityJoiningUserIds.map((userId) => ({
        userId,
        sessionId: savedSession._id,
        role: "participant",
        status: seededStatus,
        registeredAt: new Date(),
        attendanceMarkedAt: seededStatus === "attended" ? new Date() : undefined,
      }));

      if (activityJoinRows.length > 0) {
        await SessionParticipationModel.create(activityJoinRows);

        if (seededStatus === "attended") {
          await UserModel.updateMany(
            { _id: { $in: activityJoiningUserIds } },
            { $inc: { attendedSessionsCount: 1 } },
          );
        }
      }
    }

    const commentCountByPostId = new Map<number, number>();

    for (const comment of feedComments) {
      commentCountByPostId.set(
        comment.postId,
        (commentCountByPostId.get(comment.postId) ?? 0) + 1,
      );
    }

    const likeCountByPostId = new Map<number, number>();

    for (const like of feedLikes) {
      likeCountByPostId.set(like.postId, like.handles.length);
    }

    const feedPostByMockId = new Map<number, Types.ObjectId>();

    for (const post of feedPosts) {
      const user = requireSeedValue(
        userByHandle.get(post.handle),
        `user ${post.handle} for feed post ${post.id}`,
      );
      const activity = requireSeedValue(
        allActivities.find((item) => item.title === post.activity),
        `activity "${post.activity}" for feed post ${post.id}`,
      );
      const activityId = requireSeedValue(
        activityBySeedId.get(activity.id),
        `activity ${activity.id} for feed post ${post.id}`,
      );

      const savedPost = await FeedPostModel.create({
        mockId: post.id,
        user,
        activity: activityId,
        caption: post.caption,
        image: post.image,
        durationMinutes: activity.durationMinutes,
        categories: activity.categories,
        likesCount: likeCountByPostId.get(post.id) ?? 0,
        comments: commentCountByPostId.get(post.id) ?? 0,
        createdAt: new Date(Date.now() - post.minutesAgo * 60_000),
        updatedAt: new Date(Date.now() - post.minutesAgo * 60_000),
      });

      feedPostByMockId.set(post.id, savedPost._id);
    }

    for (const like of feedLikes) {
      const post = requireSeedValue(
        feedPostByMockId.get(like.postId),
        `feed post ${like.postId} for like`,
      );

      for (const handle of like.handles) {
        const user = requireSeedValue(
          userByHandle.get(handle),
          `user ${handle} for like on feed post ${like.postId}`,
        );

        await LikeModel.create({
          post,
          user,
        });
      }
    }

    for (const comment of feedComments) {
      const post = requireSeedValue(
        feedPostByMockId.get(comment.postId),
        `feed post ${comment.postId} for comment`,
      );
      const user = requireSeedValue(
        userByHandle.get(comment.handle),
        `user ${comment.handle} for comment on feed post ${comment.postId}`,
      );
      const createdAt = new Date(Date.now() - comment.minutesAgo * 60_000);

      await CommentModel.create({
        post,
        user,
        body: comment.body,
        createdAt,
        updatedAt: createdAt,
      });
    }

    for (const notification of notifications) {
      const user = requireSeedValue(
        userByHandle.get(notification.handle),
        `user ${notification.handle} for notification "${notification.title}"`,
      );
      const dateReceived = new Date(Date.now() - notification.minutesAgo * 60_000);

      await NotificationModel.create({
        user,
        dateReceived,
        title: notification.title,
        content: notification.content,
        link: notification.link,
        read: notification.read,
        createdAt: dateReceived,
        updatedAt: dateReceived,
      });
    }

    await reconcileParticipationCounters();
    console.log("Seeded relational vida database and reconciled counters.");
  } catch (error) {
    console.error("Failed to seed database:", error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

seed();
