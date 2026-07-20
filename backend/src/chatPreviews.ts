import { ChatMessageModel } from "./models/VidaData.js";
import { getChatMessagePreviewText } from "./chatMessages.js";
import { asObject } from "./utils/mongoose.js";

type AnyDoc = Record<string, any>;

export type ChatPreview = {
  lastMessage: string;
  time: string;
};

export const emptyChatPreview: ChatPreview = {
  lastMessage: "",
  time: "",
};

function formatPreviewTime(value: unknown) {
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
    time: formatPreviewTime(item.createdAt ?? item.updatedAt),
  };
}

export async function getLatestChatPreviews(chats: AnyDoc[]) {
  const chatIds = chats
    .map((chat) => asObject(chat)._id)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  if (chatIds.length === 0) {
    return new Map<string, ChatPreview>();
  }

  const messages = await ChatMessageModel.find({ chat: { $in: chatIds } })
    .populate("sender")
    .sort({ createdAt: -1, _id: -1 });
  const previews = new Map<string, ChatPreview>();
  const chatById = new Map(
    chats.map((chat) => [String(asObject(chat)._id), asObject(chat)]),
  );

  for (const message of messages) {
    const item = asObject(message);
    const chatId = String(item.chat?._id ?? item.chat);

    if (!previews.has(chatId)) {
      try {
        previews.set(chatId, previewFromMessage(item));
      } catch (error) {
        console.warn(
          `Skipping malformed chat message ${String(item._id ?? "")}.`,
          error,
        );
      }
    }
  }

  for (const [chatId, chat] of chatById) {
    if (!previews.has(chatId) && chat.lastMessage) {
      previews.set(chatId, {
        lastMessage: String(chat.lastMessage),
        time: String(chat.time ?? ""),
      });
    }
  }

  return previews;
}

export function getChatPreview(
  previews: Map<string, ChatPreview>,
  chat: AnyDoc,
) {
  return previews.get(String(asObject(chat)._id)) ?? emptyChatPreview;
}
