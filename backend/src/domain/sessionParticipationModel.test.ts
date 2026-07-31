import assert from "node:assert/strict";
import test from "node:test";
import {
  ActivityModel,
  SessionModel,
  SessionParticipationModel,
} from "../models/VidaData.js";

test("session participations use the current collection name", () => {
  assert.equal(
    SessionParticipationModel.collection.collectionName,
    "sessionParticipations",
  );
});

test("legacy participation counters are not part of current schemas", () => {
  assert.equal(SessionModel.schema.path("joiningCount"), undefined);
  assert.equal(ActivityModel.schema.path("attendeesNum"), undefined);
});

test("session pricing fields are owned by sessions", () => {
  for (const field of ["priceSgd", "isPremium", "skillsFuturePayable"]) {
    assert.equal(ActivityModel.schema.path(field), undefined);
    assert.ok(SessionModel.schema.path(field));
  }
});

test("participations and sessions store immutable SGD minor amounts", async () => {
  const participation = new SessionParticipationModel();
  const session = new SessionModel();

  assert.ok(SessionParticipationModel.schema.path("amountPaidMinor"));
  assert.equal(participation.amountPaidMinor, 0);
  assert.ok(SessionModel.schema.path("grossRevenueMinor"));
  assert.equal(session.grossRevenueMinor, 0);
  assert.ok(SessionModel.schema.path("pendingPaymentCount"));
  assert.equal(session.pendingPaymentCount, 0);

  await assert.rejects(
    SessionParticipationModel.validate(
      { amountPaidMinor: -1 },
      ["amountPaidMinor"],
    ),
    (error: any) => Boolean(error?.errors?.amountPaidMinor),
  );
  await assert.rejects(
    SessionModel.validate({ grossRevenueMinor: -1 }, ["grossRevenueMinor"]),
    (error: any) => Boolean(error?.errors?.grossRevenueMinor),
  );
});

test("activities and sessions expose their new text fields with safe defaults", () => {
  const activity = new ActivityModel();
  const session = new SessionModel();

  assert.ok(ActivityModel.schema.path("suitability"));
  assert.equal(activity.suitability, "");
  assert.ok(SessionModel.schema.path("instructor"));
  assert.equal(session.instructor, "");
});
