import type { ClientSession } from "mongoose";
import { ConsolidatedModel } from "../models/VidaData.js";

export async function addUserToVendorConsolidated(
  vendorId: unknown,
  userId: unknown,
  joinedAt: Date,
  dbSession?: ClientSession,
) {
  if (!vendorId || !userId) {
    return null;
  }

  await ConsolidatedModel.updateOne(
    { vendor: vendorId },
    { $setOnInsert: { vendor: vendorId, users: [] } },
    { upsert: true, session: dbSession },
  );

  return ConsolidatedModel.updateOne(
    {
      vendor: vendorId,
      "users.user": { $ne: userId },
    },
    {
      $push: {
        users: {
          user: userId,
          joinedAt,
        },
      },
    },
    { session: dbSession },
  );
}
