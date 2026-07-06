import mongoose from "mongoose";

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

async function migrateActivityScheduleFields() {
  const activities = mongoose.connection.db?.collection("activities");

  if (!activities) {
    return;
  }

  const activityRows = await activities
    .find({
      $or: [
        { date: { $exists: true } },
        { time: { $exists: true } },
        { startsAt: { $exists: false } },
      ],
    })
    .project({ date: 1, time: 1, startsAt: 1 })
    .toArray();

  await Promise.all(
    activityRows.map((activity) => {
      const startsAt =
        activity.startsAt instanceof Date &&
        !Number.isNaN(activity.startsAt.getTime())
          ? activity.startsAt
          : parseLegacyActivityStartsAt(activity.date, activity.time);
      const update: {
        $set?: Record<string, unknown>;
        $unset: Record<string, string>;
      } = {
        $unset: { date: "", time: "" },
      };

      if (startsAt) {
        update.$set = { startsAt };
      }

      return activities.updateOne({ _id: activity._id }, update);
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
  await migrateActivityScheduleFields();

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
