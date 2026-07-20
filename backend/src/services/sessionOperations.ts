import mongoose, { type ClientSession } from "mongoose";
import {
  AccountModel,
  ActivityModel,
  AdminModel,
  BlacklistModel,
  ChatMessageModel,
  ChatModel,
  NotificationModel,
  SessionModel,
  SessionParticipationModel,
  UserModel,
} from "../models/VidaData.js";
import type { SessionParticipationStatus } from "../models/VidaData.js";
import {
  getAttendanceCounterDelta,
  getRegistrationCounterDelta,
} from "../domain/sessionParticipation.js";
import { addUserToVendorConsolidated } from "../utils/data.js";
import {
  convertCreditsToDollars,
  getCreditsToDollarsRate,
} from "../utils/finance.js";
import { normalizeChatMessagePayload } from "../chatMessages.js";

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
  userId: unknown;
  userName: string;
  activityId: unknown;
  activityMockId: number | string;
  activityTitle: string;
  activityCategories: string[];
  linkedChatId?: unknown;
  session: {
    title: string;
    startsAt: Date;
    duration: number;
    spots: number;
    credits: number;
    isPremium: boolean;
    skillsFuturePayable: boolean;
    location: string;
    lat: number;
    lng: number;
  };
};

type RegistrationResult = {
  created: boolean;
  session: Record<string, any>;
  account: Record<string, any> | null;
  groupId: unknown;
};

async function nextMockId(
  model: typeof ChatModel | typeof SessionModel,
  dbSession: ClientSession,
) {
  const lastItem = await model
    .findOne()
    .sort({ mockId: -1 })
    .select("mockId")
    .session(dbSession);

  return (lastItem?.mockId ?? 0) + 1;
}

function formatPreviewTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function getCreditCost(session: Record<string, any>) {
  const credits = Number(session.credits);

  return Number.isFinite(credits) && credits > 0 ? credits : 0;
}

async function findEligibleAccount(
  userId: unknown,
  creditCost: number,
  dbSession: ClientSession,
) {
  if (creditCost === 0) {
    return null;
  }

  return AccountModel.findOneAndUpdate(
    {
      user: userId,
      startAt: { $lte: new Date() },
      creditsLeft: { $gte: creditCost },
    },
    { $inc: { creditsLeft: -creditCost } },
    {
      returnDocument: "after",
      sort: { startAt: -1, _id: -1 },
      session: dbSession,
    },
  ).select("_id creditsLeft");
}

export async function createScheduledSession(input: ScheduledSessionInput) {
  return mongoose.connection.transaction(async (dbSession) => {
    const chat = input.linkedChatId
      ? await ChatModel.findById(input.linkedChatId).session(dbSession)
      : (
          await ChatModel.create(
            [
              {
                mockId: await nextMockId(ChatModel, dbSession),
                name: input.session.title,
                avatar: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
                  input.session.title,
                )}`,
                members: [input.userId],
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

    if (!input.linkedChatId) {
      await AdminModel.create(
        [{ user: input.userId, group: chat._id }],
        { session: dbSession },
      );
    }

    const [scheduledSession] = await SessionModel.create(
      [
        {
          mockId: await nextMockId(SessionModel, dbSession),
          activity: input.activityId,
          title: input.session.title,
          startsAt: input.session.startsAt,
          duration: input.session.duration,
          spots: input.session.spots,
          registeredCount: 0,
          attendedCount: 0,
          credits: input.session.credits,
          chat: chat._id,
          isPremium: input.session.isPremium,
          skillsFuturePayable: input.session.skillsFuturePayable,
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

    await SessionParticipationModel.create(
      [
        {
          userId: input.userId,
          sessionId: scheduledSession._id,
          role: "organizer",
          status: "registered",
          registeredAt: new Date(),
        },
      ],
      { session: dbSession },
    );

    const [message] = await ChatMessageModel.create(
      [
        {
          chat: chat._id,
          sender: input.userId,
          type: "activity_invite",
          schemaVersion: 1,
          payload: normalizeChatMessagePayload("activity_invite", {
            activity: {
              id: input.activityMockId,
              title: input.activityTitle,
              startsAt: input.session.startsAt.toISOString(),
              location: input.session.location,
              durationMinutes: input.session.duration,
              credits: input.session.credits,
              categories: input.activityCategories,
            },
            session: {
              id: scheduledSession.mockId,
              objectId: String(scheduledSession._id),
            },
          }),
        },
      ],
      { session: dbSession },
    );
    const createdAt =
      message.createdAt instanceof Date ? message.createdAt : new Date();

    await ChatModel.findByIdAndUpdate(
      chat._id,
      {
        lastMessage: `Activity invite: ${input.activityTitle}`,
        time: formatPreviewTime(createdAt),
      },
      { session: dbSession },
    );

    return { session: scheduledSession, chatId: chat._id };
  });
}

export async function registerForSession(
  userId: unknown,
  sessionId: unknown,
): Promise<RegistrationResult> {
  const conversionRate = await getCreditsToDollarsRate();

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
        account: null,
        groupId: group._id,
      };
    }

    const reservedSession = await SessionModel.findOneAndUpdate(
      {
        _id: currentSession._id,
        isOpen: true,
        isActive: true,
        $expr: { $lt: ["$registeredCount", "$spots"] },
      },
      { $inc: { registeredCount: 1 } },
      { returnDocument: "after", session: dbSession },
    );

    if (!reservedSession) {
      throw new SessionOperationError("This session is full.", 409, {
        spots: Number(currentSession.spots),
      });
    }

    const creditCost = getCreditCost(reservedSession);
    const account = await findEligibleAccount(userId, creditCost, dbSession);

    if (creditCost > 0 && !account) {
      throw new SessionOperationError(
        "Not enough credits to join this session.",
        402,
        { creditsRequired: creditCost },
      );
    }

    const now = new Date();

    if (existing) {
      existing.role = "participant";
      existing.status = "registered";
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
            registeredAt: now,
          },
        ],
        { session: dbSession },
      );
    }

    await ActivityModel.findByIdAndUpdate(
      activity._id,
      {
        $inc: {
          registeredCount: 1,
          totalRevenue: convertCreditsToDollars(creditCost, conversionRate),
        },
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
      account,
      groupId: group._id,
    };
  });
}

export async function markSessionAttendance(input: {
  sessionId: unknown;
  userId: unknown;
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
            content: `How was ${activity?.title ?? scheduledSession.title}? Share a quick rating and note.`,
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
  sessionId: unknown;
  userId: unknown;
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
