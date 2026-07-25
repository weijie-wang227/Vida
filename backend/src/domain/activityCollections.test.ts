import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivityCollectionFilters,
  isActivityCollectionType,
} from "./activityCollections.js";

test("activity collections filter activity-owned fields", () => {
  assert.deepEqual(getActivityCollectionFilters("free"), {
    isPremium: false,
    credits: 0,
  });
  assert.deepEqual(getActivityCollectionFilters("premium"), {
    isPremium: true,
  });
  assert.deepEqual(getActivityCollectionFilters("skillsfuture"), {
    skillsFuturePayable: true,
  });
  assert.deepEqual(getActivityCollectionFilters("volunteer"), {
    isVolunteer: true,
  });
  assert.deepEqual(getActivityCollectionFilters("aac"), {
    isAAC: true,
  });
});

test("unknown activity collections are rejected", () => {
  assert.equal(isActivityCollectionType("premium"), true);
  assert.equal(isActivityCollectionType("unknown"), false);
});
