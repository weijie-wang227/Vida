import "./env.js";
import mongoose, { Types } from "mongoose";
import { connectDB, disconnectDB } from "./db.js";
import { TagModel } from "./models/VidaData.js";

type RawActivity = {
  _id: Types.ObjectId;
  tags?: unknown[];
};

async function main() {
  const connected = await connectDB();

  if (!connected) {
    throw new Error("MONGODB_URI is required to migrate activity tags.");
  }

  const activityCollection = mongoose.connection.collection<RawActivity>(
    "activities",
  );
  const activities = (await activityCollection
    .find({ tags: { $type: "array" } })
    .project({ _id: 1, tags: 1 })
    .toArray()) as RawActivity[];
  const tagNames = Array.from(
    new Set(
      activities.flatMap((activity: RawActivity) =>
        (activity.tags ?? []).filter(
          (tag: unknown): tag is string =>
            typeof tag === "string" && Boolean(tag.trim()),
        ).map((tag) => tag.trim()),
      ),
    ),
  );

  if (tagNames.length > 0) {
    await TagModel.bulkWrite(
      tagNames.map((name) => ({
        updateOne: {
          filter: { name },
          update: { $setOnInsert: { name } },
          upsert: true,
        },
      })),
    );
  }

  const tags = await TagModel.find({ name: { $in: tagNames } }).select("_id name");
  const tagIdByName = new Map(
    tags.map((tag: { name: string; _id: Types.ObjectId }) => [tag.name, tag._id]),
  );
  const updates = activities.flatMap((activity: RawActivity) => {
    const currentTags = activity.tags ?? [];

    if (!currentTags.some((tag: unknown) => typeof tag === "string")) {
      return [];
    }

    const seen = new Set<string>();
    const referencedTags = currentTags.flatMap((tag: unknown) => {
      const id =
        typeof tag === "string"
          ? tagIdByName.get(tag.trim())
          : tag instanceof Types.ObjectId
            ? tag
            : null;
      const key = id ? String(id) : "";

      if (!id || seen.has(key)) {
        return [];
      }

      seen.add(key);
      return [id];
    });

    return [
      {
        updateOne: {
          filter: { _id: activity._id },
          update: { $set: { tags: referencedTags } },
        },
      },
    ];
  });

  if (updates.length > 0) {
    await activityCollection.bulkWrite(updates);
  }

  console.log(
    `Migrated ${updates.length} activities to ${tagNames.length} tag references.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to migrate activity tags:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
