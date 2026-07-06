import { ChatMessageModel } from "./models/VidaData.js";

type AnyDoc = Record<string, any>;

export type ChatPreview = {
  lastMessage: string;
  time: string;
};

export const emptyChatPreview: ChatPreview = {
  lastMessage: "",
  time: "",
};

function asObject(doc: AnyDoc) {
  return typeof doc.toObject === "function" ? doc.toObject() : doc;
}

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
  const sender = asObject(item.sender ?? {});
  const activity = asObject(item.activity ?? {});
  const isActivityInvite = item.type === "activity_invite";

  return {
    lastMessage: isActivityInvite
      ? `Activity invite: ${activity.title ?? item.body ?? ""}`
      : `${sender.name ?? "Unknown user"}: ${item.body ?? ""}`,
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
    .populate("activity")
    .sort({ createdAt: -1, _id: -1 });
  const previews = new Map<string, ChatPreview>();

  for (const message of messages) {
    const item = asObject(message);
    const chatId = String(item.chat?._id ?? item.chat);

    if (!previews.has(chatId)) {
      previews.set(chatId, previewFromMessage(item));
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
