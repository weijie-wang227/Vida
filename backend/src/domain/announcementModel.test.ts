import assert from "node:assert/strict";
import test from "node:test";
import {
  AnnouncementModel,
  AnnouncementVoteModel,
} from "../models/VidaData.js";
import {
  AnnouncementPayloadError,
  canPublishAnnouncementToSession,
  normalizeAnnouncementPoll,
} from "./announcements.js";
import { serializeAnnouncement } from "../services/announcementResponses.js";

test("announcements reference sessions and chats and store chat-sized text content", () => {
  assert.equal(
    AnnouncementModel.schema.path("sessionId")?.options.ref,
    "Session",
  );
  assert.equal(
    AnnouncementModel.schema.path("chatId")?.options.ref,
    "Chat",
  );
  assert.equal(
    AnnouncementModel.schema.path("chatId")?.options.required,
    true,
  );
  assert.equal(
    AnnouncementModel.schema.path("content")?.options.maxlength,
    1000,
  );
  assert.equal(AnnouncementModel.schema.path("createdAt") !== undefined, true);
});

test("announcement responses include their direct chat link", () => {
  assert.deepEqual(
    serializeAnnouncement(
      {
        _id: "announcement-1",
        sessionId: "session-1",
        chatId: "chat-1",
        type: "message",
        content: "Session update",
        createdAt: new Date("2026-07-29T00:00:00.000Z"),
      },
      undefined,
      { _id: "chat-1", mockId: 42 },
    ),
    {
      id: "announcement-1",
      sessionId: "session-1",
      chatId: "chat-1",
      groupId: 42,
      type: "message",
      content: "Session update",
      createdAt: "2026-07-29T00:00:00.000Z",
    },
  );
});

test("announcement polls normalize unique options with stable ids", () => {
  assert.deepEqual(
    normalizeAnnouncementPoll({
      question: "  Which time works? ",
      options: ["Morning", "Afternoon"],
    }),
    {
      question: "Which time works?",
      poll: {
        options: [
          { id: "option-1", label: "Morning" },
          { id: "option-2", label: "Afternoon" },
        ],
        allowsMultiple: false,
      },
    },
  );

  assert.throws(
    () =>
      normalizeAnnouncementPoll({
        question: "Choose",
        options: ["Same", " same "],
      }),
    AnnouncementPayloadError,
  );
});

test("announcement votes store one replaceable ballot per user and poll", () => {
  assert.equal(
    AnnouncementVoteModel.schema.path("announcementId")?.options.ref,
    "Announcement",
  );

  const uniqueVoteIndex = AnnouncementVoteModel.schema
    .indexes()
    .find((index: any) => {
      const [fields] = index;

      return (
        fields.announcementId === 1 &&
        fields.userId === 1
      );
    });

  assert.ok(uniqueVoteIndex);
  assert.equal(uniqueVoteIndex[1]?.unique, true);
  assert.equal(
    AnnouncementVoteModel.schema.path("optionId") !== undefined,
    true,
  );
});

test("announcements can only be published to active sessions", () => {
  assert.equal(canPublishAnnouncementToSession({ isActive: true }), true);
  assert.equal(canPublishAnnouncementToSession({}), true);
  assert.equal(canPublishAnnouncementToSession({ isActive: false }), false);
});
