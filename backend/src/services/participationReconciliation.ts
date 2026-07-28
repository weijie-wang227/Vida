import {
  ActivityModel,
  SessionModel,
  SessionParticipationModel,
  UserModel,
  VendorModel,
} from "../models/VidaData.js";
import {
  convertCreditsToDollars,
  getCreditsToDollarsRate,
} from "../utils/finance.js";
import { countedRegistrationStatuses } from "../domain/sessionParticipation.js";

type SessionCounts = {
  registeredCount: number;
  attendedCount: number;
  creditsAggregate: number;
};

export async function reconcileParticipationCounters() {
  const conversionRate = await getCreditsToDollarsRate();
  const [sessions, activities, users, vendors] = await Promise.all([
    SessionModel.find({}).select("_id activity credits").lean(),
    ActivityModel.find({}).select("_id host").lean(),
    UserModel.find({}).select("_id").lean(),
    VendorModel.find({}).select("_id owner").lean(),
  ]);
  const ownerByVendorId = new Map(
    vendors.map((vendor: Record<string, any>) => [
      String(vendor._id),
      vendor.owner,
    ]),
  );
  const ownerByActivityId = new Map(
    activities.map((activity: Record<string, any>) => [
      String(activity._id),
      ownerByVendorId.get(String(activity.host)),
    ]),
  );

  if (sessions.length > 0) {
    await SessionParticipationModel.bulkWrite(
      sessions.map((session: Record<string, any>) => {
        const ownerId = ownerByActivityId.get(String(session.activity));

        return {
          updateMany: {
            filter: {
              sessionId: session._id,
              role: "participant",
              status: { $in: countedRegistrationStatuses },
              creditsTransaction: { $exists: false },
              ...(ownerId ? { userId: { $ne: ownerId } } : {}),
            },
            update: {
              $set: {
                creditsTransaction: Math.max(0, Number(session.credits) || 0),
              },
            },
          },
        };
      }),
    );
  }

  await SessionParticipationModel.updateMany(
    { creditsTransaction: { $exists: false } },
    { $set: { creditsTransaction: 0 } },
  );

  const [sessionCountRows, userCountRows] = await Promise.all([
    SessionParticipationModel.aggregate([
      {
        $group: {
          _id: "$sessionId",
          registeredCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$role", "participant"] },
                    { $in: ["$status", countedRegistrationStatuses] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          attendedCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$role", "participant"] },
                    { $eq: ["$status", "attended"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          creditsAggregate: {
            $sum: {
              $cond: [
                { $eq: ["$role", "participant"] },
                { $ifNull: ["$creditsTransaction", 0] },
                0,
              ],
            },
          },
        },
      },
    ]),
    SessionParticipationModel.aggregate([
      { $match: { role: "participant", status: "attended" } },
      { $group: { _id: "$userId", attendedSessionsCount: { $sum: 1 } } },
    ]),
  ]);
  const countsBySessionId = new Map<string, SessionCounts>(
    sessionCountRows.map((row: Record<string, any>) => [
      String(row._id),
      {
        registeredCount: Number(row.registeredCount) || 0,
        attendedCount: Number(row.attendedCount) || 0,
        creditsAggregate: Number(row.creditsAggregate) || 0,
      },
    ]),
  );

  if (sessions.length > 0) {
    await SessionModel.bulkWrite(
      sessions.map((session: Record<string, any>) => {
        const counts = countsBySessionId.get(String(session._id)) ?? {
          registeredCount: 0,
          attendedCount: 0,
          creditsAggregate: 0,
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
      creditsAggregate: 0,
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
        counts.creditsAggregate,
        conversionRate,
      );
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
