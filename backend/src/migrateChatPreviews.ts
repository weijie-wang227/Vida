import "./env.js";
import mongoose from "mongoose";
import { getChatMessagePreviewText } from "./domain/chatMessages.js";
import { connectDB, disconnectDB } from "./db.js";
import {
  ChatMessageModel,
  ChatModel,
  UserModel,
} from "./models/VidaData.js";
import { formatChatPreviewTime } from "./services/chatPreviews.js";

async function migrateChatPreviews() {
  const shouldApply = process.argv.includes("--apply");
  const connected = await connectDB();

  if (!connected || !mongoose.connection.db) {
    throw new Error("A MongoDB connection is required for chat preview migration.");
  }

  const [chatCount, latestMessageRows] = await Promise.all([
    ChatModel.countDocuments(),
    ChatMessageModel.aggregate([
      {
        $group: {
          _id: "$chat",
          message: {
            $top: {
              sortBy: { createdAt: -1, _id: -1 },
              output: "$$ROOT",
            },
          },
        },
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: "message.sender",
          foreignField: "_id",
          as: "senders",
        },
      },
      {
        $set: {
          "message.sender": { $arrayElemAt: ["$senders", 0] },
        },
      },
      { $project: { message: 1 } },
    ]),
  ]);
  const updates: mongoose.mongo.AnyBulkWriteOperation[] = [];
  let malformedMessageCount = 0;

  for (const row of latestMessageRows) {
    const message = row.message as Record<string, any>;

    try {
      const preview = getChatMessagePreviewText(message);
      const createdAt =
        message.createdAt instanceof Date
          ? message.createdAt
          : new Date(String(message.createdAt ?? ""));

      if (Number.isNaN(createdAt.getTime())) {
        throw new Error("Latest chat message has an invalid creation date.");
      }

      updates.push({
        updateOne: {
          filter: { _id: row._id },
          update: {
            $set: {
              lastMessagePreview: preview,
              lastMessageAt: createdAt,
              lastMessageId: message._id,
              lastMessage: preview,
              time: formatChatPreviewTime(createdAt),
            },
          },
        },
      });
    } catch (error) {
      malformedMessageCount += 1;
      console.warn(
        `Skipping malformed latest chat message ${String(message._id ?? "")}.`,
        error,
      );
    }
  }

  console.log(
    `Chat preview migration found ${chatCount} chats, ${latestMessageRows.length} chats with messages, and ${malformedMessageCount} malformed latest messages.`,
  );

  if (!shouldApply) {
    console.log(
      `Preview only. ${updates.length} chats can be updated. Run \`npm run migrate:chat-previews:apply\` to apply it.`,
    );
    return;
  }

  if (updates.length > 0) {
    const result = await ChatModel.collection.bulkWrite(updates);
    console.log(`Chat preview migration updated ${result.modifiedCount} chats.`);
  } else {
    console.log("Chat preview migration had no chats to update.");
  }
}

migrateChatPreviews()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
