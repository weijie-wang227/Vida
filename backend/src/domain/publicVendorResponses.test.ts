import assert from "node:assert/strict";
import test from "node:test";
import {
  serializeActivity,
  serializePrivateSession,
  serializePublicSession,
  serializePublicVendor,
  serializePublicVendorActivity,
  serializePublicVendorSession,
} from "../serializers.js";
import { publicOpenSessionFilter } from "./sessionVisibility.js";

function assertOmitsFields(
  value: Record<string, unknown>,
  forbiddenFields: string[],
) {
  for (const field of forbiddenFields) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(value, field),
      false,
      `Expected public response to omit ${field}`,
    );
  }
}

const session = {
  _id: "session-object-id",
  mockId: 42,
  activity: { _id: "activity-object-id", mockId: 7 },
  chat: { _id: "chat-object-id", mockId: 9 },
  title: "Morning Movement",
  instructor: "Alicia",
  startsAt: new Date("2026-08-10T01:00:00.000Z"),
  endAt: new Date("2026-08-10T02:00:00.000Z"),
  spots: 20,
  priceSgd: 15,
  grossRevenueMinor: 12_500,
  pendingPaymentCount: 3,
  registeredCount: 12,
  attendedCount: 10,
  isPremium: true,
  skillsFuturePayable: false,
  isOpen: true,
  isActive: true,
  location: "Vida Studio",
  lat: 1.3,
  lng: 103.8,
};

test("public vendor profile exposes only profile fields", () => {
  const response = serializePublicVendor({
    _id: "vendor-object-id",
    name: "Vida Partner",
    profileUrl: "https://example.com/vendor.png",
    description: "Community activities",
    numAttended: 400,
    allEvents: ["activity-object-id"],
  });

  assert.deepEqual(Object.keys(response).sort(), [
    "description",
    "id",
    "name",
    "profileUrl",
  ]);
});

test("public vendor activity and session summaries omit business metrics", () => {
  const activity = serializePublicVendorActivity(
    {
      _id: "activity-object-id",
      title: "Morning Movement",
      description: "A gentle class",
      suitability: "All levels",
      categories: ["physical"],
      imageUrls: ["https://example.com/activity.png"],
      tags: [{ name: "Wellness" }],
      isVolunteer: false,
      registeredCount: 12,
      attendedCount: 10,
      totalRevenue: 125,
      grossRevenueMinor: 12_500,
    },
    4.8,
  );
  const sessionSummary = serializePublicVendorSession(session, 4.8);

  assertOmitsFields(activity, [
    "registeredCount",
    "attendedCount",
    "totalRevenue",
    "grossRevenueMinor",
  ]);
  assertOmitsFields(sessionSummary, [
    "registeredCount",
    "attendedCount",
    "grossRevenueMinor",
    "pendingPaymentCount",
    "isOpen",
    "isActive",
  ]);
});

test("public and private session serializers have distinct metric contracts", () => {
  const publicSession = serializePublicSession(session);
  const privateSession = serializePrivateSession(session);

  assertOmitsFields(publicSession, [
    "grossRevenueMinor",
    "pendingPaymentCount",
    "attendedCount",
  ]);
  assert.equal(publicSession.registeredCount, 12);
  assert.equal(privateSession.grossRevenueMinor, 12_500);
  assert.equal(privateSession.pendingPaymentCount, 3);
  assert.equal(privateSession.attendedCount, 10);
});

test("activities nest the public session contract", () => {
  const activity = serializeActivity({
    _id: "activity-object-id",
    mockId: 7,
    title: "Morning Movement",
    host: { _id: "vendor-object-id", name: "Vida Partner" },
    sessions: [session],
  });
  const nestedSession = activity.sessions[0] as Record<string, unknown>;

  assertOmitsFields(nestedSession, [
    "grossRevenueMinor",
    "pendingPaymentCount",
    "attendedCount",
  ]);
});

test("public vendor queries require sessions to be open and active", () => {
  assert.deepEqual(publicOpenSessionFilter, {
    isOpen: true,
    isActive: true,
  });
});
