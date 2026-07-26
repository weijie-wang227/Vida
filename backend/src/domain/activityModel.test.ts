import assert from "node:assert/strict";
import test from "node:test";
import { Error as MongooseError } from "mongoose";
import { ActivityModel } from "../models/VidaData.js";

test("activity imageUrls defaults to an empty array", async () => {
  const activity = new ActivityModel({
    mockId: 999,
    title: "Test activity",
    categories: ["social"],
  });

  assert.ok(ActivityModel.schema.path("imageUrls"));
  assert.deepEqual(activity.imageUrls, []);
  await activity.validate();
});

test("activity imageUrls accepts no more than five images", async () => {
  const activity = new ActivityModel({
    mockId: 999,
    title: "Test activity",
    categories: ["social"],
    imageUrls: Array.from(
      { length: 6 },
      (_, index) => `https://example.com/${index}.jpg`,
    ),
  });

  const error = await activity.validate().then(
    () => null,
    (validationError: unknown) => validationError,
  );

  assert.ok(error instanceof MongooseError.ValidationError);
  assert.equal(
    error?.errors.imageUrls?.message,
    "An activity can have at most 5 images.",
  );
});
