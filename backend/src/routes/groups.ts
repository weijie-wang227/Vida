import { Router } from "express";
import { findAuthenticatedUser } from "../auth.js";
import {
  AdminModel,
  ActivityJoinModel,
  ActivityModel,
  BlacklistModel,
  ChatMessageModel,
  ChatModel,
  FeedPostModel,
  MapPinModel,
} from "../models/VidaData.js";
import { getChatPreview, getLatestChatPreviews } from "../chatPreviews.js";
import { serializeChat, serializeChatMessage } from "../serializers.js";

const router = Router();

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(doc: Record<string, any>) {
  return typeof doc.toObject === "function" ? doc.toObject() : doc;
}

function formatPreviewTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

async function findMemberChat(groupId: number, userId: unknown) {
  return ChatModel.findOne({ mockId: groupId, members: userId }).populate(
    "members",
  );
}

async function findAdminUserIds(groupId: unknown) {
  const admins = await AdminModel.find({ group: groupId }).select("user");

  return new Set(
    admins.map((admin: Record<string, any>) =>
      String(admin.user?._id ?? admin.user),
    ),
  );
}

async function findAdminUserIdsByGroup(
  groups: Record<string, any>[],
) {
  const groupIds = groups
    .map((group) => asObject(group)._id)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  if (groupIds.length === 0) {
    return new Map<string, Set<string>>();
  }

  const admins = await AdminModel.find({ group: { $in: groupIds } }).select(
    "group user",
  );
  const adminUserIdsByGroup = new Map<string, Set<string>>();

  for (const admin of admins) {
    const item = asObject(admin);
    const groupId = String(item.group?._id ?? item.group);
    const userId = String(item.user?._id ?? item.user);
    const adminUserIds = adminUserIdsByGroup.get(groupId) ?? new Set<string>();

    adminUserIds.add(userId);
    adminUserIdsByGroup.set(groupId, adminUserIds);
  }

  return adminUserIdsByGroup;
}

async function findAdminGroupIds(userId: unknown, groups: Record<string, any>[]) {
  const groupIds = groups
    .map((group) => asObject(group)._id)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  if (groupIds.length === 0) {
    return new Set<string>();
  }

  const admins = await AdminModel.find({
    user: userId,
    group: { $in: groupIds },
  }).select("group");

  return new Set(
    admins.map((admin: Record<string, any>) =>
      String(admin.group?._id ?? admin.group),
    ),
  );
}

async function isGroupAdmin(userId: unknown, groupId: unknown) {
  const admin = await AdminModel.findOne({ user: userId, group: groupId }).select(
    "_id",
  );

  return Boolean(admin);
}

async function deleteGroupById(groupObjectId: unknown) {
  const activities = await ActivityModel.find({ chat: groupObjectId }).select("_id");
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);

  if (activityIds.length > 0) {
    await FeedPostModel.updateMany(
      { activity: { $in: activityIds } },
      { $unset: { activity: "" } },
    );
    await ActivityJoinModel.deleteMany({ activityId: { $in: activityIds } });
    await MapPinModel.deleteMany({ activity: { $in: activityIds } });
    await ActivityModel.deleteMany({ _id: { $in: activityIds } });
  }

  await Promise.all([
    AdminModel.deleteMany({ group: groupObjectId }),
    BlacklistModel.deleteMany({ group: groupObjectId }),
    ChatMessageModel.deleteMany({ chat: groupObjectId }),
    FeedPostModel.updateMany({ group: groupObjectId }, { $unset: { group: "" } }),
    ChatModel.findByIdAndDelete(groupObjectId),
  ]);
}

async function removeMemberFromGroup(group: Record<string, any>, userId: unknown) {
  const activities = await ActivityModel.find({ chat: group._id }).select("_id");
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);

  await ChatModel.updateOne(
    { _id: group._id },
    { $pull: { members: userId } },
  );
  await AdminModel.deleteOne({ group: group._id, user: userId });

  if (activityIds.length > 0) {
    await ActivityJoinModel.deleteMany({
      userId,
      activityId: { $in: activityIds },
    });
  }
}

async function ensureGroupHasAdmin(groupObjectId: unknown) {
  const existingAdmin = await AdminModel.findOne({ group: groupObjectId }).select(
    "_id",
  );

  if (existingAdmin) {
    return;
  }

  const group = await ChatModel.findById(groupObjectId).select("members");
  const firstMember = group?.members?.[0];

  if (!firstMember) {
    return;
  }

  await AdminModel.updateOne(
    { group: groupObjectId, user: firstMember },
    { $setOnInsert: { group: groupObjectId, user: firstMember } },
    { upsert: true },
  );
}

async function getJoiningUsersByActivityId(activities: Record<string, any>[]) {
  const activityIds = activities
    .map((activity) => asObject(activity)._id)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  if (activityIds.length === 0) {
    return new Map<string, Record<string, any>[]>();
  }

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

router.get("/", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const groups = await ChatModel.find({ members: user._id })
      .populate("members")
      .sort({ updatedAt: -1, mockId: 1 });
    const previews = await getLatestChatPreviews(groups);
    const adminGroupIds = await findAdminGroupIds(user._id, groups);
    const adminUserIdsByGroup = await findAdminUserIdsByGroup(groups);

    res.json(
      groups.map((group) => {
        const groupObjectId = String(asObject(group)._id);

        return serializeChat(
          group,
          getChatPreview(previews, group),
          adminGroupIds.has(groupObjectId),
          adminUserIdsByGroup.get(groupObjectId),
        );
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const groupId = Number(req.params.id);
    const group = await findMemberChat(groupId, user._id);

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const previews = await getLatestChatPreviews([group]);
    const isAdmin = await isGroupAdmin(user._id, group._id);
    const adminUserIds = await findAdminUserIds(group._id);

    res.json(
      serializeChat(
        group,
        getChatPreview(previews, group),
        isAdmin,
        adminUserIds,
      ),
    );
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

    const groupId = Number(req.params.id);
    const group = await ChatModel.findOne({ mockId: groupId });

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const blacklist = await BlacklistModel.findOne({
      user: user._id,
      group: group._id,
    }).select("_id");

    if (blacklist) {
      res.status(403).json({
        message: "You cannot join this group because you are blacklisted.",
      });
      return;
    }

    const updatedGroup = await ChatModel.findByIdAndUpdate(
      group._id,
      { $addToSet: { members: user._id } },
      { new: true },
    ).populate("members");

    if (!updatedGroup) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const activity = await ActivityModel.findOne({ chat: group._id });

    if (activity) {
      await ActivityJoinModel.updateOne(
        { userId: user._id, activityId: activity._id },
        { $setOnInsert: { userId: user._id, activityId: activity._id } },
        { upsert: true },
      );
    }

    const previews = await getLatestChatPreviews([updatedGroup]);
    const isAdmin = await isGroupAdmin(user._id, updatedGroup._id);
    const adminUserIds = await findAdminUserIds(updatedGroup._id);

    res.json({
      group: serializeChat(
        updatedGroup,
        getChatPreview(previews, updatedGroup),
        isAdmin,
        adminUserIds,
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const groupId = Number(req.params.id);
    const group = await ChatModel.findOne({ mockId: groupId }).select("_id");

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    if (!(await isGroupAdmin(user._id, group._id))) {
      res.status(403).json({ message: "Only group admins can delete groups." });
      return;
    }

    await deleteGroupById(group._id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/members/me", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const groupId = Number(req.params.id);
    const group = await findMemberChat(groupId, user._id);

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    if ((group.members?.length ?? 0) <= 1) {
      await deleteGroupById(group._id);
      res.status(204).send();
      return;
    }

    await removeMemberFromGroup(group, user._id);
    await ensureGroupHasAdmin(group._id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/members/:memberId", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const groupId = Number(req.params.id);
    const group = await ChatModel.findOne({ mockId: groupId }).populate("members");

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    if (!(await isGroupAdmin(user._id, group._id))) {
      res.status(403).json({ message: "Only group admins can remove members." });
      return;
    }

    const targetMember = group.members.find(
      (member: Record<string, any>) => String(member._id) === req.params.memberId,
    );

    if (!targetMember) {
      res.status(404).json({ message: "Member not found in this group." });
      return;
    }

    if (String(targetMember._id) === String(user._id)) {
      res.status(400).json({ message: "Use leave group to remove yourself." });
      return;
    }

    if (await isGroupAdmin(targetMember._id, group._id)) {
      res.status(400).json({ message: "Admins cannot remove other admins." });
      return;
    }

    await removeMemberFromGroup(group, targetMember._id);

    const updatedGroup = await ChatModel.findById(group._id).populate("members");
    const previews = updatedGroup
      ? await getLatestChatPreviews([updatedGroup])
      : new Map();
    const adminUserIds = await findAdminUserIds(group._id);

    res.json({
      group: updatedGroup
        ? serializeChat(
            updatedGroup,
            getChatPreview(previews, updatedGroup),
            true,
            adminUserIds,
          )
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/admins/:memberId", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const groupId = Number(req.params.id);
    const group = await ChatModel.findOne({ mockId: groupId }).populate("members");

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    if (!(await isGroupAdmin(user._id, group._id))) {
      res.status(403).json({ message: "Only group admins can appoint admins." });
      return;
    }

    const targetMember = group.members.find(
      (member: Record<string, any>) => String(member._id) === req.params.memberId,
    );

    if (!targetMember) {
      res.status(404).json({ message: "Member not found in this group." });
      return;
    }

    await AdminModel.updateOne(
      { group: group._id, user: targetMember._id },
      { $setOnInsert: { group: group._id, user: targetMember._id } },
      { upsert: true },
    );

    const updatedGroup = await ChatModel.findById(group._id).populate("members");
    const previews = updatedGroup
      ? await getLatestChatPreviews([updatedGroup])
      : new Map();
    const adminUserIds = await findAdminUserIds(group._id);

    res.json({
      group: updatedGroup
        ? serializeChat(
            updatedGroup,
            getChatPreview(previews, updatedGroup),
            true,
            adminUserIds,
          )
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/blacklist/:memberId", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const groupId = Number(req.params.id);
    const group = await ChatModel.findOne({ mockId: groupId }).populate("members");

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    if (!(await isGroupAdmin(user._id, group._id))) {
      res.status(403).json({ message: "Only group admins can blacklist members." });
      return;
    }

    const targetMember = group.members.find(
      (member: Record<string, any>) => String(member._id) === req.params.memberId,
    );

    if (!targetMember) {
      res.status(404).json({ message: "Member not found in this group." });
      return;
    }

    if (String(targetMember._id) === String(user._id)) {
      res.status(400).json({ message: "You cannot blacklist yourself." });
      return;
    }

    if (await isGroupAdmin(targetMember._id, group._id)) {
      res.status(400).json({ message: "Admins cannot blacklist other admins." });
      return;
    }

    await BlacklistModel.updateOne(
      { group: group._id, user: targetMember._id },
      {
        $setOnInsert: {
          group: group._id,
          user: targetMember._id,
          blacklistedBy: user._id,
          reason: "You are blacklisted from this group.",
        },
      },
      { upsert: true },
    );
    await removeMemberFromGroup(group, targetMember._id);

    const updatedGroup = await ChatModel.findById(group._id).populate("members");
    const previews = updatedGroup
      ? await getLatestChatPreviews([updatedGroup])
      : new Map();
    const adminUserIds = await findAdminUserIds(group._id);

    res.json({
      group: updatedGroup
        ? serializeChat(
            updatedGroup,
            getChatPreview(previews, updatedGroup),
            true,
            adminUserIds,
          )
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/messages", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const groupId = Number(req.params.id);
    const group = await findMemberChat(groupId, user._id);

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const messages = await ChatMessageModel.find({ chat: group._id })
      .populate("chat")
      .populate("sender")
      .populate("activity")
      .sort({ createdAt: 1, _id: 1 })
      .limit(200);
    const adminUserIds = await findAdminUserIds(group._id);
    const inviteActivities = messages
      .map((message) => asObject(message).activity)
      .filter(
        (activity): activity is Record<string, any> =>
          Boolean(activity && asObject(activity)._id),
      );
    const joiningUsersByActivityId =
      await getJoiningUsersByActivityId(inviteActivities);

    res.json(
      messages.map((message) =>
        serializeChatMessage(message, adminUserIds, joiningUsersByActivityId),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/:id/messages", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const groupId = Number(req.params.id);
    const group = await findMemberChat(groupId, user._id);

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const body = getString(req.body?.body);

    if (!body) {
      res.status(400).json({ message: "Message cannot be empty." });
      return;
    }

    if (body.length > 1000) {
      res.status(400).json({ message: "Message is too long." });
      return;
    }

    const message = await ChatMessageModel.create({
      chat: group._id,
      sender: user._id,
      body,
    });
    const createdAt =
      message.createdAt instanceof Date ? message.createdAt : new Date();
    const updatedGroup = await ChatModel.findByIdAndUpdate(
      group._id,
      {
        lastMessage: `${user.name}: ${body}`,
        time: formatPreviewTime(createdAt),
      },
      { new: true },
    ).populate("members");
    const savedMessage = await ChatMessageModel.findById(message._id)
      .populate("chat")
      .populate("sender");
    const adminUserIds = await findAdminUserIds(group._id);
    const isAdmin = await isGroupAdmin(user._id, group._id);

    if (!updatedGroup || !savedMessage) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    res.status(201).json({
      message: serializeChatMessage(savedMessage, adminUserIds),
      group: serializeChat(updatedGroup, undefined, isAdmin, adminUserIds),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
