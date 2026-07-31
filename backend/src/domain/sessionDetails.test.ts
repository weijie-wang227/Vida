import assert from "node:assert/strict";
import test from "node:test";
import {
  makeVolunteerSessionFree,
  readSessionDetails,
  validateSessionDetails,
} from "./sessionDetails.js";

const validInput = {
  title: "Sunrise Stretch",
  instructor: "Alicia",
  startsAt: "2026-08-01T01:00:00.000Z",
  endAt: "2026-08-01T02:00:00.000Z",
  location: "Vida Studio",
  lat: 1.3521,
  lng: 103.8198,
  spots: 10,
  priceSgd: 8,
  isPremium: true,
  skillsFuturePayable: false,
};

test("validates editable session details and payment ownership", () => {
  assert.equal(validateSessionDetails(readSessionDetails(validInput)), null);
  assert.equal(
    validateSessionDetails(
      readSessionDetails({ ...validInput, title: "", priceSgd: 0 }),
    ),
    "Session title is required.",
  );
  assert.equal(
    validateSessionDetails(
      readSessionDetails({
        ...validInput,
        isPremium: true,
        skillsFuturePayable: true,
      }),
    ),
    "Choose only one paid session type.",
  );
});

test("rejects missing and sub-minimum paid prices", () => {
  assert.equal(
    validateSessionDetails(readSessionDetails({ ...validInput, priceSgd: undefined })),
    "Session price cannot be negative.",
  );
  assert.equal(
    validateSessionDetails(readSessionDetails({ ...validInput, priceSgd: 0.2 })),
    "Paid sessions must cost at least S$0.30.",
  );
});

test("prevents capacity from dropping below current registrations", () => {
  assert.equal(
    validateSessionDetails(readSessionDetails(validInput), 11),
    "Session spots cannot be lower than the 11 existing registrations.",
  );
});

test("volunteer sessions are normalized to free", () => {
  assert.deepEqual(
    makeVolunteerSessionFree(readSessionDetails(validInput)),
    {
      ...readSessionDetails(validInput),
      priceSgd: 0,
      isPremium: false,
      skillsFuturePayable: false,
    },
  );
});
