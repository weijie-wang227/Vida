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
