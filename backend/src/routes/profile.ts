import { Router } from "express";
import { Types } from "mongoose";
import {
  createAvatarUrl,
  normalizeHandle,
} from "../auth.js";
import { requireAuth } from "../middleware/auth.js";
import {
  AccountModel,
  FeedPostModel,
  FriendshipModel,
  NotificationModel,
  SettingsModel,
  UserModel,
} from "../models/VidaData.js";
import { serializeFriend, serializeProfile } from "../serializers.js";
import { getString } from "../utils/input.js";
import { asObject } from "../utils/mongoose.js";

const router = Router();
const maxNameLength = 80;
const maxBioLength = 240;

function hasHandleCharacters(value: string) {
  return /[a-z0-9_]/i.test(value.replace(/^@+/, ""));
}

function getRequestedAvatar(body: Record<string, unknown> | undefined) {
  return getString(body?.avatar ?? body?.profile ?? body?.avatarUrl);
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

async function findHandleOverlap(handle: string, userId: unknown) {
  return UserModel.exists({
    _id: { $ne: userId },
    handle,
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeHandleSearchQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]+/g, "");
}

function serializeFriendSearchUser(user: Record<string, any>) {
  return {
    id: String(user._id),
    name: user.name,
    handle: user.handle,
    avatar: user.avatarUrl,
  };
}

async function isFriendDiscoverable(userId: unknown) {
  const settings = await SettingsModel.findOne({ user: userId }).select(
    "preferences.friendDiscovery",
  );

  return settings?.preferences?.friendDiscovery !== false;
}

async function findFriendByRouteId(friendId: string) {
  if (Types.ObjectId.isValid(friendId)) {
    return UserModel.findById(friendId);
  }

  const mockId = Number(friendId);

  if (Number.isInteger(mockId)) {
    return UserModel.findOne({ mockId });
  }

  return null;
}

async function getLiveProfileStats(userId: Types.ObjectId) {
  const [user, friendsCount, postsCount] = await Promise.all([
    UserModel.findById(userId).select("attendedSessionsCount"),
    FriendshipModel.countDocuments({ userId }),
    FeedPostModel.countDocuments({ user: userId }),
  ]);
  const activitiesCount = Number(user?.attendedSessionsCount) || 0;

  return [
    { value: String(activitiesCount), label: "Activities" },
    { value: String(friendsCount), label: "Friends" },
    { value: String(postsCount), label: "Posts" },
  ];
}

async function getProfileAccount(userId: unknown) {
  const account = await AccountModel.findOne({ user: userId })
    .populate("membership")
    .sort({ startAt: -1, createdAt: -1 });

  if (!account) {
    return null;
  }

  const item = asObject(account);
  const membership = asObject(item.membership);

  return {
    membershipName: membership.name ?? "Membership",
    creditsLeft: Number(item.creditsLeft ?? 0),
  };
}

async function serializeCurrentProfile(user: Record<string, any>) {
  const [stats, account] = await Promise.all([
    getLiveProfileStats(user._id),
    getProfileAccount(user._id),
  ]);

  return {
    ...serializeProfile({
      ...asObject(user),
      stats,
    }),
    account,
  };
}

router.use(requireAuth);

// Returns the signed-in user's profile.
router.get("/profile", async (_req, res) => {
  res.json(await serializeCurrentProfile(res.locals.user));
});

// Checks whether a requested profile handle is available.
router.get("/profile/handle-availability", async (req, res) => {
  const authUser = res.locals.user;
  const requestedHandle = getString(req.query.handle);

  if (!requestedHandle || !hasHandleCharacters(requestedHandle)) {
    res.status(400).json({
      message: "Handle must include letters, numbers, or underscores.",
    });
    return;
  }

  const handle = normalizeHandle(requestedHandle, authUser.handle);
  const overlappingUser = await findHandleOverlap(handle, authUser._id);

  res.json({
    handle,
    available: !overlappingUser,
    message: overlappingUser
      ? "That handle is already in use. Please choose another."
      : "",
  });
});

// Replaces editable profile fields for the signed-in user.
router.put("/profile", async (req, res, next) => {
  try {
    const authUser = res.locals.user;
    const name = getString(req.body?.name);
    const requestedHandle = getString(req.body?.handle);
    const bio = getString(req.body?.bio);
    const requestedAvatar = getRequestedAvatar(req.body);

    if (!name) {
      res.status(400).json({ message: "Name is required." });
      return;
    }

    if (name.length > maxNameLength) {
      res
        .status(400)
        .json({ message: `Name must be ${maxNameLength} characters or less.` });
      return;
    }

    if (!requestedHandle || !hasHandleCharacters(requestedHandle)) {
      res.status(400).json({
        message: "Handle must include letters, numbers, or underscores.",
      });
      return;
    }

    if (bio.length > maxBioLength) {
      res
        .status(400)
        .json({ message: `Bio must be ${maxBioLength} characters or less.` });
      return;
    }

    const handle = normalizeHandle(requestedHandle, name);
    const overlappingUser = await findHandleOverlap(handle, authUser._id);

    if (overlappingUser) {
      res.status(409).json({
        message: "That handle is already in use. Please choose another.",
        field: "handle",
        handle,
      });
      return;
    }

    const avatarUrl =
      requestedAvatar || authUser.avatarUrl || createAvatarUrl(name, authUser.email);
    const updatedUser = await UserModel.findByIdAndUpdate(
      authUser._id,
      {
        $set: {
          name,
          handle,
          avatarUrl,
          bio,
        },
      },
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedUser) {
      res.status(404).json({ message: "Profile not found." });
      return;
    }

    res.json(await serializeCurrentProfile(updatedUser));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        message: "That handle is already in use. Please choose another.",
        field: "handle",
      });
      return;
    }

    next(error);
  }
});

// Lists friends for the signed-in user.
router.get("/friends", async (_req, res) => {
  const authUser = res.locals.user;
  const savedFriends = await FriendshipModel.find({ userId: authUser._id })
    .populate("friendId")
    .sort({ createdAt: 1 });

  res.json(savedFriends.map(serializeFriend));
});

// Searches users that can be added as friends.
router.get("/friends/search", async (req, res) => {
  const authUser = res.locals.user;
  const query = normalizeHandleSearchQuery(getString(req.query.query));

  if (!query) {
    res.json([]);
    return;
  }

  const users = await UserModel.find({
    _id: { $ne: authUser._id },
    handle: new RegExp(`^@${escapeRegExp(query)}`, "i"),
  })
    .sort({ handle: 1 })
    .limit(24);
  const settings = await SettingsModel.find({
    user: { $in: users.map((user: Record<string, any>) => user._id) },
    "preferences.friendDiscovery": false,
  }).select("user");
  const hiddenUserIds = new Set(
    settings.map((setting: Record<string, any>) => String(setting.user)),
  );

  res.json(
    users
      .filter(
        (user: Record<string, any>) => !hiddenUserIds.has(String(user._id)),
      )
      .slice(0, 12)
      .map(serializeFriendSearchUser),
  );
});

// Adds another user as a friend for the signed-in user.
router.post("/friends/add/:friendId", async (req, res) => {
  const authUser = res.locals.user;
  const userId = String(authUser._id);
  const friendId = String(req.params.friendId ?? "").trim();

  if (!friendId) {
    res.status(400).json({ message: "Friend ID is required." });
    return;
  }

  if (!Types.ObjectId.isValid(friendId)) {
    res.status(404).json({ message: "Friend not found." });
    return;
  }

  if (friendId === userId) {
    res.status(400).json({ message: "You cannot add yourself as a friend." });
    return;
  }

  const friendUser = await UserModel.findById(friendId);

  if (!friendUser) {
    res.status(404).json({ message: "Friend not found." });
    return;
  }

  if (!(await isFriendDiscoverable(friendUser._id))) {
    res.status(404).json({ message: "Friend not found." });
    return;
  }

  const existingFriendship = await FriendshipModel.exists({
    userId: authUser._id,
    friendId: friendUser._id,
  });
  const friendship = await FriendshipModel.findOneAndUpdate(
    { userId: authUser._id, friendId: friendUser._id },
    {
      $setOnInsert: {
        userId: authUser._id,
        friendId: friendUser._id,
      },
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).populate("friendId");

  await FriendshipModel.updateOne(
    { userId: friendUser._id, friendId: authUser._id },
    {
      $setOnInsert: {
        userId: friendUser._id,
        friendId: authUser._id,
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  if (!existingFriendship) {
    await NotificationModel.create({
      user: friendUser._id,
      title: "New friend added",
      content: `${authUser.name} added you as a friend.`,
      link: "/profile",
      read: false,
    });
  }

  res.json(serializeFriend(friendship));
});

// Removes a friend from the signed-in user's friend list.
router.delete("/friends/:friendId", async (req, res) => {
  const authUser = res.locals.user;
  const friendId = String(req.params.friendId ?? "").trim();

  if (!friendId) {
    res.status(400).json({ message: "Friend ID is required." });
    return;
  }

  const friendUser = await findFriendByRouteId(friendId);

  if (!friendUser) {
    res.status(404).json({ message: "Friend not found." });
    return;
  }

  const result = await FriendshipModel.deleteMany({
    $or: [
      { userId: authUser._id, friendId: friendUser._id },
      { userId: friendUser._id, friendId: authUser._id },
    ],
  });

  if (result.deletedCount === 0) {
    res.status(404).json({ message: "Friendship not found." });
    return;
  }

  res.json({ friendId: String(friendUser.mockId ?? friendUser._id) });
});

export default router;
