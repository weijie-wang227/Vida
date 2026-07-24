import mongoose from "mongoose";
import {
  defaultCreditsToDollarsRate,
  getCreditsToDollarsRate,
} from "./utils/finance.js";
import {
  migrateSessionParticipationCollection,
  migrateSessionParticipations,
} from "./services/participationReconciliation.js";
import {
  SessionModel,
  SessionParticipationModel,
} from "./models/VidaData.js";
import {
  ChatMessagePayloadError,
  normalizeChatMessagePayload,
} from "./chatMessages.js";

const databaseName = "vida";
const serverSelectionTimeoutMS = 30000;
const readyStateLabels = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
} as const;

let lastConnectionError: string | null = null;

function parseLegacyActivityStartsAt(dateValue: unknown, timeValue: unknown) {
  const dateText = typeof dateValue === "string" ? dateValue.trim() : "";
  const timeText = typeof timeValue === "string" ? timeValue.trim() : "";
  const monthByName: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  if (!dateText || !timeText) {
    return null;
  }

  const year = new Date().getFullYear();
  const dateMatch = dateText.match(/^(?:[a-z]{3},\s*)?([a-z]{3})\s+(\d{1,2})$/i);
  const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!dateMatch || !timeMatch) {
    const startsAt = new Date(`${dateText} ${year} ${timeText} GMT+0800`);

    return Number.isNaN(startsAt.getTime()) ? null : startsAt;
  }

  const month = monthByName[dateMatch[1].toLowerCase()];
  const day = Number(dateMatch[2]);
  const minute = Number(timeMatch[2]);
  const period = timeMatch[3].toUpperCase();
  const hour12 = Number(timeMatch[1]);

  if (month === undefined || day < 1 || hour12 < 1 || hour12 > 12) {
    return null;
  }

  const hour = (hour12 % 12) + (period === "PM" ? 12 : 0);
  const startsAt = new Date(Date.UTC(year, month, day, hour - 8, minute));

  return Number.isNaN(startsAt.getTime()) ? null : startsAt;
}

function getFiniteNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function isValidLatLng(lat: number | null, lng: number | null) {
  return (
    lat !== null &&
    lng !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

async function getAvailableMockId(collection: any, preferred: unknown) {
  const preferredMockId = Number(preferred);

  if (
    Number.isInteger(preferredMockId) &&
    !(await (collection as any).findOne({ mockId: preferredMockId }))
  ) {
    return preferredMockId;
  }

  const [lastItem] = await (collection as any)
    .find()
    .sort({ mockId: -1 })
    .limit(1)
    .project({ mockId: 1 })
    .toArray();

  return (lastItem?.mockId ?? 0) + 1;
}

async function findOrCreateHostVendor(activity: Record<string, any>) {
  const db = mongoose.connection.db;

  if (!db) {
    return activity.host;
  }

  const vendors = db.collection("vendors");
  const users = db.collection("users");

  if (activity.vendor) {
    return activity.vendor;
  }

  const existingHostVendor = await vendors.findOne({ _id: activity.host });

  if (existingHostVendor) {
    return existingHostVendor._id;
  }

  if (!activity.host) {
    return activity.host;
  }

  const existingOwnerVendor = await vendors.findOne({ owner: activity.host });

  if (existingOwnerVendor) {
    return existingOwnerVendor._id;
  }

  const user = await users.findOne({ _id: activity.host });

  if (!user) {
    return activity.host;
  }

  const inserted = await vendors.insertOne({
    owner: user._id,
    name: user.name ?? activity.title ?? "Activity host",
    profileUrl: "",
    description: "",
    numAttended: 0,
    allActivities: [activity._id],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return inserted.insertedId;
}

async function migrateActivitySessions() {
  const db = mongoose.connection.db;

  if (!db) {
    return;
  }

  const activities = db.collection("activities");
  const sessions = db.collection("sessions");
  const sessionParticipations = db.collection("sessionParticipations");
  const activityJoins = db.collection("activityJoins");
  const hasLegacyActivityJoins = await db
    .listCollections({ name: "activityJoins" }, { nameOnly: true })
    .hasNext();
  const mapPins = db.collection("mapPins");
  const vendors = db.collection("vendors");
  const activityRows = await activities
    .find({})
    .project({
      mockId: 1,
      title: 1,
      description: 1,
      host: 1,
      vendor: 1,
      date: 1,
      time: 1,
      startsAt: 1,
      location: 1,
      duration: 1,
      durationMinutes: 1,
      spots: 1,
      credits: 1,
      chat: 1,
      isPremium: 1,
      skillsFuturePayable: 1,
      isOpen: 1,
      isActive: 1,
      lat: 1,
      lng: 1,
      latitude: 1,
      longitude: 1,
    })
    .toArray();

  for (const activity of activityRows) {
    const hostVendorId = await findOrCreateHostVendor(activity);
    const existingSession = await sessions.findOne({ activity: activity._id });
    const update: {
      $set?: Record<string, unknown>;
      $unset: Record<string, string>;
    } = {
      $unset: {
        date: "",
        time: "",
        startsAt: "",
        location: "",
        duration: "",
        durationMinutes: "",
        spots: "",
        credits: "",
        chat: "",
        isPremium: "",
        skillsFuturePayable: "",
        isOpen: "",
        isActive: "",
        lat: "",
        lng: "",
        latitude: "",
        longitude: "",
        vendor: "",
      },
    };

    if (hostVendorId) {
      update.$set = {
        ...(update.$set ?? {}),
        host: hostVendorId,
        description: activity.description ?? "",
      };
      await vendors.updateOne(
        { _id: hostVendorId },
        { $addToSet: { allActivities: activity._id } },
      );
    }

    let activitySession = existingSession;

    if (!existingSession) {
      const startsAt =
        activity.startsAt instanceof Date &&
        !Number.isNaN(activity.startsAt.getTime())
          ? activity.startsAt
          : parseLegacyActivityStartsAt(activity.date, activity.time);
      const pin = await mapPins.findOne({ activity: activity._id });
      const lat = getFiniteNumber(activity.lat ?? activity.latitude ?? pin?.latitude);
      const lng = getFiniteNumber(activity.lng ?? activity.longitude ?? pin?.longitude);
      const duration = getFiniteNumber(
        activity.duration ?? activity.durationMinutes,
      );
      const spots = getFiniteNumber(activity.spots);
      const credits = getFiniteNumber(activity.credits ?? 0);

      if (
        startsAt &&
        activity.chat &&
        activity.location &&
        duration !== null &&
        spots !== null &&
        credits !== null &&
        isValidLatLng(lat, lng)
      ) {
        const insertedSession = await sessions.insertOne({
          mockId: await getAvailableMockId(sessions, activity.mockId),
          activity: activity._id,
          title: activity.title,
          startsAt,
          duration,
          spots,
          credits,
          chat: activity.chat,
          isPremium: Boolean(activity.isPremium),
          skillsFuturePayable: Boolean(activity.skillsFuturePayable),
          isOpen: activity.isOpen !== false,
          isActive: activity.isActive !== false,
          location: activity.location,
          lat,
          lng,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        activitySession = {
          _id: insertedSession.insertedId,
        };
      }
    }

    await activities.updateOne({ _id: activity._id }, update);
  }

  const oldJoins = await activityJoins.find({}).toArray();
  let unmigratedActivityJoins = 0;

  for (const join of oldJoins) {
    const session = await sessions.findOne({ activity: join.activityId });

    if (!session) {
      unmigratedActivityJoins += 1;
      continue;
    }

    await sessionParticipations.updateOne(
      { userId: join.userId, sessionId: session._id },
      {
        $setOnInsert: {
          userId: join.userId,
          sessionId: session._id,
          role: "participant",
          status: join.attended ? "attended" : "registered",
          registeredAt: join.createdAt ?? new Date(),
          ...(join.attended
            ? { attendanceMarkedAt: join.updatedAt ?? new Date() }
            : {}),
          ...(join.sentReminder
            ? { reminderSentAt: join.updatedAt ?? new Date() }
            : {}),
          ...(join.sentReview
            ? { reviewPromptSentAt: join.updatedAt ?? new Date() }
            : {}),
          createdAt: join.createdAt ?? new Date(),
          updatedAt: join.updatedAt ?? new Date(),
        },
      },
      { upsert: true },
    );
  }

  if (hasLegacyActivityJoins && unmigratedActivityJoins === 0) {
    await activityJoins.drop();
  }
}

async function migrateSessionDefaultFields() {
  const sessions = mongoose.connection.db?.collection("sessions");

  if (!sessions) {
    return;
  }

  await sessions.updateMany(
    { isOpen: { $exists: false } },
    { $set: { isOpen: true } },
  );
  await sessions.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } },
  );
  await sessions.updateMany(
    { skillsFuturePayable: { $exists: false } },
    { $set: { skillsFuturePayable: false } },
  );
}

function asRecord(value: unknown): Record<string, any> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, any>)
    : {};
}

function toObjectId(value: unknown) {
  const rawValue = asRecord(value)._id ?? value;

  if (rawValue instanceof mongoose.Types.ObjectId) {
    return rawValue;
  }

  return mongoose.Types.ObjectId.isValid(String(rawValue ?? ""))
    ? new mongoose.Types.ObjectId(String(rawValue))
    : null;
}

function toIsoDate(value: unknown, fallback: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString();
  }

  const fallbackDate =
    fallback instanceof Date ? fallback : new Date(String(fallback ?? ""));

  return !Number.isNaN(fallbackDate.getTime())
    ? fallbackDate.toISOString()
    : new Date(0).toISOString();
}

async function migrateChatMessagePayloads() {
  const db = mongoose.connection.db;

  if (!db) {
    return;
  }

  const messages = db.collection("chatMessages");
  const activities = db.collection("activities");
  const sessions = db.collection("sessions");
  const rows = await messages.find({}).toArray();

  for (const message of rows) {
    const existingPayload = asRecord(message.payload);
    let payload: Record<string, any> | null = null;

    if (message.type === "activity_invite") {
      try {
        payload = normalizeChatMessagePayload(
          "activity_invite",
          existingPayload,
        );
      } catch (error) {
        if (!(error instanceof ChatMessagePayloadError)) {
          throw error;
        }

        const existingActivityPayload = asRecord(existingPayload.activity);
        const existingSessionPayload = asRecord(existingPayload.session);
        const requestedSessionId = toObjectId(
          message.session ?? existingSessionPayload.objectId,
        );
        const session = requestedSessionId
          ? await sessions.findOne({ _id: requestedSessionId })
          : await sessions.findOne({ chat: message.chat });
        const activityId = toObjectId(
          message.activity ?? session?.activity ?? existingActivityPayload.objectId,
        );
        const activity = activityId
          ? await activities.findOne({ _id: activityId })
          : null;
        const sessionObjectId = String(
          session?._id ?? requestedSessionId ?? message._id,
        );

        payload = normalizeChatMessagePayload("activity_invite", {
          activity: {
            id:
              existingActivityPayload.id ??
              activity?.mockId ??
              String(activity?._id ?? activityId ?? "activity"),
            title:
              existingActivityPayload.title ??
              activity?.title ??
              session?.title ??
              "Session invitation",
            startsAt: toIsoDate(
              existingActivityPayload.startsAt ?? session?.startsAt,
              message.createdAt,
            ),
            location:
              existingActivityPayload.location ??
              session?.location ??
              "Location unavailable",
            durationMinutes:
              existingActivityPayload.durationMinutes ?? session?.duration ?? 0,
            credits: existingActivityPayload.credits ?? session?.credits ?? 0,
            categories:
              existingActivityPayload.categories ?? activity?.categories ?? [],
          },
          session: {
            id: existingSessionPayload.id ?? session?.mockId ?? sessionObjectId,
            objectId: sessionObjectId,
          },
        });
      }
    } else if (message.type === "text" || !message.type) {
      payload = normalizeChatMessagePayload("text", {
        text: existingPayload.text ?? message.body ?? "Message",
      });
    } else if (message.type === "poll") {
      try {
        payload = normalizeChatMessagePayload("poll", existingPayload);
      } catch (error) {
        console.warn(
          `Skipping malformed poll message ${String(message._id)} during payload migration.`,
          error,
        );
      }
    }

    const update: Record<string, any> = {
      $unset: { body: "", activity: "", session: "" },
    };

    if (payload) {
      update.$set = {
        type: message.type || "text",
        schemaVersion: 1,
        payload,
      };
    }

    await messages.updateOne({ _id: message._id }, update);
  }
}

async function migrateActivityDefaultFields() {
  const activities = mongoose.connection.db?.collection("activities");

  if (!activities) {
    return;
  }

  await activities.updateMany(
    { isVolunteer: { $exists: false } },
    { $set: { isVolunteer: false } },
  );
  await activities.updateMany(
    { isAAC: { $exists: false } },
    { $set: { isAAC: false } },
  );
}

async function removeLegacyParticipationFields() {
  const db = mongoose.connection.db;

  if (!db) {
    return;
  }

  await Promise.all([
    db.collection("sessions").updateMany(
      { joiningCount: { $exists: true } },
      { $unset: { joiningCount: "" } },
    ),
    db.collection("activities").updateMany(
      { attendeesNum: { $exists: true } },
      { $unset: { attendeesNum: "" } },
    ),
  ]);
}

async function migrateActivityFinanceFields() {
  const db = mongoose.connection.db;

  if (!db) {
    return;
  }

  const rate = await getCreditsToDollarsRate();
  const activities = db.collection("activities");
  const activityRows = await activities
    .find({})
    .project({ _id: 1, host: 1 })
    .toArray();
  const vendors = await db
    .collection("vendors")
    .find({})
    .project({ _id: 1, owner: 1 })
    .toArray();
  const sessions = await db
    .collection("sessions")
    .find({})
    .project({ _id: 1, activity: 1, credits: 1 })
    .toArray();
  const joins = await db
    .collection("sessionParticipations")
    .find({})
    .project({ sessionId: 1, userId: 1 })
    .toArray();
  const ownerByVendorId = new Map(
    vendors.map((vendor) => [String(vendor._id), String(vendor.owner ?? "")]),
  );
  const ownerByActivityId = new Map(
    activityRows.map((activity) => [
      String(activity._id),
      ownerByVendorId.get(String(activity.host ?? "")) ?? "",
    ]),
  );
  const joiningUsersBySessionId = new Map<string, string[]>();

  joins.forEach((join) => {
    const sessionId = String(join.sessionId ?? "");

    if (!sessionId) {
      return;
    }

    joiningUsersBySessionId.set(sessionId, [
      ...(joiningUsersBySessionId.get(sessionId) ?? []),
      String(join.userId ?? ""),
    ]);
  });
  const totalsByActivityId = new Map<
    string,
    { sessionsNum: number; registeredCount: number; totalRevenue: number }
  >();

  sessions.forEach((session) => {
    const activityId = String(session.activity ?? "");

    if (!activityId) {
      return;
    }

    const totals = totalsByActivityId.get(activityId) ?? {
      sessionsNum: 0,
      registeredCount: 0,
      totalRevenue: 0,
    };
    const ownerId = ownerByActivityId.get(activityId) ?? "";
    const attendees = (joiningUsersBySessionId.get(String(session._id)) ?? [])
      .filter((userId) => !ownerId || userId !== ownerId).length;
    const credits = Number(session.credits);

    totals.sessionsNum += 1;
    totals.registeredCount += attendees;
    totals.totalRevenue +=
      (Number.isFinite(credits) && credits > 0 ? credits : 0) *
      (Number.isFinite(rate) ? rate : defaultCreditsToDollarsRate) *
      attendees;
    totalsByActivityId.set(activityId, totals);
  });

  if (activityRows.length === 0) {
    return;
  }

  await activities.bulkWrite(
    activityRows.map((activity) => {
      const totals = totalsByActivityId.get(String(activity._id)) ?? {
        sessionsNum: 0,
        registeredCount: 0,
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

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    lastConnectionError = "MONGODB_URI is not set.";
    console.warn("MONGODB_URI is not set; API routes will return 503.");
    return false;
  }

  try {
    lastConnectionError = null;
    await mongoose.connect(mongoUri, {
      dbName: databaseName,
      tls: true,
      serverSelectionTimeoutMS,
    });
  } catch (error) {
    lastConnectionError =
      error instanceof Error ? error.message : "Unknown MongoDB connection error.";

    if (error instanceof mongoose.Error.MongooseServerSelectionError) {
      lastConnectionError = [
        `Could not reach MongoDB Atlas within ${serverSelectionTimeoutMS / 1000}s.`,
        "TCP reachability alone is not enough; Atlas must also allow your current public IP and complete the TLS replica-set handshake.",
        `Driver detail: ${error.message}`,
      ].join(" ");

      throw new Error(
        [
          `Could not reach MongoDB Atlas within ${serverSelectionTimeoutMS / 1000}s.`,
          "TCP reachability alone is not enough; Atlas must also allow your current public IP and complete the TLS replica-set handshake.",
          `Driver detail: ${error.message}`,
        ].join(" "),
      );
    }

    throw error;
  }

  console.log(`Connected to MongoDB database "${databaseName}".`);
  await migrateSessionParticipationCollection();
  await migrateActivitySessions();
  await migrateChatMessagePayloads();
  await migrateActivityDefaultFields();
  await migrateSessionDefaultFields();
  await migrateSessionParticipations();
  await removeLegacyParticipationFields();
  await Promise.all([
    SessionModel.createIndexes(),
    SessionParticipationModel.createIndexes(),
  ]);

  return true;
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

export function getMongoConnectionStatus() {
  const readyState = mongoose.connection.readyState as keyof typeof readyStateLabels;
  const state = readyStateLabels[readyState] ?? "unknown";

  return {
    database: databaseName,
    connected: readyState === 1,
    state: lastConnectionError && readyState !== 1 ? "failed" : state,
    readyState,
    error: lastConnectionError,
  };
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
