import { Router } from "express";
import { Types } from "mongoose";
import { countedRegistrationStatuses } from "../domain/sessionParticipation.js";
import { requireAuth } from "../middleware/auth.js";
import {
  AdminModel,
  BlacklistModel,
  ChatMessageModel,
  ChatModel,
  FeedPostModel,
  PollVoteModel,
  SessionParticipationModel,
  SessionModel,
  VendorModel,
} from "../models/VidaData.js";
import { getChatPreview, getLatestChatPreviews } from "../chatPreviews.js";
import { serializeChat, serializeChatMessage } from "../serializers.js";
import { getString } from "../utils/input.js";
import { asObject } from "../utils/mongoose.js";
import {
  ChatMessagePayloadError,
  getChatMessageType,
  normalizeChatMessagePayload,
} from "../chatMessages.js";

const router = Router();
router.use(requireAuth);

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
  const messageIds = await ChatMessageModel.find({ chat: groupObjectId }).distinct(
    "_id",
  );

  await Promise.all([
    AdminModel.deleteMany({ group: groupObjectId }),
    BlacklistModel.deleteMany({ group: groupObjectId }),
    ChatMessageModel.deleteMany({ chat: groupObjectId }),
    PollVoteModel.deleteMany({ message: { $in: messageIds } }),
    FeedPostModel.updateMany({ group: groupObjectId }, { $unset: { group: "" } }),
    ChatModel.findByIdAndDelete(groupObjectId),
  ]);
}

async function removeMemberFromGroup(group: Record<string, any>, userId: unknown) {
  await ChatModel.updateOne(
    { _id: group._id },
    { $pull: { members: userId } },
  );
  await AdminModel.deleteOne({ group: group._id, user: userId });
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

async function getParticipatingUsersBySessionId(sessionValues: unknown[]) {
  const sessionIds = sessionValues.filter(
    (id): id is NonNullable<typeof id> => Boolean(id),
  );

  if (sessionIds.length === 0) {
    return new Map<string, Record<string, any>[]>();
  }

  const participations = await SessionParticipationModel.find({
    sessionId: { $in: sessionIds },
    role: "participant",
    status: { $in: countedRegistrationStatuses },
  })
    .populate("userId")
    .sort({ createdAt: 1 });
  const usersBySessionId = new Map<string, Record<string, any>[]>();

  for (const participation of participations) {
    const item = asObject(participation);
    const sessionId = String(item.sessionId?._id ?? item.sessionId);
    const users = usersBySessionId.get(sessionId) ?? [];

    if (item.userId) {
      users.push(item.userId);
    }

    usersBySessionId.set(sessionId, users);
  }

  return usersBySessionId;
}

async function getPollResultsByMessageId(
  messages: Record<string, any>[],
  userId: unknown,
) {
  const pollMessageIds = messages
    .filter((message) => getChatMessageType(asObject(message).type) === "poll")
    .map((message) => asObject(message)._id)
    .filter(Boolean);

  if (pollMessageIds.length === 0) {
    return new Map();
  }

  const votes = await PollVoteModel.find({ message: { $in: pollMessageIds } }).lean();
  const results = new Map<
    string,
    {
      voteCounts: Record<string, number>;
      selectedOptionIds: string[];
      totalVotes: number;
    }
  >();

  for (const messageId of pollMessageIds) {
    results.set(String(messageId), {
      voteCounts: {},
      selectedOptionIds: [],
      totalVotes: 0,
    });
  }

  for (const voteValue of votes as Record<string, any>[]) {
    const vote = asObject(voteValue);
    const messageId = String(vote.message?._id ?? vote.message);
    const result = results.get(messageId);

    if (!result) {
      continue;
    }

    result.totalVotes += 1;
    for (const optionId of Array.isArray(vote.optionIds) ? vote.optionIds : []) {
      const key = String(optionId);
      result.voteCounts[key] = (result.voteCounts[key] ?? 0) + 1;
    }

    if (String(vote.user?._id ?? vote.user) === String(userId)) {
      result.selectedOptionIds = (vote.optionIds ?? []).map(String);
    }
  }

  return results;
}

async function isVendorManagedChat(userId: unknown, chatId: unknown) {
  const vendor = await VendorModel.findOne({ owner: userId }).select("_id");

  if (!vendor) {
    return false;
  }

  const session = await SessionModel.findOne({ chat: chatId })
    .populate({
      path: "activity",
      match: { host: vendor._id },
      select: "_id",
    })
    .select("activity");

  return Boolean(session?.activity);
}

// Lists group chats that the signed-in user belongs to.
router.get("/", async (req, res, next) => {
  try {
    const user = res.locals.user;
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

// Returns details for one group chat the signed-in user can access.
router.get("/:id", async (req, res, next) => {
  try {
    const user = res.locals.user;
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

// Adds the signed-in user to a group chat when joining is allowed.
router.post("/:id/join", async (req, res, next) => {
  try {
    const user = res.locals.user;
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

// Deletes a group chat when the signed-in user has permission.
router.delete("/:id", async (req, res, next) => {
  try {
    const user = res.locals.user;
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

// Removes the signed-in user from a group chat.
router.delete("/:id/members/me", async (req, res, next) => {
  try {
    const user = res.locals.user;
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

// Removes a member from a group chat when the requester is an admin.
router.delete("/:id/members/:memberId", async (req, res, next) => {
  try {
    const user = res.locals.user;
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

// Promotes a group member to admin when the requester is an admin.
router.post("/:id/admins/:memberId", async (req, res, next) => {
  try {
    const user = res.locals.user;
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

// Blacklists a member from a group and removes them from related access.
router.post("/:id/blacklist/:memberId", async (req, res, next) => {
  try {
    const user = res.locals.user;
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

// Lists messages for a group chat visible to the signed-in user.
router.get("/:id/messages", async (req, res, next) => {
  try {
    const user = res.locals.user;
    const groupId = Number(req.params.id);
    const group = await findMemberChat(groupId, user._id);

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const messages = await ChatMessageModel.find({ chat: group._id })
      .populate("chat")
      .populate("sender")
      .sort({ createdAt: 1, _id: 1 })
      .limit(200);
    const adminUserIds = await findAdminUserIds(group._id);
    const inviteSessionIds = messages.flatMap((messageValue) => {
      const message = asObject(messageValue);

      if (getChatMessageType(message.type) !== "activity_invite") {
        return [];
      }

      const payload = normalizeChatMessagePayload(
        "activity_invite",
        message.payload,
      );

      return [payload.session.objectId];
    });
    const participatingUsersBySessionId =
      await getParticipatingUsersBySessionId(inviteSessionIds);
    const pollResultsByMessageId = await getPollResultsByMessageId(
      messages,
      user._id,
    );

    res.json(
      messages.map((message) =>
        serializeChatMessage(
          message,
          adminUserIds,
          participatingUsersBySessionId,
          pollResultsByMessageId,
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
});

// Sends a message to a group chat as the signed-in user.
router.post("/:id/messages", async (req, res, next) => {
  try {
    const user = res.locals.user;
    const groupId = Number(req.params.id);
    const group = await findMemberChat(groupId, user._id);

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const text = getString(req.body?.text);

    if (!text) {
      res.status(400).json({ message: "Message cannot be empty." });
      return;
    }

    if (text.length > 1000) {
      res.status(400).json({ message: "Message is too long." });
      return;
    }

    const message = await ChatMessageModel.create({
      chat: group._id,
      sender: user._id,
      type: "text",
      schemaVersion: 1,
      payload: normalizeChatMessagePayload("text", { text }),
    });
    const createdAt =
      message.createdAt instanceof Date ? message.createdAt : new Date();
    const updatedGroup = await ChatModel.findByIdAndUpdate(
      group._id,
      {
        lastMessage: `${user.name}: ${text}`,
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

// Creates a poll in a session chat. Only the vendor managing that session may do so.
router.post("/:id/polls", async (req, res, next) => {
  try {
    const user = res.locals.user;
    const groupId = Number(req.params.id);
    const group = await findMemberChat(groupId, user._id);

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    if (!(await isVendorManagedChat(user._id, group._id))) {
      res.status(403).json({
        message: "Only the vendor managing this session can create polls.",
      });
      return;
    }

    let payload;

    try {
      payload = normalizeChatMessagePayload("poll", {
        question: req.body?.question,
        options: req.body?.options,
      });
    } catch (error) {
      if (error instanceof ChatMessagePayloadError) {
        res.status(400).json({ message: error.message });
        return;
      }

      throw error;
    }

    const message = await ChatMessageModel.create({
      chat: group._id,
      sender: user._id,
      type: "poll",
      schemaVersion: 1,
      payload,
    });
    const createdAt =
      message.createdAt instanceof Date ? message.createdAt : new Date();
    const updatedGroup = await ChatModel.findByIdAndUpdate(
      group._id,
      {
        lastMessage: `${user.name} created a poll: ${payload.question}`,
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

// Records or replaces one chat member's selection in a poll.
router.post("/:id/polls/:messageId/votes", async (req, res, next) => {
  try {
    const user = res.locals.user;
    const groupId = Number(req.params.id);
    const group = await findMemberChat(groupId, user._id);

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    if (!Types.ObjectId.isValid(req.params.messageId)) {
      res.status(400).json({ message: "Choose a valid poll." });
      return;
    }

    const message = await ChatMessageModel.findOne({
      _id: req.params.messageId,
      chat: group._id,
      type: "poll",
    });

    if (!message) {
      res.status(404).json({ message: "Poll not found." });
      return;
    }

    const payload = normalizeChatMessagePayload("poll", message.payload);
    const optionId = getString(req.body?.optionId);

    if (!payload.options.some((option) => option.id === optionId)) {
      res.status(400).json({ message: "Choose a valid poll option." });
      return;
    }

    await PollVoteModel.findOneAndUpdate(
      { message: message._id, user: user._id },
      { $set: { optionIds: [optionId] } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    const savedMessage = await ChatMessageModel.findById(message._id)
      .populate("chat")
      .populate("sender");
    const adminUserIds = await findAdminUserIds(group._id);

    if (!savedMessage) {
      res.status(404).json({ message: "Poll not found." });
      return;
    }

    const pollResults = await getPollResultsByMessageId(
      [savedMessage],
      user._id,
    );

    res.json({
      message: serializeChatMessage(
        savedMessage,
        adminUserIds,
        new Map(),
        pollResults,
      ),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
