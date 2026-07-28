import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { SessionModel } from "../models/VidaData.js";
import { formatSessionChatName } from "../utils/date.js";

test("sessions persist their own title and payment details", () => {
  for (const field of [
    "title",
    "credits",
    "isPremium",
    "skillsFuturePayable",
  ]) {
    assert.notEqual(SessionModel.schema.path(field), undefined);
  }
});

test("sessions persist an end time instead of a duration", () => {
  assert.notEqual(SessionModel.schema.path("endAt"), undefined);
  assert.equal(SessionModel.schema.path("duration"), undefined);
});

test("session end time must be at least 15 minutes after its start time", async () => {
  const startsAt = new Date("2026-08-01T01:00:00.000Z");
  const session = {
    mockId: 1,
    activity: new Types.ObjectId(),
    title: "Morning Yoga",
    startsAt,
    spots: 10,
    credits: 0,
    isPremium: false,
    skillsFuturePayable: false,
    registeredCount: 0,
    attendedCount: 0,
    chat: new Types.ObjectId(),
    isOpen: true,
    isActive: true,
    location: "Vida Studio",
    lat: 1.3521,
    lng: 103.8198,
  };

  await assert.rejects(
    SessionModel.validate({
      ...session,
      endAt: new Date(startsAt.getTime() + 14 * 60 * 1000),
    }),
    (error: any) => Boolean(error?.errors?.endAt),
  );
  await assert.doesNotReject(
    SessionModel.validate({
      ...session,
      endAt: new Date(startsAt.getTime() + 15 * 60 * 1000),
    }),
  );
});

test("new session chats use the session title", () => {
  assert.equal(formatSessionChatName("Saturday Morning Yoga"), "Saturday Morning Yoga");
});
