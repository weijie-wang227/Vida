import mongoose, {
  type ClientSession,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import {
  ActivityModel,
  AnnouncementModel,
  AnnouncementVoteModel,
  BlacklistModel,
  ChatModel,
  NotificationModel,
  SessionModel,
  SessionParticipationModel,
  UserModel,
} from "../models/VidaData.js";
import type {
  EntityId,
  SessionDocument,
  SessionParticipationStatus,
} from "../models/VidaData.js";
import {
  getAttendanceCounterDelta,
  getRegistrationCounterDelta,
} from "../domain/sessionParticipation.js";
import { addUserToVendorConsolidated } from "../utils/data.js";
import { formatSessionChatName } from "../utils/date.js";

export class SessionOperationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SessionOperationError";
  }
}

type ScheduledSessionInput = {
  organizerUserId?: EntityId;
  activityId: EntityId;
  linkedChatId?: EntityId;
  session: {
    title: string;
    instructor: string;
    startsAt: Date;
    endAt: Date;
    spots: number;
    priceSgd: number;
    isPremium: boolean;
    skillsFuturePayable: boolean;
    location: string;
    lat: number;
    lng: number;
  };
};

type RegistrationResult = {
  created: boolean;
  session: HydratedDocument<SessionDocument>;
  groupId: Types.ObjectId;
};

type DeleteScheduledSessionInput = {
  sessionId: EntityId;
  activityId: EntityId;
};

type UpdateScheduledSessionInput = {
  sessionId: EntityId;
  activityId: EntityId;
  details: {
    title: string;
    instructor: string;
    startsAt: Date;
    endAt: Date;
    spots: number;
    location: string;
    lat: number;
    lng: number;
    priceSgd: number;
    isPremium: boolean;
    skillsFuturePayable: boolean;
  };
};

async function nextMockId<T extends { mockId: number }>(
  model: Model<T>,
  dbSession: ClientSession,
) {
  const lastItem = await model
    .findOne()
    .sort({ mockId: -1 })
    .select("mockId")
    .session(dbSession);

  return (lastItem?.mockId ?? 0) + 1;
}

export async function createScheduledSession(input: ScheduledSessionInput) {
  return mongoose.connection.transaction(async (dbSession) => {
    const chatName = formatSessionChatName(input.session.title);
    const chat = input.linkedChatId
      ? await ChatModel.findById(input.linkedChatId).session(dbSession)
      : (
          await ChatModel.create(
            [
              {
                mockId: await nextMockId(ChatModel, dbSession),
                name: chatName,
                avatar: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
                  chatName,
                )}`,
                members: [],
                lastMessage: "",
                time: "",
                unread: 0,
              },
            ],
            { session: dbSession },
          )
        )[0];

    if (!chat) {
      throw new SessionOperationError("Group not found.", 404);
    }

    const [scheduledSession] = await SessionModel.create(
      [
        {
          mockId: await nextMockId(SessionModel, dbSession),
          activity: input.activityId,
          title: input.session.title,
          instructor: input.session.instructor,
          startsAt: input.session.startsAt,
          endAt: input.session.endAt,
          spots: input.session.spots,
          priceSgd: input.session.priceSgd,
          isPremium: input.session.isPremium,
          skillsFuturePayable: input.session.skillsFuturePayable,
          grossRevenueMinor: 0,
          pendingPaymentCount: 0,
          registeredCount: 0,
          attendedCount: 0,
          chat: chat._id,
          isOpen: true,
          isActive: true,
          location: input.session.location,
          lat: input.session.lat,
          lng: input.session.lng,
        },
      ],
      { session: dbSession },
    );

    const activity = await ActivityModel.findByIdAndUpdate(
      input.activityId,
      { $inc: { sessionsNum: 1 } },
      { returnDocument: "after", session: dbSession },
    );

    if (!activity) {
      throw new SessionOperationError("Activity not found.", 404);
    }

    if (input.organizerUserId) {
      await SessionParticipationModel.create(
        [
          {
            userId: input.organizerUserId,
            sessionId: scheduledSession._id,
            role: "organizer",
            status: "registered",
            amountPaidMinor: 0,
            currency: "SGD",
            registeredAt: new Date(),
          },
        ],
        { session: dbSession },
      );
    }

    return { session: scheduledSession, chatId: chat._id };
  });
}

export async function updateScheduledSession(
  input: UpdateScheduledSessionInput,
) {
  return mongoose.connection.transaction(async (dbSession) => {
    const scheduledSession = await SessionModel.findOne({
      _id: input.sessionId,
      activity: input.activityId,
    }).session(dbSession);

    if (!scheduledSession) {
      throw new SessionOperationError("Session not found.", 404);
    }

    Object.assign(scheduledSession, input.details);
    await scheduledSession.save({ session: dbSession });

    const activity = await ActivityModel.findById(input.activityId).session(
      dbSession,
    );

    if (!activity) {
      throw new SessionOperationError("Activity not found.", 404);
    }

    return { session: scheduledSession, activity };
  });
}

export async function deleteScheduledSession(
  input: DeleteScheduledSessionInput,
) {
  return mongoose.connection.transaction(async (dbSession) => {
    const scheduledSession = await SessionModel.findOne({
      _id: input.sessionId,
      activity: input.activityId,
    }).session(dbSession);

    if (!scheduledSession) {
      throw new SessionOperationError("Session not found.", 404);
    }

    if (
      Number(scheduledSession.pendingPaymentCount) > 0 ||
      Number(scheduledSession.grossRevenueMinor) > 0
    ) {
      throw new SessionOperationError(
        "Sessions with pending or completed payments cannot be deleted.",
        409,
      );
    }

    const registeredCount = Math.max(
      0,
      Number(scheduledSession.registeredCount) || 0,
    );
    const attendedCount = Math.max(
      0,
      Number(scheduledSession.attendedCount) || 0,
    );
    const grossRevenueMinor = Math.max(
      0,
      Number(scheduledSession.grossRevenueMinor) || 0,
    );
    const sessionRevenue = grossRevenueMinor / 100;
    const attendedParticipations = await SessionParticipationModel.find({
      sessionId: scheduledSession._id,
      role: "participant",
      status: "attended",
    })
      .select("userId")
      .session(dbSession)
      .lean();
    const attendedUserIds = attendedParticipations.map(
      (participation) => participation.userId,
    );

    if (attendedUserIds.length > 0) {
      await UserModel.updateMany(
        { _id: { $in: attendedUserIds } },
        [
          {
            $set: {
              attendedSessionsCount: {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $ifNull: ["$attendedSessionsCount", 0] },
                      1,
                    ],
                  },
                ],
              },
            },
          },
        ],
        { session: dbSession },
      );
    }

    const participationResult = await SessionParticipationModel.deleteMany({
      sessionId: scheduledSession._id,
    }).session(dbSession);
    const announcements = await AnnouncementModel.find({
      sessionId: scheduledSession._id,
    })
      .select("_id")
      .session(dbSession);
    const announcementIds = announcements.map(
      (announcement) => announcement._id,
    );

    if (announcementIds.length > 0) {
      await AnnouncementVoteModel.deleteMany({
        announcementId: { $in: announcementIds },
      }).session(dbSession);
    }

    await AnnouncementModel.deleteMany({
      sessionId: scheduledSession._id,
    }).session(dbSession);
    const sessionResult = await SessionModel.deleteOne({
      _id: scheduledSession._id,
    }).session(dbSession);

    if (sessionResult.deletedCount !== 1) {
      throw new SessionOperationError("Session not found.", 404);
    }

    const activity = await ActivityModel.findByIdAndUpdate(
      input.activityId,
      [
        {
          $set: {
            sessionsNum: {
              $max: [
                0,
                {
                  $subtract: [{ $ifNull: ["$sessionsNum", 0] }, 1],
                },
              ],
            },
            registeredCount: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$registeredCount", 0] },
                    registeredCount,
                  ],
                },
              ],
            },
            attendedCount: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$attendedCount", 0] },
                    attendedCount,
                  ],
                },
              ],
            },
            totalRevenue: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$totalRevenue", 0] },
                    sessionRevenue,
                  ],
                },
              ],
            },
            grossRevenueMinor: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$grossRevenueMinor", 0] },
                    grossRevenueMinor,
                  ],
                },
              ],
            },
          },
        },
      ],
      {
        returnDocument: "after",
        session: dbSession,
        updatePipeline: true,
      },
    );

    if (!activity) {
      throw new SessionOperationError("Activity not found.", 404);
    }

    return {
      activity,
      session: scheduledSession,
      deletedParticipationCount: participationResult.deletedCount,
    };
  });
}

export async function registerForSession(
  userId: EntityId,
  sessionId: EntityId,
): Promise<RegistrationResult> {
  return mongoose.connection.transaction(async (dbSession) => {
    const existing = await SessionParticipationModel.findOne({
      userId,
      sessionId,
    }).session(dbSession);
    const currentSession = await SessionModel.findById(sessionId).session(dbSession);

    if (!currentSession || currentSession.isOpen === false || currentSession.isActive === false) {
      throw new SessionOperationError("Open session not found", 404);
    }

    const blacklist = await BlacklistModel.findOne({
      user: userId,
      group: currentSession.chat,
    })
      .select("_id")
      .session(dbSession);

    if (blacklist) {
      throw new SessionOperationError(
        "You cannot join this session because you are blacklisted from its group.",
        403,
      );
    }

    const activity = await ActivityModel.findById(currentSession.activity).session(
      dbSession,
    );

    if (!activity) {
      throw new SessionOperationError("Activity not found.", 404);
    }

    if (Number(currentSession.priceSgd) > 0) {
      throw new SessionOperationError(
        "Payment is required to join this session.",
        402,
        { paymentRequired: true },
      );
    }

    if (
      existing &&
      existing.status !== "cancelled" &&
      existing.status !== "rejected"
    ) {
      const group = await ChatModel.findByIdAndUpdate(
        currentSession.chat,
        { $addToSet: { members: userId } },
        { returnDocument: "after", session: dbSession },
      );

      if (!group) {
        throw new SessionOperationError("Group not found", 404);
      }

      await addUserToVendorConsolidated(
        activity.host,
        userId,
        existing.registeredAt ?? existing.createdAt ?? new Date(),
        dbSession,
      );

      return {
        created: false,
        session: currentSession,
        groupId: group._id,
      };
    }

    const reservedSession = await SessionModel.findOneAndUpdate(
      {
        _id: currentSession._id,
        isOpen: true,
        isActive: true,
        $expr: {
          $lt: [
            {
              $add: [
                { $ifNull: ["$registeredCount", 0] },
                { $ifNull: ["$pendingPaymentCount", 0] },
              ],
            },
            "$spots",
          ],
        },
      },
      {
        $inc: { registeredCount: 1 },
      },
      { returnDocument: "after", session: dbSession },
    );

    if (!reservedSession) {
      throw new SessionOperationError("This session is full.", 409, {
        spots: Number(currentSession.spots),
      });
    }

    const now = new Date();

    if (existing) {
      existing.role = "participant";
      existing.status = "registered";
      existing.paymentId = undefined;
      existing.amountPaidMinor = 0;
      existing.currency = "SGD";
      existing.registeredAt = now;
      existing.attendanceMarkedAt = undefined;
      existing.reviewPromptSentAt = undefined;
      await existing.save({ session: dbSession });
    } else {
      await SessionParticipationModel.create(
        [
          {
            userId,
            sessionId: currentSession._id,
            role: "participant",
            status: "registered",
            amountPaidMinor: 0,
            currency: "SGD",
            registeredAt: now,
          },
        ],
        { session: dbSession },
      );
    }

    await ActivityModel.findByIdAndUpdate(
      activity._id,
      {
        $inc: { registeredCount: 1 },
      },
      { session: dbSession },
    );

    const group = await ChatModel.findByIdAndUpdate(
      currentSession.chat,
      { $addToSet: { members: userId } },
      { returnDocument: "after", session: dbSession },
    );

    if (!group) {
      throw new SessionOperationError("Group not found", 404);
    }

    await addUserToVendorConsolidated(
      activity.host,
      userId,
      now,
      dbSession,
    );

    return {
      created: true,
      session: reservedSession,
      groupId: group._id,
    };
  });
}

export async function markSessionAttendance(input: {
  sessionId: EntityId;
  userId: EntityId;
  status: Extract<
    SessionParticipationStatus,
    "registered" | "attended" | "no_show"
  >;
}) {
  return mongoose.connection.transaction(async (dbSession) => {
    const scheduledSession = await SessionModel.findById(input.sessionId).session(
      dbSession,
    );

    if (!scheduledSession) {
      throw new SessionOperationError("Session not found.", 404);
    }

    const participation = await SessionParticipationModel.findOne({
      sessionId: scheduledSession._id,
      userId: input.userId,
      role: "participant",
      status: { $in: ["registered", "approved", "attended", "no_show"] },
    }).session(dbSession);

    if (!participation) {
      throw new SessionOperationError("Signed-up user not found.", 404);
    }

    const previousStatus = participation.status as SessionParticipationStatus;
    const attendanceDelta = getAttendanceCounterDelta(
      previousStatus,
      input.status,
    );
    const now = new Date();
    const shouldPromptReview =
      input.status === "attended" && !participation.reviewPromptSentAt;

    participation.status = input.status;
    participation.attendanceMarkedAt =
      input.status === "registered" ? undefined : now;

    if (shouldPromptReview) {
      participation.reviewPromptSentAt = now;
    }

    await participation.save({ session: dbSession });

    if (attendanceDelta !== 0) {
      await SessionModel.findByIdAndUpdate(
        scheduledSession._id,
        { $inc: { attendedCount: attendanceDelta } },
        { session: dbSession },
      );
      await ActivityModel.findByIdAndUpdate(
        scheduledSession.activity,
        { $inc: { attendedCount: attendanceDelta } },
        { session: dbSession },
      );
      await UserModel.findByIdAndUpdate(
        input.userId,
        { $inc: { attendedSessionsCount: attendanceDelta } },
        { session: dbSession },
      );
    }

    if (shouldPromptReview) {
      const activity = await ActivityModel.findById(scheduledSession.activity)
        .select("title")
        .session(dbSession);

      await NotificationModel.create(
        [
          {
            user: input.userId,
            title: "Review your activity",
            content: `How was ${activity?.title ?? "this activity"}? Share a quick rating and note.`,
            link: `/sessions/${scheduledSession.mockId}/review`,
            read: false,
          },
        ],
        { session: dbSession },
      );
    }

    return participation;
  });
}

export async function reviewVolunteerParticipation(input: {
  sessionId: EntityId;
  userId: EntityId;
  status: Extract<SessionParticipationStatus, "approved" | "rejected">;
}) {
  return mongoose.connection.transaction(async (dbSession) => {
    const scheduledSession = await SessionModel.findById(input.sessionId).session(
      dbSession,
    );

    if (!scheduledSession) {
      throw new SessionOperationError("Volunteer session not found.", 404);
    }

    const activity = await ActivityModel.findOne({
      _id: scheduledSession.activity,
      isVolunteer: true,
    }).session(dbSession);

    if (!activity) {
      throw new SessionOperationError("Volunteer session not found.", 404);
    }

    const participation = await SessionParticipationModel.findOne({
      sessionId: scheduledSession._id,
      userId: input.userId,
      role: "participant",
      status: { $in: ["registered", "approved", "rejected"] },
    }).session(dbSession);

    if (!participation) {
      throw new SessionOperationError(
        "This volunteer application can no longer be reviewed.",
        409,
      );
    }

    const registrationDelta = getRegistrationCounterDelta(
      participation.status,
      input.status,
    );

    if (registrationDelta > 0) {
      const reservedSession = await SessionModel.findOneAndUpdate(
        {
          _id: scheduledSession._id,
          $expr: { $lt: ["$registeredCount", "$spots"] },
        },
        { $inc: { registeredCount: registrationDelta } },
        { returnDocument: "after", session: dbSession },
      );

      if (!reservedSession) {
        throw new SessionOperationError("This volunteer session is full.", 409);
      }
    } else if (registrationDelta < 0) {
      await SessionModel.findOneAndUpdate(
        { _id: scheduledSession._id, registeredCount: { $gt: 0 } },
        { $inc: { registeredCount: registrationDelta } },
        { session: dbSession },
      );
    }

    if (registrationDelta !== 0) {
      await ActivityModel.findOneAndUpdate(
        {
          _id: activity._id,
          ...(registrationDelta < 0
            ? { registeredCount: { $gt: 0 } }
            : {}),
        },
        { $inc: { registeredCount: registrationDelta } },
        { session: dbSession },
      );
    }

    participation.status = input.status;
    await participation.save({ session: dbSession });

    return participation;
  });
}
