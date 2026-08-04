import { ChatMessageModel, UserModel } from "../models/VidaData.js";
import { getChatMessagePreviewText } from "../domain/chatMessages.js";
import { asObject } from "../utils/mongoose.js";

type AnyDoc = Record<string, any>;

export type ChatPreview = {
  lastMessage: string;
  time: string;
};

export const emptyChatPreview: ChatPreview = {
  lastMessage: "",
  time: "",
};

export function formatChatPreviewTime(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function previewFromMessage(message: AnyDoc): ChatPreview {
  const item = asObject(message);

  return {
    lastMessage: getChatMessagePreviewText(item),
    time: formatChatPreviewTime(item.createdAt ?? item.updatedAt),
  };
}

export function getStoredChatPreview(chat: AnyDoc): ChatPreview {
  const item = asObject(chat);
  const structuredPreview = String(item.lastMessagePreview ?? "");
  const lastMessage = structuredPreview || String(item.lastMessage ?? "");

  return {
    lastMessage,
    time: item.lastMessageAt
      ? formatChatPreviewTime(item.lastMessageAt)
      : String(item.time ?? ""),
  };
}

export async function getLatestChatPreviews(chats: AnyDoc[]) {
  const chatIds = chats
    .map((chat) => asObject(chat)._id)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  if (chatIds.length === 0) {
    return new Map<string, ChatPreview>();
  }

  const previews = new Map<string, ChatPreview>();
  const chatById = new Map(
    chats.map((chat) => [String(asObject(chat)._id), asObject(chat)]),
  );
  const chatsNeedingFallback = chats.filter((chat) => {
    const item = asObject(chat);

    if (!item.lastMessageAt || !item.lastMessagePreview) {
      return true;
    }

    previews.set(String(item._id), getStoredChatPreview(item));
    return false;
  });
  const fallbackChatIds = chatsNeedingFallback.map((chat) => asObject(chat)._id);
  const latestMessages = fallbackChatIds.length > 0
    ? await ChatMessageModel.aggregate([
        { $match: { chat: { $in: fallbackChatIds } } },
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
      ])
    : [];

  for (const row of latestMessages) {
    const item = asObject(row.message);
    const chatId = String(row._id);

    try {
      previews.set(chatId, previewFromMessage(item));
    } catch (error) {
      console.warn(
        `Skipping malformed chat message ${String(item._id ?? "")}.`,
        error,
      );
    }
  }

  for (const [chatId, chat] of chatById) {
    if (!previews.has(chatId)) {
      previews.set(chatId, getStoredChatPreview(chat));
    }
  }

  return previews;
}

export function getChatPreview(
  previews: Map<string, ChatPreview>,
  chat: AnyDoc,
) {
  return previews.get(String(asObject(chat)._id)) ?? getStoredChatPreview(chat);
}
