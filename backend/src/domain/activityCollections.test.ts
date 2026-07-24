import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivityCollectionFilters,
  isActivityCollectionType,
} from "./activityCollections.js";

test("activity collections separate session and activity filters", () => {
  assert.deepEqual(getActivityCollectionFilters("free"), {
    sessionFilter: { isPremium: false, credits: 0 },
    activityFilter: {},
  });
  assert.deepEqual(getActivityCollectionFilters("premium"), {
    sessionFilter: { isPremium: true },
    activityFilter: {},
  });
  assert.deepEqual(getActivityCollectionFilters("skillsfuture"), {
    sessionFilter: { skillsFuturePayable: true },
    activityFilter: {},
  });
  assert.deepEqual(getActivityCollectionFilters("volunteer"), {
    sessionFilter: {},
    activityFilter: { isVolunteer: true },
  });
  assert.deepEqual(getActivityCollectionFilters("aac"), {
    sessionFilter: {},
    activityFilter: { isAAC: true },
  });
});

test("unknown activity collections are rejected", () => {
  assert.equal(isActivityCollectionType("premium"), true);
  assert.equal(isActivityCollectionType("unknown"), false);
});
