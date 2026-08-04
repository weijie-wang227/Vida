import mongoose from "mongoose";
import {
  getChatMessagePreviewText,
  type ChatMessageType,
  type StoredMessagePayload,
} from "../domain/chatMessages.js";
import {
  ChatMessageModel,
  ChatModel,
  type EntityId,
  type UserDocument,
} from "../models/VidaData.js";
import { formatChatPreviewTime } from "./chatPreviews.js";

export class ChatMessageWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatMessageWriteError";
  }
}

export async function createChatMessageWithPreview(input: {
  chatId: EntityId;
  sender: UserDocument;
  type: ChatMessageType;
  payload: StoredMessagePayload;
}) {
  return mongoose.connection.transaction(async (dbSession) => {
    const [message] = await ChatMessageModel.create(
      [
        {
          chat: input.chatId,
          sender: input.sender._id,
          type: input.type,
          schemaVersion: 1,
          payload: input.payload,
        },
      ],
      { session: dbSession },
    );
    const createdAt =
      message.createdAt instanceof Date ? message.createdAt : new Date();
    const preview = getChatMessagePreviewText({
      type: input.type,
      payload: input.payload,
      sender: input.sender,
    });
    const chat = await ChatModel.findByIdAndUpdate(
      input.chatId,
      {
        $set: {
          lastMessagePreview: preview,
          lastMessageAt: createdAt,
          lastMessageId: message._id,
          // Keep legacy fields synchronized until all deployed clients and data
          // have moved to the structured preview fields.
          lastMessage: preview,
          time: formatChatPreviewTime(createdAt),
        },
      },
      { new: true, session: dbSession },
    ).populate("members");

    if (!chat) {
      throw new ChatMessageWriteError("Group not found");
    }

    return { chat, message };
  });
}
