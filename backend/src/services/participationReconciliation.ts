import mongoose from "mongoose";
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
      convertCreditsToDollars(Number(session.credits), conversionRate) *
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

export async function migrateSessionParticipationCollection() {
  const db = mongoose.connection.db;

  if (!db) {
    return false;
  }

  const legacyCollectionName = "sessionJoins";
  const collectionName = "sessionParticipations";
  const collectionNames = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      (collection) => collection.name,
    ),
  );

  if (!collectionNames.has(legacyCollectionName)) {
    return false;
  }

  const legacyCollection = db.collection(legacyCollectionName);

  if (!collectionNames.has(collectionName)) {
    await legacyCollection.rename(collectionName);
    return true;
  }

  const participations = db.collection(collectionName);
  const legacyRows = await legacyCollection.find({}).toArray();

  if (legacyRows.length > 0) {
    await participations.bulkWrite(
      legacyRows.map((row) => {
        const { _id: _legacyId, ...participation } = row;

        return {
          updateOne: {
            filter: { userId: row.userId, sessionId: row.sessionId },
            update: { $setOnInsert: participation },
            upsert: true,
          },
        };
      }),
    );
  }

  await legacyCollection.drop();
  return true;
}

export async function migrateSessionParticipations() {
  const db = mongoose.connection.db;

  if (!db) {
    return false;
  }

  const migrationKey = "session-participations-v2";
  const migrations = db.collection("schemaMigrations");

  if (await migrations.findOne({ key: migrationKey })) {
    return false;
  }

  const participations = db.collection("sessionParticipations");
  const legacyRows = await participations
    .find({
      $or: [
        { status: { $exists: false } },
        { role: { $exists: false } },
        { registeredAt: { $exists: false } },
        { attended: { $exists: true } },
        { sentReminder: { $exists: true } },
        { sentReview: { $exists: true } },
      ],
    })
    .toArray();
  const missingCounters = await Promise.all([
    db.collection("sessions").findOne({ registeredCount: { $exists: false } }),
    db.collection("activities").findOne({ registeredCount: { $exists: false } }),
    db.collection("users").findOne({ attendedSessionsCount: { $exists: false } }),
  ]);

  if (legacyRows.length === 0 && missingCounters.every((row) => !row)) {
    await reconcileParticipationCounters();
    await migrations.updateOne(
      { key: migrationKey },
      { $set: { key: migrationKey, appliedAt: new Date() } },
      { upsert: true },
    );
    return false;
  }

  const [sessions, activities, vendors] = await Promise.all([
    db.collection("sessions").find({}).project({ _id: 1, activity: 1 }).toArray(),
    db.collection("activities").find({}).project({ _id: 1, host: 1 }).toArray(),
    db.collection("vendors").find({}).project({ _id: 1, owner: 1 }).toArray(),
  ]);
  const activityIdBySessionId = new Map(
    sessions.map((session) => [String(session._id), String(session.activity ?? "")]),
  );
  const vendorIdByActivityId = new Map(
    activities.map((activity) => [String(activity._id), String(activity.host ?? "")]),
  );
  const ownerIdByVendorId = new Map(
    vendors.map((vendor) => [String(vendor._id), String(vendor.owner ?? "")]),
  );

  if (legacyRows.length > 0) {
    await participations.bulkWrite(
      legacyRows.map((row) => {
        const activityId = activityIdBySessionId.get(String(row.sessionId)) ?? "";
        const vendorId = vendorIdByActivityId.get(activityId) ?? "";
        const ownerId = ownerIdByVendorId.get(vendorId) ?? "";
        const isOrganizer = Boolean(ownerId) && ownerId === String(row.userId);
        const status = row.status ?? (row.attended ? "attended" : "registered");
        const registeredAt = row.registeredAt ?? row.createdAt ?? new Date();
        const attendanceMarkedAt =
          row.attendanceMarkedAt ??
          (status === "attended" ? row.updatedAt ?? registeredAt : undefined);
        const reminderSentAt =
          row.reminderSentAt ??
          (row.sentReminder ? row.updatedAt ?? registeredAt : undefined);
        const reviewPromptSentAt =
          row.reviewPromptSentAt ??
          (row.sentReview ? row.updatedAt ?? registeredAt : undefined);

        return {
          updateOne: {
            filter: { _id: row._id },
            update: {
              $set: {
                role: row.role ?? (isOrganizer ? "organizer" : "participant"),
                status,
                registeredAt,
                ...(attendanceMarkedAt ? { attendanceMarkedAt } : {}),
                ...(reminderSentAt ? { reminderSentAt } : {}),
                ...(reviewPromptSentAt ? { reviewPromptSentAt } : {}),
              },
              $unset: {
                attended: "",
                sentReminder: "",
                sentReview: "",
              },
            },
          },
        };
      }),
    );
  }

  await reconcileParticipationCounters();
  await migrations.updateOne(
    { key: migrationKey },
    { $set: { key: migrationKey, appliedAt: new Date() } },
    { upsert: true },
  );
  return true;
}
