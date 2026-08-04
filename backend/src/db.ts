import mongoose from "mongoose";
import {
  AnnouncementModel,
  AnnouncementVoteModel,
  ChatMessageModel,
  ChatModel,
  SessionModel,
  SessionParticipationModel,
  UserModel,
  VendorAccountModel,
  VendorModel,
} from "./models/VidaData.js";
import { PaymentModel } from "./models/Payment.js";

const databaseName = "vida";
const serverSelectionTimeoutMS = 30000;
const readyStateLabels = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
} as const;

let lastConnectionError: string | null = null;

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
  await Promise.all([
    AnnouncementModel.createIndexes(),
    AnnouncementVoteModel.createIndexes(),
    ChatMessageModel.createIndexes(),
    ChatModel.createIndexes(),
    SessionModel.createIndexes(),
    SessionParticipationModel.createIndexes(),
    UserModel.createIndexes(),
    VendorAccountModel.createIndexes(),
    VendorModel.createIndexes(),
    PaymentModel.createIndexes(),
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
