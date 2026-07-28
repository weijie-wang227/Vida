import {
  ActivityModel,
  SessionModel,
  SessionParticipationModel,
  UserModel,
} from "../models/VidaData.js";
import {
  convertCreditsToDollars,
  getCreditsToDollarsRate,
} from "../utils/finance.js";
import { countedRegistrationStatuses } from "../domain/sessionParticipation.js";

type SessionCounts = {
  registeredCount: number;
  attendedCount: number;
};

export async function reconcileParticipationCounters() {
  const conversionRate = await getCreditsToDollarsRate();
  const [sessionCountRows, userCountRows, sessions, activities, users] =
    await Promise.all([
      SessionParticipationModel.aggregate([
        {
          $match: {
            role: "participant",
            status: { $in: countedRegistrationStatuses },
          },
        },
        {
          $group: {
            _id: "$sessionId",
            registeredCount: { $sum: 1 },
            attendedCount: {
              $sum: { $cond: [{ $eq: ["$status", "attended"] }, 1, 0] },
            },
          },
        },
      ]),
      SessionParticipationModel.aggregate([
        { $match: { role: "participant", status: "attended" } },
        { $group: { _id: "$userId", attendedSessionsCount: { $sum: 1 } } },
      ]),
      SessionModel.find({})
        .select("_id activity credits")
        .lean(),
      ActivityModel.find({}).select("_id").lean(),
      UserModel.find({}).select("_id").lean(),
    ]);
  const countsBySessionId = new Map<string, SessionCounts>(
    sessionCountRows.map((row: Record<string, any>) => [
      String(row._id),
      {
        registeredCount: Number(row.registeredCount) || 0,
        attendedCount: Number(row.attendedCount) || 0,
      },
    ]),
  );

  if (sessions.length > 0) {
    await SessionModel.bulkWrite(
      sessions.map((session: Record<string, any>) => {
        const counts = countsBySessionId.get(String(session._id)) ?? {
          registeredCount: 0,
          attendedCount: 0,
        };

        return {
          updateOne: {
            filter: { _id: session._id },
            update: {
              $set: {
                ...counts,
              },
            },
          },
        };
      }),
    );
  }

  const totalsByActivityId = new Map<
    string,
    {
      sessionsNum: number;
      registeredCount: number;
      attendedCount: number;
      totalRevenue: number;
    }
  >();
  sessions.forEach((session: Record<string, any>) => {
    const activityId = String(session.activity ?? "");

    if (!activityId) {
      return;
    }

    const counts = countsBySessionId.get(String(session._id)) ?? {
      registeredCount: 0,
      attendedCount: 0,
    };
    const totals = totalsByActivityId.get(activityId) ?? {
      sessionsNum: 0,
      registeredCount: 0,
      attendedCount: 0,
      totalRevenue: 0,
    };

    totals.sessionsNum += 1;
    totals.registeredCount += counts.registeredCount;
    totals.attendedCount += counts.attendedCount;
    totals.totalRevenue +=
      convertCreditsToDollars(
        Number(session.credits) || 0,
        conversionRate,
      ) *
      counts.registeredCount;
    totalsByActivityId.set(activityId, totals);
  });

  if (activities.length > 0) {
    await ActivityModel.bulkWrite(
      activities.map((activity: Record<string, any>) => {
        const totals = totalsByActivityId.get(String(activity._id)) ?? {
          sessionsNum: 0,
          registeredCount: 0,
          attendedCount: 0,
          totalRevenue: 0,
        };

        return {
          updateOne: {
            filter: { _id: activity._id },
            update: {
              $set: {
                ...totals,
                totalRevenue:
                  Math.round((totals.totalRevenue + Number.EPSILON) * 100) / 100,
              },
            },
          },
        };
      }),
    );
  }

  const attendedCountByUserId = new Map(
    userCountRows.map((row: Record<string, any>) => [
      String(row._id),
      Number(row.attendedSessionsCount) || 0,
    ]),
  );

  if (users.length > 0) {
    await UserModel.bulkWrite(
      users.map((user: Record<string, any>) => ({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              attendedSessionsCount:
                attendedCountByUserId.get(String(user._id)) ?? 0,
            },
          },
        },
      })),
    );
  }

  return {
    sessions: sessions.length,
    activities: activities.length,
    users: users.length,
    participations: sessionCountRows.reduce(
      (total: number, row: Record<string, any>) =>
        total + (Number(row.registeredCount) || 0),
      0,
    ),
  };
}
