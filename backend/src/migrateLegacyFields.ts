import "./env.js";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "./db.js";
import { ActivityModel, SettingsModel } from "./models/VidaData.js";

async function migrateLegacyFields() {
  const shouldApply = process.argv.includes("--apply");
  const connected = await connectDB();

  if (!connected || !mongoose.connection.db) {
    throw new Error("A MongoDB connection is required for legacy field migration.");
  }

  const activityCoverBackfillFilter = {
    imageUrls: { $exists: false },
    cover: { $type: "string", $ne: "" },
  };
  const activityCoverRemovalFilter = { cover: { $exists: true } };
  const settingsAppearanceRemovalFilter = {
    "preferences.appearance": { $exists: true },
  };
  const [coverBackfillCount, coverRemovalCount, appearanceRemovalCount] =
    await Promise.all([
      ActivityModel.collection.countDocuments(activityCoverBackfillFilter),
      ActivityModel.collection.countDocuments(activityCoverRemovalFilter),
      SettingsModel.collection.countDocuments(settingsAppearanceRemovalFilter),
    ]);

  console.log(
    `Legacy field migration found ${coverBackfillCount} activities needing an imageUrls backfill, ${coverRemovalCount} activities with cover, and ${appearanceRemovalCount} settings with appearance.`,
  );

  if (!shouldApply) {
    console.log(
      "Preview only. Run `npm run migrate:legacy-fields:apply` to apply it.",
    );
    return;
  }

  const coverBackfillResult = await ActivityModel.collection.updateMany(
    activityCoverBackfillFilter,
    [{ $set: { imageUrls: ["$cover"] } }],
  );
  const coverRemovalResult = await ActivityModel.collection.updateMany(
    activityCoverRemovalFilter,
    { $unset: { cover: "" } },
  );
  const appearanceRemovalResult = await SettingsModel.collection.updateMany(
    settingsAppearanceRemovalFilter,
    { $unset: { "preferences.appearance": "" } },
  );

  console.log(
    `Legacy field migration backfilled ${coverBackfillResult.modifiedCount} activities, removed cover from ${coverRemovalResult.modifiedCount} activities, and removed appearance from ${appearanceRemovalResult.modifiedCount} settings.`,
  );
}

migrateLegacyFields()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
