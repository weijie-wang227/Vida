import assert from "node:assert/strict";
import test from "node:test";
import {
  countsAsAttendance,
  countsAsRegistration,
  getAttendanceCounterDelta,
  getRegistrationCounterDelta,
  resolveAttendanceStatus,
} from "./sessionParticipation.js";

test("only participant records consume capacity", () => {
  assert.equal(countsAsRegistration("registered"), true);
  assert.equal(countsAsRegistration("approved"), true);
  assert.equal(countsAsRegistration("rejected"), false);
  assert.equal(countsAsRegistration("attended"), true);
  assert.equal(countsAsRegistration("no_show"), true);
  assert.equal(countsAsRegistration("cancelled"), false);
  assert.equal(countsAsRegistration("registered", "organizer"), false);
});

test("volunteer review statuses adjust capacity only when required", () => {
  assert.equal(getRegistrationCounterDelta("registered", "approved"), 0);
  assert.equal(getRegistrationCounterDelta("registered", "rejected"), -1);
  assert.equal(getRegistrationCounterDelta("rejected", "approved"), 1);
});

test("attendance counters change only when entering or leaving attended", () => {
  assert.equal(getAttendanceCounterDelta("registered", "attended"), 1);
  assert.equal(getAttendanceCounterDelta("no_show", "attended"), 1);
  assert.equal(getAttendanceCounterDelta("attended", "no_show"), -1);
  assert.equal(getAttendanceCounterDelta("attended", "registered"), -1);
  assert.equal(getAttendanceCounterDelta("registered", "no_show"), 0);
  assert.equal(countsAsAttendance("attended"), true);
  assert.equal(countsAsAttendance("attended", "organizer"), false);
});

test("attendance input accepts only explicit mutable states", () => {
  assert.equal(resolveAttendanceStatus("attended"), "attended");
  assert.equal(resolveAttendanceStatus("no_show"), "no_show");
  assert.equal(resolveAttendanceStatus("registered"), "registered");
  assert.equal(resolveAttendanceStatus("cancelled"), null);
  assert.equal(resolveAttendanceStatus(false), null);
});
