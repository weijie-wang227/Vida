import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth, requireVendorAuth } from "../middleware/auth.js";
import {
  ActivityModel,
  RatingModel,
  SessionParticipationModel,
  SessionModel,
  VendorModel,
} from "../models/VidaData.js";
import { getChatPreview, getLatestChatPreviews } from "../chatPreviews.js";
import { serializeTagNames, serializeVendor } from "../serializers.js";
import { asObject } from "../utils/mongoose.js";
import {
  getActivitySelector,
  getSessionSelector,
} from "../utils/routeSelectors.js";
import {
  getLinkedActivityIds,
  getVendorStats,
  getVendorUsersPageStats,
} from "../utils/utils.js";
import {
  getVendorFinance,
  getVendorFinanceActivity,
} from "../utils/finance.js";
import {
  countedRegistrationStatuses,
  countsAsRegistration,
  resolveAttendanceStatus,
} from "../domain/sessionParticipation.js";
import {
  deleteScheduledSession,
  markSessionAttendance,
  reviewVolunteerParticipation,
  SessionOperationError,
} from "../services/sessionOperations.js";
import {
  getPagination,
  getPaginationResponse,
} from "../utils/pagination.js";

const router = Router();

function sendSessionOperationError(res: any, error: unknown) {
  if (!(error instanceof SessionOperationError)) {
    return false;
  }

  res.status(error.status).json({ message: error.message, ...error.details });
  return true;
}

async function sendVendorResponse(res: any, vendor: Record<string, any>, status = 200) {
  res.status(status).json({
    vendor: serializeVendor(vendor),
    stats: await getVendorStats(vendor),
  });
}

function serializeVendorActivityRow(
  activityValue: Record<string, any>,
  ratingByActivityId = new Map<string, number>(),
) {
  const activity = asObject(activityValue);
  const activityId = String(activity._id);
  const rating = ratingByActivityId.get(activityId) ?? Number(activity.rating) ?? 0;

  return {
    id: activityId,
    mockId: activity.mockId,
    title: activity.title,
    description: activity.description ?? "",
    categories: Array.isArray(activity.categories) ? activity.categories : [],
    cover: activity.cover,
    tags: serializeTagNames(activity.tags),
    isVolunteer: Boolean(activity.isVolunteer),
    isPremium: false,
    skillsFuturePayable: false,
    rating: Number.isFinite(rating) ? rating : 0,
    isOpen: true,
    sessionsNum: Number(activity.sessionsNum) || 0,
    registeredCount: Number(activity.registeredCount) || 0,
    attendedCount: Number(activity.attendedCount) || 0,
    totalRevenue: Number(activity.totalRevenue) || 0,
  };
}

function serializeVendorSessionRow(
  sessionValue: Record<string, any>,
  activityValue: Record<string, any>,
  attendanceBySessionId = new Map<string, number>(),
  ratingByActivityId = new Map<string, number>(),
) {
  const session = asObject(sessionValue);
  const activity = asObject(activityValue);
  const activityId = String(activity._id ?? session.activity);
  const sessionId = String(session._id);
  const rating = ratingByActivityId.get(activityId) ?? Number(activity.rating) ?? 0;
  const activityRow = serializeVendorActivityRow(activity, ratingByActivityId);
  const registeredCount = Number(session.registeredCount) || 0;
  const attendedCount = Number(
    session.attendedCount ?? attendanceBySessionId.get(sessionId) ?? 0,
  ) || 0;

  return {
    id: sessionId,
    objectId: sessionId,
    mockId: String(session.mockId),
    activity: activityRow,
    activityId,
    activityMockId: activity.mockId,
    title: session.title,
    startsAt: session.startsAt,
    duration: session.duration,
    durationMinutes: session.duration,
    spots: session.spots,
    credits: session.credits,
    isPremium: Boolean(session.isPremium),
    skillsFuturePayable: Boolean(session.skillsFuturePayable),
    location: session.location,
    lat: session.lat,
    lng: session.lng,
    isOpen: session.isOpen !== false,
    isActive: session.isActive !== false,
    registeredCount,
    attendedCount,
    rating: Number.isFinite(rating) ? rating : 0,
  };
}

async function getVendorActivityRows(vendor: Record<string, any>) {
  const linkedEventIds = getLinkedActivityIds(vendor);
  const activities = await ActivityModel.find({
    $or: [{ host: vendor._id }, { _id: { $in: linkedEventIds } }],
  })
    .populate("tags")
    .sort({ mockId: 1 })
    .lean();
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);
  const ratings =
    activityIds.length > 0
      ? RatingModel.aggregate([
          { $match: { activity: { $in: activityIds } } },
          { $group: { _id: "$activity", averageRating: { $avg: "$rating" } } },
        ])
      : [];
  const ratingRows = await ratings;
  const ratingByActivityId = new Map(
    ratingRows.map((row: Record<string, any>) => [
      String(row._id),
      Math.round(Number(row.averageRating) * 10) / 10,
    ]),
  );

  return activities.map((activity: Record<string, any>) =>
    serializeVendorActivityRow(activity, ratingByActivityId),
  );
}

async function getVendorSessionRows(vendor: Record<string, any>) {
  const linkedEventIds = getLinkedActivityIds(vendor);
  const activities = await ActivityModel.find({
    $or: [{ host: vendor._id }, { _id: { $in: linkedEventIds } }],
  })
    .populate("tags")
    .sort({ mockId: 1 })
    .lean();
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);
  const sessions = activityIds.length
    ? await SessionModel.find({ activity: { $in: activityIds } })
        .sort({ startsAt: -1, mockId: 1 })
        .lean()
    : [];
  const sessionIds = sessions.map((session: Record<string, any>) => session._id);
  const [joins, ratings] = await Promise.all([
    sessionIds.length
      ? SessionParticipationModel.aggregate([
          {
            $match: {
              sessionId: { $in: sessionIds },
              role: "participant",
              status: "attended",
            },
          },
          {
            $group: {
              _id: "$sessionId",
              count: { $sum: 1 },
            },
          },
        ])
      : [],
    activityIds.length
      ? RatingModel.aggregate([
          { $match: { activity: { $in: activityIds } } },
          { $group: { _id: "$activity", averageRating: { $avg: "$rating" } } },
        ])
      : [],
  ]);
  const attendanceBySessionId = new Map(
    joins.map((row: Record<string, any>) => [String(row._id), row.count]),
  );
  const ratingByActivityId = new Map(
    ratings.map((row: Record<string, any>) => [
      String(row._id),
      Math.round(Number(row.averageRating) * 10) / 10,
    ]),
  );
  const activityById = new Map(
    activities.map((activity: Record<string, any>) => [String(activity._id), activity]),
  );

  return sessions
    .map((session: Record<string, any>) => {
      const activity = activityById.get(String(session.activity));

      return activity
        ? serializeVendorSessionRow(
            session,
            activity,
            attendanceBySessionId,
            ratingByActivityId,
          )
        : null;
    })
    .filter(Boolean);
}

async function getVendorChatRows(vendor: Record<string, any>) {
  const linkedEventIds = getLinkedActivityIds(vendor);
  const activities = await ActivityModel.find({
    $or: [{ host: vendor._id }, { _id: { $in: linkedEventIds } }],
  })
    .select("_id mockId title")
    .lean();
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);
  const sessions = activityIds.length
    ? await SessionModel.find({ activity: { $in: activityIds } })
        .select(
          "_id mockId activity chat title startsAt location registeredCount spots isOpen isActive",
        )
        .populate({
          path: "chat",
          select: "_id mockId name avatar members updatedAt createdAt",
        })
        .sort({ startsAt: -1, mockId: 1 })
        .lean()
    : [];
  const chats = sessions
    .map((session: Record<string, any>) => asObject(session.chat ?? {}))
    .filter((chat: Record<string, any>) => Boolean(chat._id));
  const previews = await getLatestChatPreviews(chats);
  const activityById = new Map(
    activities.map((activity: Record<string, any>) => [String(activity._id), activity]),
  );

  return sessions
    .map((sessionValue: Record<string, any>) => {
      const session = asObject(sessionValue);
      const chat = asObject(session.chat ?? {});
      const activity = activityById.get(String(session.activity));

      if (!chat._id || !activity) {
        return null;
      }

      const preview = getChatPreview(previews, chat);

      return {
        id: String(chat._id),
        mockId: Number(chat.mockId),
        name: String(chat.name ?? session.title ?? "Session chat"),
        avatar: String(chat.avatar ?? ""),
        memberCount: Array.isArray(chat.members) ? chat.members.length : 0,
        lastMessage: preview.lastMessage,
        updatedAt: chat.updatedAt ?? chat.createdAt ?? session.startsAt,
        session: {
          id: String(session._id),
          mockId: String(session.mockId),
          title: String(session.title ?? activity.title ?? "Session"),
          startsAt: session.startsAt,
          location: String(session.location ?? ""),
          registeredCount: Number(session.registeredCount) || 0,
          spots: Number(session.spots) || 0,
          isOpen: session.isOpen !== false,
          isActive: session.isActive !== false,
        },
        activity: {
          id: String(activity._id),
          mockId: Number(activity.mockId),
          title: String(activity.title ?? session.title ?? "Activity"),
        },
      };
    })
    .filter(Boolean)
    .sort((first: any, second: any) => {
      const firstTime = new Date(String(first.updatedAt ?? "")).getTime();
      const secondTime = new Date(String(second.updatedAt ?? "")).getTime();

      return secondTime - firstTime;
    });
}

function getManagedActivityFilter(vendor: Record<string, any>) {
  const linkedActivityIds = getLinkedActivityIds(vendor);

  return {
    $or: [{ host: vendor._id }, { _id: { $in: linkedActivityIds } }],
  };
}

async function getVolunteerOverview(vendor: Record<string, any>) {
  const activities = await ActivityModel.find({
    ...getManagedActivityFilter(vendor),
    isVolunteer: true,
  })
    .select("_id mockId title")
    .lean();
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);
  const sessions = activityIds.length
    ? await SessionModel.find({ activity: { $in: activityIds } })
        .select(
          "_id mockId activity title startsAt duration spots isOpen isActive location",
        )
        .lean()
    : [];
  const sessionIds = sessions.map((session: Record<string, any>) => session._id);
  const participations = sessionIds.length
    ? await SessionParticipationModel.find({
        sessionId: { $in: sessionIds },
        role: "participant",
        status: { $ne: "cancelled" },
      })
        .select("sessionId userId status")
        .lean()
    : [];
  const activityById = new Map(
    activities.map((activity: Record<string, any>) => [String(activity._id), activity]),
  );
  const bookingsBySessionId = new Map<string, number>();

  participations.forEach((participation: Record<string, any>) => {
    if (!countsAsRegistration(participation.status)) {
      return;
    }

    const sessionId = String(participation.sessionId);
    bookingsBySessionId.set(
      sessionId,
      (bookingsBySessionId.get(sessionId) ?? 0) + 1,
    );
  });

  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const openSessions = sessions.filter((session: Record<string, any>) => {
    const startsAt = new Date(String(session.startsAt ?? ""));

    return (
      session.isOpen !== false &&
      session.isActive !== false &&
      !Number.isNaN(startsAt.getTime()) &&
      startsAt >= now
    );
  });
  const openSessionIds = new Set(
    openSessions.map((session: Record<string, any>) => String(session._id)),
  );
  const openBookings = openSessions.reduce(
    (sum: number, session: Record<string, any>) =>
      sum + (bookingsBySessionId.get(String(session._id)) ?? 0),
    0,
  );
  const openCapacity = openSessions.reduce(
    (sum: number, session: Record<string, any>) => sum + (Number(session.spots) || 0),
    0,
  );
  const sessionById = new Map(
    sessions.map((session: Record<string, any>) => [String(session._id), session]),
  );
  const hoursThisMonth = participations.reduce(
    (hours: number, participation: Record<string, any>) => {
      if (participation.status !== "attended") {
        return hours;
      }

      const session = sessionById.get(String(participation.sessionId));
      const startsAt = new Date(String(session?.startsAt ?? ""));

      if (
        !session ||
        Number.isNaN(startsAt.getTime()) ||
        startsAt < monthStart ||
        startsAt > now
      ) {
        return hours;
      }

      return hours + (Number(session.duration) || 0) / 60;
    },
    0,
  );
  const opportunities = sessions
    .map((session: Record<string, any>) => {
      const startsAt = new Date(String(session.startsAt ?? ""));
      const booked = bookingsBySessionId.get(String(session._id)) ?? 0;
      const capacity = Number(session.spots) || 0;
      const isPast = !Number.isNaN(startsAt.getTime()) && startsAt < now;
      const status = isPast
        ? "completed"
        : session.isOpen === false || session.isActive === false
          ? "closed"
          : capacity > 0 && booked >= capacity
            ? "full"
            : "open";
      const activity = activityById.get(String(session.activity));

      return {
        id: String(session._id),
        mockId: String(session.mockId),
        activityId: String(activity?._id ?? session.activity),
        activityMockId: activity?.mockId,
        title: String(session.title ?? activity?.title ?? "Volunteer opportunity"),
        activityTitle: String(activity?.title ?? session.title ?? "Volunteer activity"),
        startsAt:
          !Number.isNaN(startsAt.getTime()) ? startsAt.toISOString() : "",
        location: String(session.location ?? ""),
        booked,
        capacity,
        status,
        isOpenOpportunity: openSessionIds.has(String(session._id)),
      };
    })
    .sort((first, second) => {
      if (first.isOpenOpportunity !== second.isOpenOpportunity) {
        return first.isOpenOpportunity ? -1 : 1;
      }

      const firstTime = new Date(first.startsAt).getTime();
      const secondTime = new Date(second.startsAt).getTime();

      return first.isOpenOpportunity ? firstTime - secondTime : secondTime - firstTime;
    })
    .map(({ isOpenOpportunity: _isOpenOpportunity, ...opportunity }) => opportunity);

  return {
    summary: {
      openOpportunities: openSessions.length,
      fillRate: openCapacity > 0 ? Math.round((openBookings / openCapacity) * 100) : 0,
      pendingReview: participations.filter(
        (participation: Record<string, any>) => participation.status === "registered",
      ).length,
      hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    },
    opportunities,
  };
}

async function getVolunteerRoster(
  vendor: Record<string, any>,
  sessionId: string,
) {
  const session = await findVendorSession(vendor, sessionId);
  const activity = session?.activity ? asObject(session.activity) : null;

  if (!session || !activity || activity.isVolunteer !== true) {
    return null;
  }

  const participations = await SessionParticipationModel.find({
    sessionId: session._id,
    role: "participant",
    status: { $ne: "cancelled" },
  })
    .populate("userId")
    .sort({ registeredAt: 1, createdAt: 1 });
  return {
    session: {
      id: String(session._id),
      mockId: String(session.mockId),
      title: String(session.title ?? activity.title ?? "Volunteer opportunity"),
      activityTitle: String(activity.title ?? session.title ?? "Volunteer activity"),
    },
    volunteers: participations.map((participationValue: Record<string, any>) => {
      const participation = asObject(participationValue);
      const user = participation.userId ? asObject(participation.userId) : {};
      const userId = String(user._id ?? participation.userId ?? "");
      const status = String(participation.status);

      return {
        id: userId,
        name: String(user.name ?? "Unknown user"),
        handle: String(user.handle ?? ""),
        avatar: String(user.avatarUrl ?? ""),
        status:
          status === "attended"
            ? "completed"
            : status === "no_show"
              ? "no_show"
              : status,
      };
    }),
  };
}

function serializeSessionTemplate(
  activity: Record<string, any>,
  session: Record<string, any>,
) {
  return {
    id: activity.mockId,
    sessionId: session.mockId,
    title: activity.title,
    sessionTitle: session.title,
    location: session.location,
    latitude: session.lat,
    longitude: session.lng,
    lat: session.lat,
    lng: session.lng,
    duration: session.duration,
    durationMinutes: session.duration,
    spots: session.spots,
    credits: session.credits,
    categories: Array.isArray(activity.categories) ? activity.categories : [],
  };
}

async function getVendorSessionTemplates(vendor: Record<string, any>) {
  const linkedEventIds = getLinkedActivityIds(vendor);
  const activities = await ActivityModel.find({
    $or: [{ host: vendor._id }, { _id: { $in: linkedEventIds } }],
  })
    .sort({ mockId: 1 })
    .lean();
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);
  const sessions = activityIds.length
    ? await SessionModel.find({
        activity: { $in: activityIds },
        startsAt: { $lt: new Date() },
      })
        .sort({ startsAt: -1 })
        .lean()
    : [];
  const activityById = new Map(
    activities.map((activity: Record<string, any>) => [String(activity._id), activity]),
  );

  return sessions
    .map((session: Record<string, any>) => {
      const activity = activityById.get(String(session.activity));

      return activity ? serializeSessionTemplate(activity, session) : null;
    })
    .filter(Boolean);
}

async function findVendorSession(
  vendor: Record<string, any>,
  sessionId: string,
) {
  const linkedEventIds = getLinkedActivityIds(vendor);
  const sessionSelector = getSessionSelector(sessionId);
  const activityScope = {
    $or: [{ host: vendor._id }, { _id: { $in: linkedEventIds } }],
  };

  if (sessionSelector.length === 0) {
    return null;
  }

  const session = await SessionModel.findOne({ $or: sessionSelector })
    .populate({
      path: "activity",
      match: activityScope,
    })
    .sort({ startsAt: 1, mockId: 1 });

  return session?.activity ? session : null;
}

// Returns the vendor profile owned by the signed-in user.
router.get("/me", requireAuth, async (_req, res, next) => {
  try {
    const user = res.locals.user;
    const vendor = await VendorModel.findOne({ owner: user._id });

    if (!vendor) {
      res.json({ vendor: null, stats: null });
      return;
    }

    await sendVendorResponse(res, vendor);
  } catch (error) {
    next(error);
  }
});

// Lists activities managed by the signed-in vendor.
router.get("/me/activities", requireVendorAuth, async (_req, res, next) => {
  try {
    const vendor = res.locals.vendor;

    res.json({
      activities: await getVendorActivityRows(vendor),
      stats: await getVendorStats(vendor),
    });
  } catch (error) {
    next(error);
  }
});

// Lists sessions managed by the signed-in vendor.
router.get("/me/sessions", requireVendorAuth, async (_req, res, next) => {
  try {
    const vendor = res.locals.vendor;

    res.json({
      sessions: await getVendorSessionRows(vendor),
    });
  } catch (error) {
    next(error);
  }
});

// Deletes one managed session and all participation records attached to it.
router.delete(
  "/me/sessions/:sessionId",
  requireVendorAuth,
  async (req, res, next) => {
    try {
      const sessionId = String(req.params.sessionId ?? "");
      const vendor = res.locals.vendor;
      const session = await findVendorSession(vendor, sessionId);

      if (!session) {
        const hasValidSelector = getSessionSelector(sessionId).length > 0;

        if (!hasValidSelector) {
          res.status(400).json({ message: "Choose a valid session." });
          return;
        }

        res.status(404).json({ message: "Session not found." });
        return;
      }

      const sessionItem = asObject(session);
      const activity = asObject(sessionItem.activity ?? {});
      const operation = await deleteScheduledSession({
        sessionId: sessionItem._id,
        activityId: activity._id,
      });
      const updatedActivity = asObject(operation.activity);
      const deletedSession = asObject(operation.session);

      res.json({
        session: {
          id: String(deletedSession._id),
          mockId: deletedSession.mockId,
          title: deletedSession.title,
        },
        activity: {
          id: String(updatedActivity._id),
          mockId: updatedActivity.mockId,
          sessionsNum: Number(updatedActivity.sessionsNum) || 0,
          registeredCount: Number(updatedActivity.registeredCount) || 0,
          attendedCount: Number(updatedActivity.attendedCount) || 0,
          totalRevenue: Number(updatedActivity.totalRevenue) || 0,
        },
        deletedParticipationCount: operation.deletedParticipationCount,
      });
    } catch (error) {
      if (sendSessionOperationError(res, error)) {
        return;
      }

      next(error);
    }
  },
);

// Lists the chats attached to sessions managed by the signed-in vendor.
router.get("/me/chats", requireVendorAuth, async (_req, res, next) => {
  try {
    res.json({ chats: await getVendorChatRows(res.locals.vendor) });
  } catch (error) {
    next(error);
  }
});

// Returns booking and fill-rate metrics for the signed-in vendor users page.
router.get("/me/users/stats", requireVendorAuth, async (_req, res, next) => {
  try {
    const vendor = res.locals.vendor;

    res.json({
      stats: await getVendorUsersPageStats(vendor),
    });
  } catch (error) {
    next(error);
  }
});

// Returns volunteer opportunities and summary metrics for the signed-in vendor.
router.get("/me/volunteers", requireVendorAuth, async (_req, res, next) => {
  try {
    res.json(await getVolunteerOverview(res.locals.vendor));
  } catch (error) {
    next(error);
  }
});

// Returns the roster and accumulated volunteer hours for one volunteer session.
router.get(
  "/me/volunteers/sessions/:sessionId/roster",
  requireVendorAuth,
  async (req, res, next) => {
    try {
      const sessionId = String(req.params.sessionId ?? "");

      if (getSessionSelector(sessionId).length === 0) {
        res.status(400).json({ message: "Choose a valid volunteer session." });
        return;
      }

      const roster = await getVolunteerRoster(res.locals.vendor, sessionId);

      if (!roster) {
        res.status(404).json({ message: "Volunteer session not found." });
        return;
      }

      res.json(roster);
    } catch (error) {
      next(error);
    }
  },
);

// Approves or rejects one application in a volunteer session roster.
router.patch(
  "/me/volunteers/sessions/:sessionId/roster/:userId",
  requireVendorAuth,
  async (req, res, next) => {
    try {
      const sessionId = String(req.params.sessionId ?? "");
      const userId = String(req.params.userId ?? "");
      const status = req.body?.status;

      if (getSessionSelector(sessionId).length === 0) {
        res.status(400).json({ message: "Choose a valid volunteer session." });
        return;
      }

      if (!Types.ObjectId.isValid(userId)) {
        res.status(400).json({ message: "Choose a valid volunteer." });
        return;
      }

      if (status !== "approved" && status !== "rejected") {
        res.status(400).json({ message: "Choose approve or reject." });
        return;
      }

      const session = await findVendorSession(res.locals.vendor, sessionId);
      const activity = session?.activity ? asObject(session.activity) : null;

      if (!session || !activity || activity.isVolunteer !== true) {
        res.status(404).json({ message: "Volunteer session not found." });
        return;
      }

      const participation = await reviewVolunteerParticipation({
        sessionId: session._id,
        userId,
        status,
      });

      res.json({
        volunteer: {
          id: String(participation.userId),
          status: participation.status,
        },
      });
    } catch (error) {
      if (sendSessionOperationError(res, error)) {
        return;
      }

      next(error);
    }
  },
);

// Returns YTD and MTD revenue metrics for the signed-in vendor finance page.
router.get("/me/finances", requireVendorAuth, async (_req, res, next) => {
  try {
    res.json(await getVendorFinance(res.locals.vendor));
  } catch (error) {
    next(error);
  }
});

// Returns finance metrics and recent sessions for one activity owned by the vendor.
router.get(
  "/me/finances/activities/:activityId",
  requireVendorAuth,
  async (req, res, next) => {
    try {
      const financeActivity = await getVendorFinanceActivity(
        res.locals.vendor,
        getActivitySelector(String(req.params.activityId ?? "")),
      );

      if (!financeActivity) {
        res.status(404).json({ message: "Finance activity not found." });
        return;
      }

      res.json(financeActivity);
    } catch (error) {
      next(error);
    }
  },
);

// Updates editable profile fields for the signed-in vendor.
router.patch("/me", requireVendorAuth, async (req, res, next) => {
  try {
    const vendor = res.locals.vendor;
    const profileUrl = String(req.body?.profileUrl ?? "").trim();
    const description = String(req.body?.description ?? "").trim();

    if (description.length > 500) {
      res.status(400).json({ message: "Description must be 500 characters or less." });
      return;
    }

    vendor.profileUrl = profileUrl;
    vendor.description = description;
    await vendor.save();

    await sendVendorResponse(res, vendor);
  } catch (error) {
    next(error);
  }
});

// Lists past vendor sessions that can be reused as session templates.
router.get("/me/session-templates", requireVendorAuth, async (_req, res, next) => {
  try {
    const vendor = res.locals.vendor;
    res.json(await getVendorSessionTemplates(vendor));
  } catch (error) {
    next(error);
  }
});

// Lists attendees for one session owned by the signed-in vendor.
router.get("/me/sessions/:sessionId/attendees", requireVendorAuth, async (req, res, next) => {
  try {
    const sessionId = String(req.params.sessionId);
    const vendor = res.locals.vendor;
    const pagination = getPagination(req.query as Record<string, unknown>);

    const session = await findVendorSession(vendor, sessionId);

    if (!session) {
      const hasValidSelector = getSessionSelector(sessionId).length > 0;

      if (!hasValidSelector) {
        res.status(400).json({ message: "Choose a valid session." });
        return;
      }

      res.status(404).json({ message: "Session not found." });
      return;
    }

    const activity = asObject(session.activity ?? {});

    if (!activity._id) {
      res.status(400).json({ message: "Choose a valid session." });
      return;
    }

    const participationFilter = {
      sessionId: session._id,
      role: "participant",
      status: { $in: countedRegistrationStatuses },
    };
    const [participations, total] = await Promise.all([
      SessionParticipationModel.find(participationFilter)
        .populate("userId")
        .sort({ createdAt: 1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      SessionParticipationModel.countDocuments(participationFilter),
    ]);

    res.json({
      activity: {
        id: String(activity._id),
        mockId: activity.mockId,
        title: activity.title,
      },
      session: {
        id: String(session._id),
        mockId: session.mockId,
        title: session.title,
      },
      attendees: participations.map((participation: Record<string, any>) => {
        const item = asObject(participation);
        const attendee = asObject(item.userId ?? {});

        return {
          id: String(attendee._id ?? item.userId),
          name: attendee.name ?? "Unknown user",
          handle: attendee.handle ?? "",
          avatar: attendee.avatarUrl ?? "",
          status: item.status,
          signedUpAt: item.registeredAt ?? item.createdAt,
        };
      }),
      pagination: getPaginationResponse(pagination, total),
    });
  } catch (error) {
    next(error);
  }
});

// Opens or closes one session owned by the signed-in vendor.
router.patch("/me/sessions/:sessionId/open", requireVendorAuth, async (req, res, next) => {
  try {
    const sessionId = String(req.params.sessionId);
    const vendor = res.locals.vendor;
    const isOpen = req.body?.isOpen;

    if (typeof isOpen !== "boolean") {
      res.status(400).json({ message: "Choose whether the activity is open." });
      return;
    }

    const session = await findVendorSession(vendor, sessionId);

    if (!session) {
      const hasValidSelector = getSessionSelector(sessionId).length > 0;

      if (!hasValidSelector) {
        res.status(400).json({ message: "Choose a valid session." });
        return;
      }

      res.status(404).json({ message: "Session not found." });
      return;
    }

    session.isOpen = isOpen;
    await session.save();

    const activity = asObject(session.activity ?? {});

    res.json({
      activity: {
        id: String(activity._id ?? session.activity),
        mockId: activity.mockId,
        title: activity.title ?? session.title,
        isOpen: session.isOpen !== false,
      },
      session: {
        id: String(session._id),
        mockId: session.mockId,
        title: session.title,
        isOpen: session.isOpen !== false,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Marks whether a signed-up attendee was present for a vendor session.
router.patch(
  "/me/sessions/:sessionId/attendees/:userId",
  requireVendorAuth,
  async (req, res, next) => {
    try {
      const sessionId = String(req.params.sessionId);
      const attendeeUserId = String(req.params.userId);
      const vendor = res.locals.vendor;

      if (!Types.ObjectId.isValid(attendeeUserId)) {
        res.status(400).json({ message: "Choose a valid attendee." });
        return;
      }

      const session = await findVendorSession(vendor, sessionId);

      if (!session) {
        const hasValidSelector = getSessionSelector(sessionId).length > 0;

        if (!hasValidSelector) {
          res.status(400).json({ message: "Choose a valid attendee." });
          return;
        }

        res.status(404).json({ message: "Session not found." });
        return;
      }

      const requestedStatus = resolveAttendanceStatus(req.body?.status);

      if (!requestedStatus) {
        res.status(400).json({ message: "Choose a valid attendance status." });
        return;
      }

      const participation = await markSessionAttendance({
        sessionId: session._id,
        userId: attendeeUserId,
        status: requestedStatus,
      });

      res.json({
        attendee: {
          id: String(participation.userId),
          status: participation.status,
        },
      });
    } catch (error) {
      if (sendSessionOperationError(res, error)) {
        return;
      }

      next(error);
    }
  },
);

// Returns a public vendor profile by vendor id.
router.get("/:id", async (req, res, next) => {
  try {
    const vendor = await VendorModel.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    await sendVendorResponse(res, vendor);
  } catch (error) {
    next(error);
  }
});

// Lists public activities and stats for a vendor by vendor id.
router.get("/:id/activities", async (req, res, next) => {
  try {
    const vendor = await VendorModel.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    res.json({
      activities: await getVendorActivityRows(vendor),
      stats: await getVendorStats(vendor),
    });
  } catch (error) {
    next(error);
  }
});

// Lists public sessions for a vendor by vendor id.
router.get("/:id/sessions", async (req, res, next) => {
  try {
    const vendor = await VendorModel.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    res.json({
      sessions: await getVendorSessionRows(vendor),
    });
  } catch (error) {
    next(error);
  }
});

// Creates a vendor profile for the signed-in user.
router.post("/createVendor", requireAuth, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const name = String(req.body?.name ?? "").trim();
    const profileUrl = String(req.body?.profileUrl ?? "").trim();
    const description = String(req.body?.description ?? "").trim();

    if (!name) {
      res.status(400).json({ message: "Vendor name is required." });
      return;
    }

    const existingVendor = await VendorModel.findOne({ owner: user._id });

    if (existingVendor) {
      await sendVendorResponse(res, existingVendor);
      return;
    }

    const vendor = await VendorModel.create({
      owner: user._id,
      name,
      profileUrl,
      description,
      numAttended: 0,
      allActivities: [],
    });

    await sendVendorResponse(res, vendor, 201);
  } catch (error) {
    next(error);
  }
});

export default router;
