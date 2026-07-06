import { Router } from "express";
import { findAuthenticatedUser } from "../auth.js";
import {
  AdminModel,
  ActivityJoinModel,
  ActivityModel,
  BlacklistModel,
  ChatMessageModel,
  ChatModel,
  MapPinModel,
  SettingsModel,
  UserModel,
  VendorModel,
} from "../models/VidaData.js";
import { getChatPreview, getLatestChatPreviews } from "../chatPreviews.js";
import { serializeActivity, serializeChat, serializeMapPin } from "../serializers.js";

const router = Router();
const vidaCategories = new Set([
  "physical",
  "social",
  "cognitive",
  "creative",
]);
const blacklistJoinReason =
  "You cannot join this activity because you are blacklisted from its group.";

function asObject(doc: Record<string, any>) {
  return typeof doc.toObject === "function" ? doc.toObject() : doc;
}

async function getJoiningUsersByActivityId(activities: Record<string, any>[]) {
  const activityIds = activities.map((activity) => activity._id);
  const joins = await ActivityJoinModel.find({ activityId: { $in: activityIds } })
    .populate("userId")
    .sort({ createdAt: 1 });
  const usersByActivityId = new Map<string, Record<string, any>[]>();

  for (const join of joins) {
    const item = asObject(join);
    const activityId = String(item.activityId?._id ?? item.activityId);
    const users = usersByActivityId.get(activityId) ?? [];

    users.push(item.userId);
    usersByActivityId.set(activityId, users);
  }

  return usersByActivityId;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function findUserByRouteId(userId: string) {
  if (userId.match(/^[a-f\d]{24}$/i)) {
    return UserModel.findById(userId);
  }

  const mockId = Number(userId);

  if (Number.isInteger(mockId)) {
    return UserModel.findOne({ mockId });
  }

  return null;
}

async function canViewActivityHistory(viewerId: unknown, profileUserId: unknown) {
  if (String(viewerId) === String(profileUserId)) {
    return true;
  }

  const settings = await SettingsModel.findOne({ user: profileUserId }).select(
    "preferences.privateActivityHistory",
  );

  return settings?.preferences?.privateActivityHistory !== true;
}

function serializePreviousActivity(activityValue: unknown) {
  const activity =
    typeof activityValue === "object" && activityValue !== null
      ? asObject(activityValue as Record<string, any>)
      : {};

  return {
    id: activity.mockId,
    title: activity.title,
    startsAt:
      activity.startsAt instanceof Date
        ? activity.startsAt.toISOString()
        : new Date(String(activity.startsAt ?? "")).toISOString(),
    location: activity.location,
  };
}

function getFiniteNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

async function nextMockId(
  model: typeof ActivityModel | typeof ChatModel | typeof MapPinModel,
) {
  const lastItem = await model.findOne().sort({ mockId: -1 }).select("mockId");

  return (lastItem?.mockId ?? 0) + 1;
}

function getDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPreviewTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

async function isGroupAdmin(userId: unknown, groupId: unknown) {
  const admin = await AdminModel.findOne({ user: userId, group: groupId }).select(
    "_id",
  );

  return Boolean(admin);
}

async function findAdminUserIds(groupId: unknown) {
  const admins = await AdminModel.find({ group: groupId }).select("user");

  return new Set(
    admins.map((admin: Record<string, any>) =>
      String(admin.user?._id ?? admin.user),
    ),
  );
}

async function findBlacklistedGroupIds(userId: unknown, activities: Record<string, any>[]) {
  const groupIds = activities
    .map((activity) => asObject(activity).chat?._id ?? asObject(activity).chat)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  if (groupIds.length === 0) {
    return new Set<string>();
  }

  const blacklistRows = await BlacklistModel.find({
    user: userId,
    group: { $in: groupIds },
  }).select("group");

  return new Set(
    blacklistRows.map((row: Record<string, any>) =>
      String(row.group?._id ?? row.group),
    ),
  );
}

function withJoinDisabledReason(activity: Record<string, any>, groupIds: Set<string>) {
  const item = asObject(activity);
  const groupId = String(item.chat?._id ?? item.chat ?? "");

  if (!groupIds.has(groupId)) {
    return activity;
  }

  return {
    ...item,
    joinDisabledReason: blacklistJoinReason,
  };
}

router.get("/", async (req, res) => {
  const user = await findAuthenticatedUser(req.headers.authorization);
  const activities = await ActivityModel.find({ isPremium: false })
    .populate("host")
    .populate("vendor")
    .sort({ mockId: 1 });
  const joiningUsersByActivityId = await getJoiningUsersByActivityId(activities);
  const blacklistedGroupIds = user
    ? await findBlacklistedGroupIds(user._id, activities)
    : new Set<string>();

  res.json(
    activities.map((activity) =>
      serializeActivity(
        withJoinDisabledReason(activity, blacklistedGroupIds),
        joiningUsersByActivityId.get(String(activity._id)) ?? [],
      ),
    ),
  );
});

router.get("/premium", async (req, res) => {
  const user = await findAuthenticatedUser(req.headers.authorization);
  const activities = await ActivityModel.find({ isPremium: true })
    .populate("host")
    .populate("vendor")
    .sort({ mockId: 1 });
  const joiningUsersByActivityId = await getJoiningUsersByActivityId(activities);
  const blacklistedGroupIds = user
    ? await findBlacklistedGroupIds(user._id, activities)
    : new Set<string>();

  res.json(
    activities.map((activity) =>
      serializeActivity(
        withJoinDisabledReason(activity, blacklistedGroupIds),
        joiningUsersByActivityId.get(String(activity._id)) ?? [],
      ),
    ),
  );
});

router.get("/map-pins", async (_req, res) => {
  const pins = await MapPinModel.find()
    .populate("activity")
    .sort({ mockId: 1 });
  res.json(pins.map(serializeMapPin));
});

router.get("/previous/:userId", async (req, res) => {
  const authUser = await findAuthenticatedUser(req.headers.authorization);

  if (!authUser) {
    res.status(401).json({ message: "Not signed in." });
    return;
  }

  const profileUser = await findUserByRouteId(String(req.params.userId ?? ""));

  if (!profileUser) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  if (!(await canViewActivityHistory(authUser._id, profileUser._id))) {
    res.json([]);
    return;
  }

  const joins = await ActivityJoinModel.find({ userId: profileUser._id })
    .populate({
      path: "activityId",
      match: { startsAt: { $lt: new Date() } },
    })
    .sort({ createdAt: -1 });
  const previousActivities = joins
    .map((join: Record<string, any>) => join.activityId)
    .filter(Boolean)
    .sort((firstActivity: Record<string, any>, secondActivity: Record<string, any>) => {
      const firstStartsAt = new Date(String(firstActivity.startsAt ?? "")).getTime();
      const secondStartsAt = new Date(String(secondActivity.startsAt ?? "")).getTime();

      return secondStartsAt - firstStartsAt;
    })
    .map(serializePreviousActivity);

  res.json(previousActivities);
});

router.post("/", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const title = getString(req.body?.title);
    const startsAt = getDate(req.body?.startsAt);
    const location = getString(req.body?.location);
    const latitude = getFiniteNumber(req.body?.latitude);
    const longitude = getFiniteNumber(req.body?.longitude);
    const durationMinutes = getFiniteNumber(req.body?.durationMinutes);
    const spots = getFiniteNumber(req.body?.spots);
    const credits = getFiniteNumber(req.body?.credits ?? 0);
    const createAsVendor = Boolean(req.body?.vendorId || req.body?.createAsVendor);
    const linkedGroupId =
      req.body?.groupId === undefined ||
      req.body?.groupId === null ||
      req.body?.groupId === ""
        ? null
        : Number(req.body.groupId);
    const categories: string[] = Array.isArray(req.body?.categories)
      ? req.body.categories.map(getString).filter(Boolean)
      : [];

    if (!title || !startsAt || !location) {
      res.status(400).json({
        message: "Title, start date/time, and location are required.",
      });
      return;
    }

    if (linkedGroupId !== null && !Number.isInteger(linkedGroupId)) {
      res.status(400).json({ message: "Choose a valid group chat." });
      return;
    }

    if (
      latitude === null ||
      longitude === null ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      res.status(400).json({ message: "Choose a valid pin location." });
      return;
    }

    if (durationMinutes === null || durationMinutes < 15) {
      res.status(400).json({
        message: "Duration must be at least 15 minutes.",
      });
      return;
    }

    if (spots === null || spots < 1) {
      res.status(400).json({ message: "Spots must be at least 1." });
      return;
    }

    if (credits === null || credits < 0) {
      res.status(400).json({ message: "Credits cannot be negative." });
      return;
    }

    if (
      categories.length === 0 ||
      categories.some((category) => !vidaCategories.has(category))
    ) {
      res.status(400).json({ message: "Choose at least one valid category." });
      return;
    }

    const vendorQuery =
      req.body?.vendorId === undefined ||
      req.body?.vendorId === null ||
      req.body?.vendorId === ""
        ? { owner: user._id }
        : { _id: req.body.vendorId, owner: user._id };
    const vendor = createAsVendor ? await VendorModel.findOne(vendorQuery) : null;

    if (createAsVendor && !vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    const [activityMockId, chatMockId, mapPinMockId] = await Promise.all([
      nextMockId(ActivityModel),
      nextMockId(ChatModel),
      nextMockId(MapPinModel),
    ]);
    const linkedChat =
      linkedGroupId === null
        ? null
        : await ChatModel.findOne({
            mockId: linkedGroupId,
            members: user._id,
          });

    if (linkedGroupId !== null && !linkedChat) {
      res.status(404).json({ message: "Group chat not found." });
      return;
    }

    if (linkedChat) {
      const canPostInvite = await isGroupAdmin(user._id, linkedChat._id);

      if (!canPostInvite) {
        res.status(403).json({
          message: "Only group admins can link activities to this chat.",
        });
        return;
      }
    }

    const chat =
      linkedChat ??
      (await ChatModel.create({
        mockId: chatMockId,
        name: title,
        avatar: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
          title,
        )}`,
        members: [user._id],
        lastMessage: "",
        time: "",
        unread: 0,
      }));

    if (!linkedChat) {
      await AdminModel.create({
        user: user._id,
        group: chat._id,
      });
    }

    const activity = await ActivityModel.create({
      mockId: activityMockId,
      title,
      host: user._id,
      vendor: vendor?._id,
      startsAt,
      location,
      durationMinutes: Math.round(durationMinutes),
      spots: Math.round(spots),
      credits,
      rating: 5,
      categories,
      chat: chat._id,
      isPremium: false,
      tags: [],
    });

    if (vendor) {
      await VendorModel.findByIdAndUpdate(vendor._id, {
        $addToSet: { allActivities: activity._id },
      });
    }

    const pin = await MapPinModel.create({
      mockId: mapPinMockId,
      activity: activity._id,
      latitude,
      longitude,
      label: title,
      premium: false,
    });

    await ActivityJoinModel.create({
      userId: user._id,
      activityId: activity._id,
    });

    const message = await ChatMessageModel.create({
      chat: chat._id,
      sender: user._id,
      body: `${user.name} invited the group to ${title}.`,
      type: "activity_invite",
      activity: activity._id,
    });
    const createdAt =
      message.createdAt instanceof Date ? message.createdAt : new Date();

    await ChatModel.findByIdAndUpdate(chat._id, {
      lastMessage: `Activity invite: ${title}`,
      time: formatPreviewTime(createdAt),
    });

    const savedActivity = await ActivityModel.findById(activity._id).populate(
      "host",
    ).populate("vendor");
    const savedPin = await MapPinModel.findById(pin._id).populate("activity");
    const savedChat = await ChatModel.findById(chat._id).populate("members");
    const adminUserIds = await findAdminUserIds(chat._id);

    res.status(201).json({
      activity: serializeActivity(savedActivity, [user]),
      mapPin: serializeMapPin(savedPin),
      group: serializeChat(savedChat, undefined, true, adminUserIds),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/join", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const activityId = Number(req.params.id);
    const activity = await ActivityModel.findOne({ mockId: activityId }).populate(
      "host",
    ).populate("vendor");

    if (!activity) {
      res.status(404).json({ message: "Activity not found" });
      return;
    }

    const blacklist = await BlacklistModel.findOne({
      user: user._id,
      group: activity.chat,
    }).select("_id");

    if (blacklist) {
      res.status(403).json({ message: blacklistJoinReason });
      return;
    }

    await ActivityJoinModel.updateOne(
      { userId: user._id, activityId: activity._id },
      { $setOnInsert: { userId: user._id, activityId: activity._id } },
      { upsert: true },
    );

    const group = await ChatModel.findByIdAndUpdate(
      activity.chat,
      { $addToSet: { members: user._id } },
      { new: true },
    ).populate("members");

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const joiningUsersByActivityId = await getJoiningUsersByActivityId([
      activity,
    ]);
    const previews = await getLatestChatPreviews([group]);
    const isAdmin = await isGroupAdmin(user._id, group._id);
    const adminUserIds = await findAdminUserIds(group._id);

    res.json({
      activity: serializeActivity(
        activity,
        joiningUsersByActivityId.get(String(activity._id)) ?? [],
      ),
      group: serializeChat(
        group,
        getChatPreview(previews, group),
        isAdmin,
        adminUserIds,
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res) => {
  const user = await findAuthenticatedUser(req.headers.authorization);
  const activityId = Number(req.params.id);
  const activity = await ActivityModel.findOne({ mockId: activityId }).populate(
    "host",
  ).populate("vendor");

  if (!activity) {
    res.status(404).json({ message: "Activity not found" });
    return;
  }

  const joiningUsersByActivityId = await getJoiningUsersByActivityId([activity]);
  const blacklistedGroupIds = user
    ? await findBlacklistedGroupIds(user._id, [activity])
    : new Set<string>();

  res.json(
    serializeActivity(
      withJoinDisabledReason(activity, blacklistedGroupIds),
      joiningUsersByActivityId.get(String(activity._id)) ?? [],
    ),
  );
});

export default router;
