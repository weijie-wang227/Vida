import "./env.js";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "./db.js";
import {
  ActivityModel,
  SessionModel,
  SessionParticipationModel,
} from "./models/VidaData.js";
import { sgdToMinor } from "./services/payments/money.js";

const legacyCreditToSgdRate = 0.7;

function legacyCreditsToMinor(value: unknown) {
  const credits = Number(value);

  return sgdToMinor(
    Number.isFinite(credits) && credits > 0
      ? credits * legacyCreditToSgdRate
      : 0,
  );
}

async function migratePayments() {
  const shouldApply = process.argv.includes("--apply");
  const connected = await connectDB();

  if (!connected || !mongoose.connection.db) {
    throw new Error("A MongoDB connection is required for payment migration.");
  }

  const sessions = await SessionModel.collection
    .find(
      {},
      {
        projection: {
          _id: 1,
          activity: 1,
          priceSgd: 1,
          credits: 1,
        },
      },
    )
    .toArray();
  const participations = await SessionParticipationModel.collection
    .find(
      {},
      {
        projection: {
          _id: 1,
          sessionId: 1,
          role: 1,
          amountPaidMinor: 1,
          creditsTransaction: 1,
        },
      },
    )
    .toArray();
  const legacyParticipationCount = participations.filter(
    (participation) =>
      participation.amountPaidMinor === undefined &&
      participation.creditsTransaction !== undefined,
  ).length;

  console.log(
    `Payment migration found ${sessions.length} sessions and ${legacyParticipationCount} legacy participation charges.`,
  );

  if (!shouldApply) {
    console.log(
      "Preview only. Run `npm run migrate:payments:apply` to apply it.",
    );
    return;
  }

  if (participations.length > 0) {
    await SessionParticipationModel.collection.bulkWrite(
      participations.map((participation) => ({
        updateOne: {
          filter: { _id: participation._id },
          update: {
            $set: {
              amountPaidMinor:
                participation.amountPaidMinor === undefined
                  ? legacyCreditsToMinor(participation.creditsTransaction)
                  : Math.max(0, Number(participation.amountPaidMinor) || 0),
              currency: "SGD",
            },
            $unset: { creditsTransaction: "" },
          },
        },
      })),
    );
  }

  const revenueRows = await SessionParticipationModel.collection
    .aggregate([
      { $match: { role: "participant" } },
      {
        $group: {
          _id: "$sessionId",
          grossRevenueMinor: { $sum: { $ifNull: ["$amountPaidMinor", 0] } },
        },
      },
    ])
    .toArray();
  const revenueBySessionId = new Map(
    revenueRows.map((row) => [
      String(row._id),
      Math.max(0, Number(row.grossRevenueMinor) || 0),
    ]),
  );

  if (sessions.length > 0) {
    await SessionModel.collection.bulkWrite(
      sessions.map((session) => {
        const storedPrice = Number(session.priceSgd);
        const priceSgd =
          Number.isFinite(storedPrice) && storedPrice >= 0
            ? storedPrice
            : legacyCreditsToMinor(session.credits) / 100;

        return {
          updateOne: {
            filter: { _id: session._id },
            update: {
              $set: {
                priceSgd,
                grossRevenueMinor:
                  revenueBySessionId.get(String(session._id)) ?? 0,
                pendingPaymentCount: 0,
              },
              $unset: { credits: "", creditsAggregate: "" },
            },
          },
        };
      }),
    );
  }

  const activityRevenueRows = await SessionModel.collection
    .aggregate([
      {
        $group: {
          _id: "$activity",
          grossRevenueMinor: { $sum: { $ifNull: ["$grossRevenueMinor", 0] } },
        },
      },
    ])
    .toArray();

  if (activityRevenueRows.length > 0) {
    await ActivityModel.collection.bulkWrite(
      activityRevenueRows.map((row) => {
        const grossRevenueMinor = Math.max(
          0,
          Number(row.grossRevenueMinor) || 0,
        );

        return {
          updateOne: {
            filter: { _id: row._id },
            update: {
              $set: {
                grossRevenueMinor,
                totalRevenue: grossRevenueMinor / 100,
              },
            },
          },
        };
      }),
    );
  }

  const legacyCollections = ["accounts", "memberships", "conversionRates"];
  const existingCollectionNames = new Set(
    (await mongoose.connection.db.listCollections().toArray()).map(
      (collection) => collection.name,
    ),
  );

  for (const collectionName of legacyCollections) {
    if (existingCollectionNames.has(collectionName)) {
      await mongoose.connection.db.dropCollection(collectionName);
    }
  }

  console.log(
    "Payment migration completed. Legacy credit fields and account-balance collections were removed.",
  );
}

migratePayments()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
