import { Router } from "express";
import type { Types } from "mongoose";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import {
  ActivityModel,
  FavouriteModel,
  SessionParticipationModel,
  SessionModel,
  SettingsModel,
  TagModel,
  UserModel,
  VendorModel,
} from "../models/VidaData.js";
import {
  serializeActivity,
  serializeParticipationUser,
  serializeMapPin,
  serializeSession,
} from "../serializers.js";
import { formatSessionDateTime, toIsoString } from "../utils/date.js";
import { getString } from "../utils/input.js";
import { asObject } from "../utils/mongoose.js";
import { getPagination } from "../utils/pagination.js";
import {
  getActivitySelector,
} from "../utils/routeSelectors.js";
import { countedRegistrationStatuses } from "../domain/sessionParticipation.js";
import {
  getActivityCollectionFilters,
  isActivityCollectionType,
} from "../domain/activityCollections.js";

const router = Router();
const vidaCategories = new Set([
  "physical",
  "social",
  "cognitive",
  "creative",
]);
const openSessionFilter = { isOpen: true, isActive: true };
const maxActivityImages = 5;

function attachSessionsToActivity(
  activity: Record<string, any>,
  sessions: Record<string, any>[],
) {
  return {
    ...asObject(activity),
    sessions: sessions.map((session) => asObject(session)),
  };
}

function getPrimarySession(sessions: Record<string, any>[]) {
  return sessions[0] ?? null;
}

function getActivityImageUrls(value: unknown) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const imageUrls = value.map((item) => getString(item));
  if (
    imageUrls.length > maxActivityImages ||
    imageUrls.some((imageUrl) => !imageUrl || !/^https?:\/\//i.test(imageUrl))
  ) {
    return null;
  }

  return imageUrls;
}

function serializeActivityWithSessionParticipations(
  activityWithSessions: Record<string, any>,
  participatingUsersBySessionId: Map<string, Record<string, any>[]>,
) {
  const sessions = Array.isArray(activityWithSessions.sessions)
    ? activityWithSessions.sessions
    : [];
  const primarySession = getPrimarySession(sessions);
  const serializedActivity = serializeActivity(
    activityWithSessions,
    primarySession
      ? participatingUsersBySessionId.get(String(asObject(primarySession)._id)) ?? []
      : [],
  );

  return {
    ...serializedActivity,
    sessions: sessions.map((session: Record<string, any>) => ({
      ...serializeSession(session),
      participatingFriends: (
        participatingUsersBySessionId.get(String(asObject(session)._id)) ?? []
      ).map(serializeParticipationUser),
    })),
  };
}

async function getParticipatingUsersBySessionId(sessions: Record<string, any>[]) {
  const sessionIds = sessions
    .map((session) => asObject(session)._id)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  if (sessionIds.length === 0) {
    return new Map<string, Record<string, any>[]>();
  }

  const groupedParticipations = await SessionParticipationModel.aggregate([
    {
      $match: {
        sessionId: { $in: sessionIds },
        role: "participant",
        status: { $in: countedRegistrationStatuses },
      },
    },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$sessionId",
        userIds: { $push: "$userId" },
      },
    },
    { $project: { userIds: { $slice: ["$userIds", 12] } } },
  ]);
  const userIds = groupedParticipations.flatMap(
    (row: Record<string, any>) => row.userIds,
  );
  const users = userIds.length > 0
    ? await UserModel.find({ _id: { $in: userIds } })
    : [];
  const userById = new Map(
    users.map((user: Record<string, any>) => [String(user._id), user]),
  );
  const usersBySessionId = new Map<string, Record<string, any>[]>();

  for (const participation of groupedParticipations) {
    usersBySessionId.set(
      String(participation._id),
      participation.userIds
        .map((userId: unknown) => userById.get(String(userId)))
        .filter(Boolean),
    );
  }

  return usersBySessionId;
}

async function getSerializedOpenActivities(
  activityFilter: Record<string, any> = {},
) {
  const openSessions = await SessionModel.find({
    ...openSessionFilter,
  })
    .populate({
      path: "activity",
      match: activityFilter,
      populate: [{ path: "host" }, { path: "tags" }],
    })
    .populate("chat")
    .sort({ startsAt: 1, mockId: 1 });
  const activitiesById = new Map<string, Record<string, any>>();
  const sessionsByActivityId = new Map<string, Record<string, any>[]>();
  const matchingSessions: Record<string, any>[] = [];

  for (const session of openSessions) {
    const item = asObject(session);
    const activity = item.activity ? asObject(item.activity) : null;

    if (!activity?._id) {
      continue;
    }

    matchingSessions.push(session);
    const activityId = String(activity._id);
    const activitySessions = sessionsByActivityId.get(activityId) ?? [];

    activitiesById.set(activityId, item.activity);
    activitySessions.push(session);
    sessionsByActivityId.set(activityId, activitySessions);
  }

  const participatingUsersBySessionId =
    await getParticipatingUsersBySessionId(matchingSessions);

  return Array.from(activitiesById.entries()).map(([activityId, activity]) =>
    serializeActivityWithSessionParticipations(
      attachSessionsToActivity(
        activity,
        sessionsByActivityId.get(activityId) ?? [],
      ),
      participatingUsersBySessionId,
    ),
  );
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

function serializePreviousActivity(sessionValue: unknown) {
  const session =
    typeof sessionValue === "object" && sessionValue !== null
      ? asObject(sessionValue as Record<string, any>)
      : {};
  const activity =
    typeof session.activity === "object" && session.activity !== null
      ? asObject(session.activity)
      : {};

  return {
    id: activity.mockId,
    sessionId: session.mockId,
    title: activity.title,
    startsAt: toIsoString(session.startsAt),
    location: session.location,
  };
}

function serializeCreatedActivityTemplate(sessionValue: unknown) {
  const session =
    typeof sessionValue === "object" && sessionValue !== null
      ? asObject(sessionValue as Record<string, any>)
      : {};
  const activity =
    typeof session.activity === "object" && session.activity !== null
      ? asObject(session.activity)
      : {};
  const chat =
    typeof session.chat === "object" && session.chat !== null
      ? asObject(session.chat)
      : null;

  return {
    id: activity.mockId,
    sessionId: session.mockId,
    title: activity.title,
    sessionTitle: formatSessionDateTime(session.startsAt),
    location: session.location,
    latitude: session.lat,
    longitude: session.lng,
    lat: session.lat,
    lng: session.lng,
    endAt: toIsoString(session.endAt),
    spots: session.spots,
    categories: Array.isArray(activity.categories) ? activity.categories : [],
    groupId: chat?.mockId,
  };
}

async function nextMockId(model: typeof ActivityModel) {
  const lastItem = await model.findOne().sort({ mockId: -1 }).select("mockId");

  return (lastItem?.mockId ?? 0) + 1;
}

function getCategories(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map(getString).filter((category) => vidaCategories.has(category))),
  );
}

function getTagIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(getString)
        .filter((id) => /^[a-f\d]{24}$/i.test(id)),
    ),
  ).slice(0, 12);
}

async function resolveTagIds(requestedTagIds: string[]) {
  if (requestedTagIds.length === 0) {
    return [];
  }

  const tags = await TagModel.find({ _id: { $in: requestedTagIds } }).select("_id");
  const tagById = new Map(tags.map((tag) => [String(tag._id), tag._id]));

  return requestedTagIds
    .map((id) => tagById.get(id))
    .filter((id): id is NonNullable<typeof id> => Boolean(id));
}


async function findActivityWithSessions(activityId: string) {
  const activitySelector = getActivitySelector(activityId);

  if (activitySelector.length === 0) {
    return null;
  }

  const activity = await ActivityModel.findOne({ $or: activitySelector })
    .populate("host")
    .populate("tags");

  if (!activity) {
    return null;
  }

  const sessions = await SessionModel.find({
    activity: activity._id,
    ...openSessionFilter,
  })
    .populate("activity")
    .populate("chat")
    .sort({ startsAt: 1, mockId: 1 });

  return { activity, sessions };
}

async function getFavouriteActivities(userId: Types.ObjectId | string) {
  const favourites = await FavouriteModel.findOne({ user: userId }).populate({
    path: "activities",
    populate: [{ path: "host" }, { path: "tags" }],
  });
  const activities = (favourites?.activities ?? []).filter(Boolean);

  if (activities.length === 0) {
    return [];
  }

  const activityIds = activities.map(
    (activity: Record<string, any>) => asObject(activity)._id,
  );
  const sessions = await SessionModel.find({
    activity: { $in: activityIds },
    ...openSessionFilter,
  })
    .populate("activity")
    .populate("chat")
    .sort({ startsAt: 1, mockId: 1 });
  const sessionsByActivityId = new Map<string, Record<string, any>[]>();

  for (const session of sessions) {
    const activityId = String(asObject(session).activity?._id ?? "");
    const activitySessions = sessionsByActivityId.get(activityId) ?? [];

    activitySessions.push(session);
    sessionsByActivityId.set(activityId, activitySessions);
  }

  const participatingUsersBySessionId =
    await getParticipatingUsersBySessionId(sessions);

  return activities.map((activity: Record<string, any>) => {
    const activityId = String(asObject(activity)._id);

    return serializeActivityWithSessionParticipations(
      attachSessionsToActivity(
        activity,
        sessionsByActivityId.get(activityId) ?? [],
      ),
      participatingUsersBySessionId,
    );
  });
}

// Lists currently open public activities with their open sessions grouped beneath them.
router.get("/", optionalAuth, async (_req, res) => {
  res.json(await getSerializedOpenActivities());
});

// Lists open activities for the selected discovery collection.
router.get("/collections/:collection", optionalAuth, async (req, res) => {
  const collection = getString(req.params.collection).toLowerCase();

  if (!isActivityCollectionType(collection)) {
    res.status(400).json({ message: "Unknown activity collection." });
    return;
  }

  res.json(
    await getSerializedOpenActivities(getActivityCollectionFilters(collection)),
  );
});

// Lists the signed-in user's favourite activities.
router.get("/favourites", requireAuth, async (_req, res) => {
  res.json(await getFavouriteActivities(res.locals.user._id));
});

// Adds an activity to the signed-in user's favourites.
router.post("/favourites/add/:activityId", requireAuth, async (req, res) => {
  const activityId = String(req.params.activityId ?? "").trim();
  const activitySelector = getActivitySelector(activityId);
  const activity =
    activitySelector.length > 0
      ? await ActivityModel.findOne({ $or: activitySelector }).select("_id mockId")
      : null;

  if (!activity) {
    res.status(404).json({ message: "Activity not found." });
    return;
  }

  await FavouriteModel.updateOne(
    { user: res.locals.user._id },
    {
      $setOnInsert: { user: res.locals.user._id },
      $addToSet: { activities: activity._id },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({
    activityId: activity.mockId ?? String(activity._id),
    favourited: true,
  });
});

// Removes an activity from the signed-in user's favourites.
router.delete(
  "/favourites/delete/:activityId",
  requireAuth,
  async (req, res) => {
    const activityId = String(req.params.activityId ?? "").trim();
    const activitySelector = getActivitySelector(activityId);
    const activity =
      activitySelector.length > 0
        ? await ActivityModel.findOne({ $or: activitySelector }).select("_id mockId")
        : null;

    if (!activity) {
      res.status(404).json({ message: "Activity not found." });
      return;
    }

    await FavouriteModel.updateOne(
      { user: res.locals.user._id },
      { $pull: { activities: activity._id } },
    );

    res.json({
      activityId: activity.mockId ?? String(activity._id),
      favourited: false,
    });
  },
);

// Returns map-ready pins for all currently open sessions.
router.get("/map-pins", async (_req, res) => {
  const sessions = await SessionModel.find(openSessionFilter)
    .populate("activity")
    .sort({ mockId: 1 });

  res.json(
    sessions
      .filter((session: Record<string, any>) => Boolean(asObject(session).activity))
      .map(serializeMapPin),
  );
});

// Returns a user's past joined activities when their privacy settings allow it.
router.get("/previous/:userId", requireAuth, async (_req, res) => {
  const authUser = res.locals.user;
  const profileUser = await findUserByRouteId(String(_req.params.userId));

  if (!profileUser) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  if (!(await canViewActivityHistory(authUser._id, profileUser._id))) {
    res.json([]);
    return;
  }

  const pagination = getPagination(
    _req.query as Record<string, unknown>,
    { defaultLimit: 25, maxLimit: 100 },
  );
  const joins = await SessionParticipationModel.find({
    userId: profileUser._id,
    role: "participant",
    status: "attended",
  })
    .populate({
      path: "sessionId",
      match: { startsAt: { $lt: new Date() } },
      populate: { path: "activity" },
    })
    .sort({ attendanceMarkedAt: -1, createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);
  const previousActivities = joins
    .map((join: Record<string, any>) => join.sessionId)
    .filter(Boolean)
    .sort((firstSession: Record<string, any>, secondSession: Record<string, any>) => {
      const firstStartsAt = new Date(String(firstSession.startsAt ?? "")).getTime();
      const secondStartsAt = new Date(String(secondSession.startsAt ?? "")).getTime();

      return secondStartsAt - firstStartsAt;
    })
    .map(serializePreviousActivity);

  res.setHeader("X-Page", String(pagination.page));
  res.setHeader("X-Limit", String(pagination.limit));
  res.json(previousActivities);
});

// Returns past sessions created by the signed-in user as reusable templates.
router.get("/created-history", requireAuth, async (_req, res, next) => {
  try {
    const user = res.locals.user;
    const pagination = getPagination(
      _req.query as Record<string, unknown>,
      { defaultLimit: 25, maxLimit: 100 },
    );
    const vendors = await VendorModel.find({ owner: user._id }).select("_id");
    const vendorIds = vendors.map((vendor: Record<string, any>) => vendor._id);

    if (vendorIds.length === 0) {
      res.json([]);
      return;
    }

    const activities = await ActivityModel.find({ host: { $in: vendorIds } }).select(
      "_id",
    );
    const activityIds = activities.map((activity: Record<string, any>) => activity._id);
    const sessions =
      activityIds.length > 0
        ? await SessionModel.find({
            activity: { $in: activityIds },
            startsAt: { $lt: new Date() },
          })
            .populate("activity")
            .populate("chat")
            .sort({ startsAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit)
        : [];

    res.json(
      sessions
        .map(serializeCreatedActivityTemplate)
        .filter(
          (template: Record<string, any>) =>
            Number.isFinite(Number(template.lat)) &&
            Number.isFinite(Number(template.lng)),
        ),
    );
  } catch (error) {
    next(error);
  }
});

// Creates a new vendor-hosted activity without scheduling a session yet.
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const title = getString(req.body?.title);
    const description = getString(req.body?.description);
    const suitability = getString(req.body?.suitability);
    const imageUrls = getActivityImageUrls(req.body?.imageUrls);
    const categories = getCategories(req.body?.categories);
    const requestedTagIds = getTagIds(req.body?.tagIds);
    const isVolunteer = req.body?.isVolunteer === true;
    const isAAC = req.body?.isAAC === true;
    const requestedCredits = Number(req.body?.credits ?? 0);
    const credits = isVolunteer ? 0 : requestedCredits;
    const isPremium = isVolunteer ? false : req.body?.isPremium === true;
    const skillsFuturePayable = isVolunteer
      ? false
      : req.body?.skillsFuturePayable === true;

    if (!title) {
      res.status(400).json({ message: "Activity title is required." });
      return;
    }

    if (imageUrls === null) {
      res.status(400).json({
        message: "imageUrls must contain at most 5 valid HTTP image URLs.",
      });
      return;
    }

    if (suitability.length > 500) {
      res.status(400).json({ message: "Suitability must be 500 characters or less." });
      return;
    }

    if (!Number.isFinite(credits) || credits < 0) {
      res.status(400).json({ message: "Activity credits cannot be negative." });
      return;
    }

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

    if (
      categories.length === 0 ||
      categories.some((category) => !vidaCategories.has(category))
    ) {
      res.status(400).json({ message: "Choose at least one valid category." });
      return;
    }

    const activity = await ActivityModel.create({
      mockId: await nextMockId(ActivityModel),
      title,
      description,
      suitability,
      host: vendor._id,
      rating: 5,
      categories,
      imageUrls,
      tags: await resolveTagIds(requestedTagIds),
      isVolunteer,
      isAAC,
      credits,
      isPremium,
      skillsFuturePayable,
    });

    await VendorModel.findByIdAndUpdate(vendor._id, {
      $addToSet: { allActivities: activity._id },
    });

    const savedActivity = await ActivityModel.findById(activity._id)
      .populate("host")
      .populate("tags");

    res.status(201).json({
      activity: serializeActivity(attachSessionsToActivity(savedActivity, []), []),
      session: null,
      sessions: [],
      mapPin: null,
      mapPins: [],
      group: null,
    });
  } catch (error) {
    next(error);
  }
});

// Returns one activity with its open sessions and current participant context.
router.get("/:id", optionalAuth, async (req, res) => {
  const result = await findActivityWithSessions(String(req.params.id));

  if (!result) {
    res.status(404).json({ message: "Activity not found" });
    return;
  }

  const participatingUsersBySessionId =
    await getParticipatingUsersBySessionId(result.sessions);
  const activityWithSessions = attachSessionsToActivity(
    result.activity,
    result.sessions,
  );

  res.json(
    serializeActivityWithSessionParticipations(
      activityWithSessions,
      participatingUsersBySessionId,
    ),
  );
});

export default router;
