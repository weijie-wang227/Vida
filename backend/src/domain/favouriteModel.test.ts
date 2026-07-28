import assert from "node:assert/strict";
import test from "node:test";
import type { IndexDefinition, IndexOptions } from "mongoose";
import { FavouriteModel } from "../models/VidaData.js";

test("favourites store one user with activity references", () => {
  assert.equal(FavouriteModel.collection.collectionName, "favourites");
  assert.equal(FavouriteModel.schema.path("user")?.options.ref, "User");
  assert.equal(
    (FavouriteModel.schema.path("activities") as any)?.embeddedSchemaType?.options
      ?.ref,
    "Activity",
  );
  assert.ok(
    FavouriteModel.schema
      .indexes()
      .some(
        ([fields, options]: [IndexDefinition, IndexOptions]) =>
          fields.user === 1 && options.unique === true,
      ),
  );
});
