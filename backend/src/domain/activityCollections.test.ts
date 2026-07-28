import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivityCollectionFilters,
  isActivityCollectionType,
} from "./activityCollections.js";

test("activity collections filter activity-owned fields", () => {
  assert.deepEqual(getActivityCollectionFilters("free"), {
    activityFilter: {},
    sessionFilter: {
      isPremium: false,
      skillsFuturePayable: false,
      credits: 0,
    },
  });
  assert.deepEqual(getActivityCollectionFilters("premium"), {
    activityFilter: {},
    sessionFilter: { isPremium: true },
  });
  assert.deepEqual(getActivityCollectionFilters("skillsfuture"), {
    activityFilter: {},
    sessionFilter: { skillsFuturePayable: true },
  });
  assert.deepEqual(getActivityCollectionFilters("volunteer"), {
    activityFilter: { isVolunteer: true },
    sessionFilter: {},
  });
  assert.deepEqual(getActivityCollectionFilters("aac"), {
    activityFilter: { isAAC: true },
    sessionFilter: {},
  });
});

test("unknown activity collections are rejected", () => {
  assert.equal(isActivityCollectionType("premium"), true);
  assert.equal(isActivityCollectionType("unknown"), false);
});
