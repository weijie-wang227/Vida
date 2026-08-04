import assert from "node:assert/strict";
import test from "node:test";
import type { IndexDefinition, IndexOptions } from "mongoose";
import { UserModel } from "../models/VidaData.js";
import {
  GoogleAuthError,
  googleIsAuthoritativeForEmail,
  normalizeGooglePictureUrl,
  parseGoogleIdentity,
} from "../services/googleAuth.js";

test("Google identities require a verified email and stable subject", () => {
  assert.deepEqual(
    parseGoogleIdentity({
      sub: "google-user-123",
      email: "Person@Gmail.com",
      email_verified: true,
      name: "Person Name",
      picture: "https://lh3.googleusercontent.com/avatar=s96-c",
    }),
    {
      subject: "google-user-123",
      email: "person@gmail.com",
      name: "Person Name",
      picture: "https://lh3.googleusercontent.com/avatar=s256-c",
      emailIsAuthoritative: true,
    },
  );

  assert.throws(
    () =>
      parseGoogleIdentity({
        sub: "google-user-123",
        email: "person@example.com",
        email_verified: false,
      }),
    GoogleAuthError,
  );
});

test("Google profile pictures request a higher-resolution crop", () => {
  assert.equal(
    normalizeGooglePictureUrl(
      "https://lh3.googleusercontent.com/a/profile-id=s96-c",
    ),
    "https://lh3.googleusercontent.com/a/profile-id=s256-c",
  );
  assert.equal(
    normalizeGooglePictureUrl("https://cdn.example.com/avatar.png"),
    "https://cdn.example.com/avatar.png",
  );
  assert.equal(normalizeGooglePictureUrl("http://example.com/avatar.png"), undefined);
});

test("only Gmail and verified Workspace emails are authoritative for linking", () => {
  assert.equal(
    googleIsAuthoritativeForEmail({
      email: "person@gmail.com",
      email_verified: true,
    }),
    true,
  );
  assert.equal(
    googleIsAuthoritativeForEmail({
      email: "person@company.example",
      email_verified: true,
      hd: "company.example",
    }),
    true,
  );
  assert.equal(
    googleIsAuthoritativeForEmail({
      email: "person@outlook.com",
      email_verified: true,
    }),
    false,
  );
});

test("users store a private, unique Google subject", () => {
  const googleSubject = UserModel.schema.path("googleSubject");

  assert.equal(googleSubject?.options.select, false);
  assert.ok(
    UserModel.schema
      .indexes()
      .some(
        ([fields, options]: [IndexDefinition, IndexOptions]) =>
          fields.googleSubject === 1 &&
          options.unique === true &&
          options.sparse === true,
      ),
  );
});
