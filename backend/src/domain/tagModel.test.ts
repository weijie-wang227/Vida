import assert from "node:assert/strict";
import test from "node:test";
import { TagModel } from "../models/VidaData.js";

test("tags include an image URL with a safe default", () => {
  const tag = new TagModel({ name: "Guided" });

  assert.ok(TagModel.schema.path("imageUrl"));
  assert.equal(tag.imageUrl, "");
});
