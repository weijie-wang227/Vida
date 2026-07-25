import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  AdminModel,
  ActivityModel,
  BlacklistModel,
  ChatModel,
  RatingModel,
  SessionParticipationModel,
  SessionModel,
  VendorModel,
} from "../models/VidaData.js";
import {
  serializeActivity,
  serializeParticipationUser,
  serializeChat,
  serializeMapPin,
  serializeSession,
} from "../serializers.js";
import { toIsoString } from "../utils/date.js";
import { getString } from "../utils/input.js";
import { asObject } from "../utils/mongoose.js";
import {
  getActivitySelector,
  getSessionSelector,
} from "../utils/routeSelectors.js";
import {
  createScheduledSession,
  registerForSession,
  SessionOperationError,
} from "../services/sessionOperations.js";
import { countedRegistrationStatuses } from "../domain/sessionParticipation.js";

const router = Router();
const blacklistJoinReason =
  "You cannot join this session because you are blacklisted from its group.";
const openSessionFilter = { isOpen: true, isActive: true };

function sendSessionOperationError(res: any, error: unknown) {
  if (!(error instanceof SessionOperationError)) {
    return false;
  }

  res.status(error.status).json({ message: error.message, ...error.details });
  return true;
}

function getFiniteNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));

  return Number.isNaN(date.getTime()) ? null : date;
}

async function findSessionByRouteId(sessionId: string, extraFilter = {}) {
  const sessionSelector = getSessionSelector(sessionId);

  if (sessionSelector.length === 0) {
    return null;
  }

  return SessionModel.findOne({
    ...extraFilter,
    $or: sessionSelector,
  })
    .populate({
      path: "activity",
      populate: [{ path: "host" }, { path: "tags" }],
    })
    .populate("chat");
}

async function getParticipatingUsersBySessionId(sessionId: unknown) {
  const participations = await SessionParticipationModel.find({
    sessionId,
    role: "participant",
    status: { $in: countedRegistrationStatuses },
  })
    .populate("userId")
    .sort({ createdAt: 1 })
    .limit(12);

  return participations
    .map((participation: Record<string, any>) => asObject(participation).userId)
    .filter(Boolean);
}

function attachSessionsToActivity(
  activity: Record<string, any>,
  sessions: Record<string, any>[],
) {
  return {
    ...asObject(activity),
    sessions: sessions.map((session) => asObject(session)),
  };
}

function getLinkedGroupId(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const groupId = Number(value);

  return Number.isInteger(groupId) ? groupId : Number.NaN;
}

function readSessionPayload(input: Record<string, any>, fallbackTitle: string) {
  const title = getString(input.title) || fallbackTitle;
  const startsAt = getDate(input.startsAt);
  const location = getString(input.location);
  const lat = getFiniteNumber(input.lat ?? input.latitude);
  const lng = getFiniteNumber(input.lng ?? input.longitude);
  const duration = getFiniteNumber(input.duration ?? input.durationMinutes);
  const spots = getFiniteNumber(input.spots);
  const groupId = getLinkedGroupId(input.groupId);

  return {
    title,
    startsAt,
    location,
    lat,
    lng,
    duration,
    spots,
    groupId,
  };
}

function validateSessionPayload(session: ReturnType<typeof readSessionPayload>) {
  if (!session.title || !session.startsAt || !session.location) {
    return "Session title, start date/time, and location are required.";
  }

  if (
    session.lat === null ||
    session.lng === null ||
    session.lat < -90 ||
    session.lat > 90 ||
    session.lng < -180 ||
    session.lng > 180
  ) {
    return "Choose a valid session location.";
  }

  if (session.duration === null || session.duration < 15) {
    return "Session duration must be at least 15 minutes.";
  }

  if (session.spots === null || session.spots < 1) {
    return "Session spots must be at least 1.";
  }

  if (Number.isNaN(session.groupId)) {
    return "Choose a valid group chat.";
  }

  return null;
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

function serializeReview(review: Record<string, any> | null) {
  if (!review) {
    return null;
  }

  const item = asObject(review);

  return {
    id: String(item._id),
    activityId: String(item.activity?._id ?? item.activity),
    rating: Number(item.rating),
    review: item.review ?? "",
  };
}

function serializePublicReview(review: Record<string, any>) {
  const item = asObject(review);
  const sender = item.sender ? asObject(item.sender) : null;

  return {
    id: String(item._id),
    rating: Number(item.rating),
    review: item.review ?? "",
    createdAt: toIsoString(item.createdAt),
    sender: sender
      ? {
          id: String(sender._id ?? ""),
          name: sender.name ?? "Unknown user",
          handle: sender.handle ?? "",
          avatar: sender.avatarUrl ?? "",
        }
      : null,
  };
}

function serializeSessionReviewSummary(sessionValue: Record<string, any>) {
  const session = asObject(sessionValue);
  const activity = asObject(session.activity ?? {});

  return {
    id: session.mockId,
    objectId: String(session._id),
    activityId: activity.mockId,
    activityObjectId: String(activity._id ?? session.activity),
    title: activity.title ?? session.title,
    sessionTitle: session.title,
    startsAt: toIsoString(session.startsAt),
    location: session.location,
    rating: Number(activity.rating),
  };
}

// Creates a scheduled session for an existing vendor activity.
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const vendorQuery =
      req.body?.vendorId === undefined ||
      req.body?.vendorId === null ||
      req.body?.vendorId === ""
        ? { owner: user._id }
        : { _id: req.body.vendorId, owner: user._id };
    const vendor = await VendorModel.findOne(vendorQuery);

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    const activitySelector = getActivitySelector(String(req.body?.activityId ?? ""));

    if (activitySelector.length === 0) {
      res.status(400).json({ message: "Choose a valid activity." });
      return;
    }

    const activity = await ActivityModel.findOne({
      host: vendor._id,
      $or: activitySelector,
    });

    if (!activity) {
      res.status(404).json({ message: "Activity not found." });
      return;
    }

    const sessionPayload = readSessionPayload(req.body ?? {}, activity.title);
    const errorMessage = validateSessionPayload(sessionPayload);

    if (errorMessage) {
      res.status(400).json({ message: errorMessage });
      return;
    }

    const linkedChat =
      sessionPayload.groupId === null
        ? null
        : await ChatModel.findOne({
            mockId: sessionPayload.groupId,
            members: user._id,
          });

    if (sessionPayload.groupId !== null && !linkedChat) {
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

    const operation = await createScheduledSession({
      userId: user._id,
      userName: user.name,
      activityId: activity._id,
      activityMockId: activity.mockId,
      activityTitle: activity.title,
      activityCategories: Array.isArray(activity.categories)
        ? activity.categories.map(String)
        : [],
      activityCredits: Number(activity.credits),
      linkedChatId: linkedChat?._id,
      session: {
        title: sessionPayload.title,
        startsAt: sessionPayload.startsAt as Date,
        duration: Math.round(Number(sessionPayload.duration)),
        spots: Math.round(Number(sessionPayload.spots)),
        location: sessionPayload.location,
        lat: Number(sessionPayload.lat),
        lng: Number(sessionPayload.lng),
      },
    });
    const session = operation.session;

    const savedActivity = await ActivityModel.findById(activity._id)
      .populate("host")
      .populate("tags");
    const savedSessions = await SessionModel.find({ activity: activity._id })
      .populate("activity")
      .populate("chat")
      .sort({ startsAt: 1, mockId: 1 });
    const firstChat = await ChatModel.findById(operation.chatId).populate("members");
    const adminUserIds = firstChat
      ? await findAdminUserIds(firstChat._id)
      : new Set<string>();

    res.status(201).json({
      activity: serializeActivity(
        attachSessionsToActivity(savedActivity, savedSessions),
        [],
      ),
      session: serializeSession(session),
      sessions: savedSessions.map(serializeSession),
      mapPin: serializeMapPin(session),
      mapPins: savedSessions.map(serializeMapPin),
      group: firstChat
        ? serializeChat(firstChat, undefined, true, adminUserIds)
        : null,
    });
  } catch (error) {
    if (sendSessionOperationError(res, error)) {
      return;
    }

    next(error);
  }
});

// Joins the signed-in user to an open session and linked group.
router.post("/:id/join", requireAuth, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const session = await findSessionByRouteId(String(req.params.id), openSessionFilter);

    if (!session) {
      res.status(404).json({ message: "Open session not found" });
      return;
    }

    const sessionItem = asObject(session);
    const activity = asObject(sessionItem.activity ?? {});
    const groupId = sessionItem.chat?._id ?? sessionItem.chat;
    const blacklist = await BlacklistModel.findOne({
      user: user._id,
      group: groupId,
    }).select("_id");

    if (blacklist) {
      res.status(403).json({ message: blacklistJoinReason });
      return;
    }

    const operation = await registerForSession(user._id, sessionItem._id);
    const updatedSession = await findSessionByRouteId(String(sessionItem._id));
    const group = await ChatModel.findById(operation.groupId).populate("members");

    if (!updatedSession || !group) {
      throw new SessionOperationError("Unable to load the joined session.", 500);
    }

    const participatingUsers = await getParticipatingUsersBySessionId(
      sessionItem._id,
    );
    const adminUserIds = await findAdminUserIds(group._id);
    const serializedActivity = serializeActivity(
      {
        ...activity,
        sessions: [updatedSession],
      },
      participatingUsers,
    );

    res.json({
      activity: {
        ...serializedActivity,
        id: activity.mockId,
        objectId: String(activity._id ?? sessionItem.activity ?? ""),
        sessions: [
          {
            ...serializeSession(updatedSession),
            participatingFriends: participatingUsers.map(
              serializeParticipationUser,
            ),
          },
        ],
      },
      session: serializeSession(updatedSession),
      account: operation.account
        ? {
            id: String(operation.account._id),
            creditsLeft: Number(operation.account.creditsLeft),
          }
        : undefined,
      group: serializeChat(group, undefined, false, adminUserIds),
    });
  } catch (error) {
    if (sendSessionOperationError(res, error)) {
      return;
    }

    next(error);
  }
});

// Lists reviews for the activity attached to a session.
router.get("/:id/reviews", async (req, res) => {
  const session = await findSessionByRouteId(String(req.params.id));

  if (!session) {
    res.status(404).json({ message: "Session not found" });
    return;
  }

  const activity = asObject(asObject(session).activity ?? {});

  if (!activity._id) {
    res.status(404).json({ message: "Activity not found" });
    return;
  }

  const reviews = await RatingModel.find({ activity: activity._id })
    .populate("sender")
    .sort({ createdAt: -1 });

  res.json({
    session: serializeSessionReviewSummary(session),
    reviews: reviews.map(serializePublicReview),
  });
});

// Returns the signed-in user's existing review eligibility and review for a session.
router.get("/:id/review", requireAuth, async (req, res) => {
  const user = res.locals.user;
  const session = await findSessionByRouteId(String(req.params.id));

  if (!session) {
    res.status(404).json({ message: "Session not found" });
    return;
  }

  const activity = asObject(asObject(session).activity ?? {});
  const join = await SessionParticipationModel.findOne({
    sessionId: session._id,
    userId: user._id,
    role: "participant",
    status: "attended",
  }).select("_id");

  if (!join) {
    res.status(403).json({
      message: "You can review this session after your attendance is marked.",
    });
    return;
  }

  const review = await RatingModel.findOne({
    activity: activity._id,
    sender: user._id,
  });

  res.json({
    session: serializeSessionReviewSummary(session),
    review: serializeReview(review),
  });
});

// Creates or updates the signed-in user's review for a session they attended.
router.post("/:id/review", requireAuth, async (req, res) => {
  const user = res.locals.user;
  const session = await findSessionByRouteId(String(req.params.id));

  if (!session) {
    res.status(404).json({ message: "Session not found" });
    return;
  }

  const activity = asObject(asObject(session).activity ?? {});
  const join = await SessionParticipationModel.findOne({
    sessionId: session._id,
    userId: user._id,
    role: "participant",
    status: "attended",
  }).select("_id");

  if (!join) {
    res.status(403).json({
      message: "You can review this session after your attendance is marked.",
    });
    return;
  }

  const rating = Number(req.body?.rating);
  const review = getString(req.body?.review);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ message: "Choose a rating from 1 to 5 stars." });
    return;
  }

  if (review.length > 500) {
    res.status(400).json({ message: "Review must be 500 characters or less." });
    return;
  }

  const savedReview = await RatingModel.findOneAndUpdate(
    { activity: activity._id, sender: user._id },
    { $set: { rating, review } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );

  res.json({
    session: serializeSessionReviewSummary(session),
    review: serializeReview(savedReview),
  });
});

export default router;
