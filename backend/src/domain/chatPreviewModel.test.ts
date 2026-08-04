import assert from "node:assert/strict";
import test from "node:test";
import { ChatMessageModel, ChatModel } from "../models/VidaData.js";
import { getStoredChatPreview } from "../services/chatPreviews.js";

test("chats persist an authoritative structured last-message preview", () => {
  for (const field of [
    "lastMessagePreview",
    "lastMessageAt",
    "lastMessageId",
  ]) {
    assert.notEqual(ChatModel.schema.path(field), undefined);
  }
});

test("latest-message lookups have a stable compound index", () => {
  const indexes = ChatMessageModel.schema.indexes();
  const latestMessageIndex = indexes.find((indexDefinition: any) => {
    const [fields] = indexDefinition as [Record<string, number>];

    return fields.chat === 1 && fields.createdAt === -1 && fields._id === -1;
  });

  assert.ok(latestMessageIndex);
});

test("stored chat previews format their structured timestamp at read time", () => {
  const preview = getStoredChatPreview({
    lastMessagePreview: "Vida Vendor: Hello",
    lastMessageAt: new Date("2026-08-03T03:45:00.000Z"),
  });

  assert.equal(preview.lastMessage, "Vida Vendor: Hello");
  assert.notEqual(preview.time, "");
});

test("stored chat previews retain legacy metadata until backfill", () => {
  const preview = getStoredChatPreview({
    lastMessagePreview: "",
    lastMessage: "Legacy preview",
    time: "10:30 AM",
  });

  assert.deepEqual(preview, {
    lastMessage: "Legacy preview",
    time: "10:30 AM",
  });
});
