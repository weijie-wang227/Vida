import { randomUUID } from "node:crypto";

export const chatMessageTypes = ["text", "activity_invite", "poll"] as const;
export type ChatMessageType = (typeof chatMessageTypes)[number];

export type TextMessagePayload = {
  text: string;
};

export type ActivityInviteMessagePayload = {
  activity: {
    id: number | string;
    title: string;
    startsAt: string;
    location: string;
    durationMinutes: number;
    credits: number;
    categories: string[];
  };
  session: {
    id: number | string;
    objectId: string;
  };
};

export type PollMessagePayload = {
  question: string;
  options: Array<{
    id: string;
    label: string;
  }>;
  allowsMultiple: false;
};

export type StoredMessagePayload =
  | TextMessagePayload
  | ActivityInviteMessagePayload
  | PollMessagePayload;

export class ChatMessagePayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatMessagePayloadError";
  }
}

type MessageHandler<TPayload extends StoredMessagePayload> = {
  normalize: (value: unknown) => TPayload;
  preview: (payload: TPayload, senderName: string) => string;
};

function asRecord(value: unknown): Record<string, any> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, any>)
    : {};
}

function requiredString(value: unknown, field: string, maxLength: number) {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    throw new ChatMessagePayloadError(`${field} is required.`);
  }

  if (text.length > maxLength) {
    throw new ChatMessagePayloadError(
      `${field} must be ${maxLength} characters or less.`,
    );
  }

  return text;
}

function finiteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

const textHandler: MessageHandler<TextMessagePayload> = {
  normalize(value) {
    const input = asRecord(value);

    return { text: requiredString(input.text, "Message", 1000) };
  },
  preview(payload, senderName) {
    return `${senderName}: ${payload.text}`;
  },
};

const activityInviteHandler: MessageHandler<ActivityInviteMessagePayload> = {
  normalize(value) {
    const input = asRecord(value);
    const activity = asRecord(input.activity);
    const session = asRecord(input.session);
    const categories = Array.isArray(activity.categories)
      ? activity.categories.map(String).filter(Boolean)
      : [];

    return {
      activity: {
        id: activity.id,
        title: requiredString(activity.title, "Activity title", 200),
        startsAt: requiredString(activity.startsAt, "Session start", 100),
        location: requiredString(activity.location, "Session location", 300),
        durationMinutes: finiteNumber(activity.durationMinutes),
        credits: finiteNumber(activity.credits),
        categories,
      },
      session: {
        id: session.id,
        objectId: requiredString(session.objectId, "Session ID", 100),
      },
    };
  },
  preview(payload) {
    return `Activity invite: ${payload.activity.title}`;
  },
};

const pollHandler: MessageHandler<PollMessagePayload> = {
  normalize(value) {
    const input = asRecord(value);
    const question = requiredString(input.question, "Poll question", 200);
    const rawOptions = Array.isArray(input.options) ? input.options : [];

    if (rawOptions.length < 2 || rawOptions.length > 6) {
      throw new ChatMessagePayloadError("A poll must have between 2 and 6 options.");
    }

    const labels = rawOptions.map((option) => {
      const item = asRecord(option);

      return requiredString(item.label ?? option, "Poll option", 100);
    });
    const uniqueLabels = new Set(labels.map((label) => label.toLocaleLowerCase()));

    if (uniqueLabels.size !== labels.length) {
      throw new ChatMessagePayloadError("Poll options must be unique.");
    }

    return {
      question,
      options: labels.map((label, index) => {
        const existingId = asRecord(rawOptions[index]).id;

        return {
          id:
            typeof existingId === "string" && existingId.trim()
              ? existingId.trim()
              : randomUUID(),
          label,
        };
      }),
      allowsMultiple: false,
    };
  },
  preview(payload, senderName) {
    return `${senderName} created a poll: ${payload.question}`;
  },
};

export const chatMessageHandlers = {
  text: textHandler,
  activity_invite: activityInviteHandler,
  poll: pollHandler,
};

export function getChatMessageType(value: unknown): ChatMessageType {
  if (!chatMessageTypes.includes(value as ChatMessageType)) {
    throw new ChatMessagePayloadError("Unsupported message type.");
  }

  return value as ChatMessageType;
}

export function normalizeChatMessagePayload(
  type: "text",
  value: unknown,
): TextMessagePayload;
export function normalizeChatMessagePayload(
  type: "activity_invite",
  value: unknown,
): ActivityInviteMessagePayload;
export function normalizeChatMessagePayload(
  type: "poll",
  value: unknown,
): PollMessagePayload;
export function normalizeChatMessagePayload(
  type: ChatMessageType,
  value: unknown,
): StoredMessagePayload {
  return chatMessageHandlers[type].normalize(value as never);
}

export function getChatMessagePreviewText(message: Record<string, any>) {
  const type = getChatMessageType(message.type);
  const sender = asRecord(message.sender);
  const senderName = String(sender.name ?? "Unknown user");
  const payload = normalizeChatMessagePayload(type as never, message.payload);
  const handler = chatMessageHandlers[type] as MessageHandler<StoredMessagePayload>;

  return handler.preview(payload, senderName);
}
