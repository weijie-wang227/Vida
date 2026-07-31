import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { SettingsModel } from "../models/VidaData.js";

test("settings keep only server-authoritative preferences", async () => {
  const settings = new SettingsModel({
    user: new Types.ObjectId(),
    preferences: {
      appearance: "light",
      activityReminders: false,
      friendDiscovery: false,
      privateActivityHistory: true,
    },
  });

  assert.equal(SettingsModel.schema.path("preferences.appearance"), undefined);
  assert.equal("appearance" in settings.preferences, false);
  assert.equal(settings.preferences.activityReminders, false);
  assert.equal(settings.preferences.friendDiscovery, false);
  assert.equal(settings.preferences.privateActivityHistory, true);
  await settings.validate();
});

test("settings provide defaults for server-authoritative preferences", async () => {
  const settings = new SettingsModel({
    user: new Types.ObjectId(),
  });

  assert.equal(settings.preferences.activityReminders, true);
  assert.equal(settings.preferences.friendDiscovery, true);
  assert.equal(settings.preferences.privateActivityHistory, false);
  await settings.validate();
});
