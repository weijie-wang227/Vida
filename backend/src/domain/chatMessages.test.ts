import assert from "node:assert/strict";
import test from "node:test";
import {
  ChatMessagePayloadError,
  getChatMessagePreviewText,
  normalizeChatMessagePayload,
} from "./chatMessages.js";
import { ChatMessageModel, PollVoteModel } from "../models/VidaData.js";

test("text messages normalize into a payload without legacy fields", () => {
  assert.deepEqual(
    normalizeChatMessagePayload("text", { text: "  Hello group  " }),
    { text: "Hello group" },
  );
  assert.equal(ChatMessageModel.schema.path("payload") !== undefined, true);
  assert.equal(ChatMessageModel.schema.path("schemaVersion") !== undefined, true);
  assert.equal(ChatMessageModel.schema.path("body"), undefined);
  assert.equal(ChatMessageModel.schema.path("activity"), undefined);
  assert.equal(ChatMessageModel.schema.path("session"), undefined);
});

test("poll messages require unique options and assign stable option ids", () => {
  const payload = normalizeChatMessagePayload("poll", {
    question: "Which time works?",
    options: ["Morning", "Afternoon"],
  });

  assert.equal(payload.options.length, 2);
  assert.equal(payload.options[0].label, "Morning");
  assert.notEqual(payload.options[0].id, payload.options[1].id);
  assert.equal(payload.allowsMultiple, false);

  assert.throws(
    () =>
      normalizeChatMessagePayload("poll", {
        question: "Choose one",
        options: ["Same", "same"],
      }),
    ChatMessagePayloadError,
  );
});

test("message previews are dispatched through the type handler", () => {
  assert.equal(
    getChatMessagePreviewText({
      type: "poll",
      sender: { name: "Vida Vendor" },
      payload: {
        question: "Pick a date",
        options: [
          { id: "one", label: "Monday" },
          { id: "two", label: "Tuesday" },
        ],
      },
    }),
    "Vida Vendor created a poll: Pick a date",
  );
});

test("poll votes enforce one ballot per user and message", () => {
  const indexes = PollVoteModel.schema.indexes();
  const uniqueVoteIndex = indexes.find((indexDefinition: any) => {
    const [fields, options] = indexDefinition as [
      Record<string, number>,
      Record<string, any>,
    ];

    return fields.message === 1 && fields.user === 1 && options.unique === true;
  });

  assert.ok(uniqueVoteIndex);
});
