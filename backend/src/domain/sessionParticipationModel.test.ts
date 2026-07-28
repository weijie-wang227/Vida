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
  for (const field of ["credits", "isPremium", "skillsFuturePayable"]) {
    assert.equal(ActivityModel.schema.path(field), undefined);
    assert.ok(SessionModel.schema.path(field));
  }
});

test("participations store charged credits and sessions store their aggregate", async () => {
  const participation = new SessionParticipationModel();
  const session = new SessionModel();

  assert.ok(SessionParticipationModel.schema.path("creditsTransaction"));
  assert.equal(participation.creditsTransaction, 0);
  assert.ok(SessionModel.schema.path("creditsAggregate"));
  assert.equal(session.creditsAggregate, 0);

  await assert.rejects(
    SessionParticipationModel.validate(
      { creditsTransaction: -1 },
      ["creditsTransaction"],
    ),
    (error: any) => Boolean(error?.errors?.creditsTransaction),
  );
  await assert.rejects(
    SessionModel.validate({ creditsAggregate: -1 }, ["creditsAggregate"]),
    (error: any) => Boolean(error?.errors?.creditsAggregate),
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
