import { Router } from "express";
import { findAuthenticatedUser } from "../auth.js";
import {
  SettingsModel,
  type SettingsPreferences,
} from "../models/VidaData.js";

const router = Router();

const defaultSettingsPreferences: SettingsPreferences = {
  appearance: "dark",
  activityReminders: true,
  friendDiscovery: true,
  privateActivityHistory: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializePreferences(settings: Record<string, any> | null | undefined) {
  const preferences = settings?.preferences ?? {};

  return {
    appearance:
      preferences.appearance === "light"
        ? "light"
        : defaultSettingsPreferences.appearance,
    activityReminders:
      preferences.activityReminders ?? defaultSettingsPreferences.activityReminders,
    friendDiscovery:
      preferences.friendDiscovery ?? defaultSettingsPreferences.friendDiscovery,
    privateActivityHistory:
      preferences.privateActivityHistory ??
      defaultSettingsPreferences.privateActivityHistory,
  };
}

function readBoolean(
  value: unknown,
  fallback: boolean,
  field: keyof SettingsPreferences,
) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${field} must be true or false.`);
  }

  return value;
}

async function findOrCreateSettings(userId: unknown) {
  return SettingsModel.findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        preferences: defaultSettingsPreferences,
      },
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );
}

router.get("/", async (req, res) => {
  const authUser = await findAuthenticatedUser(req.headers.authorization);

  if (!authUser) {
    res.status(401).json({ message: "Not signed in." });
    return;
  }

  const settings = await findOrCreateSettings(authUser._id);

  res.json({ preferences: serializePreferences(settings) });
});

router.put("/", async (req, res, next) => {
  try {
    const authUser = await findAuthenticatedUser(req.headers.authorization);

    if (!authUser) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const settings = await findOrCreateSettings(authUser._id);
    const currentPreferences = serializePreferences(settings);
    const body = isRecord(req.body) ? req.body : {};
    const requestedPreferences = isRecord(body.preferences)
      ? body.preferences
      : body;
    const requestedAppearance = requestedPreferences.appearance;

    if (
      requestedAppearance !== undefined &&
      requestedAppearance !== "light" &&
      requestedAppearance !== "dark"
    ) {
      res.status(400).json({ message: "Appearance must be light or dark." });
      return;
    }

    const preferences: SettingsPreferences = {
      appearance: requestedAppearance ?? currentPreferences.appearance,
      activityReminders: readBoolean(
        requestedPreferences.activityReminders,
        currentPreferences.activityReminders,
        "activityReminders",
      ),
      friendDiscovery: readBoolean(
        requestedPreferences.friendDiscovery,
        currentPreferences.friendDiscovery,
        "friendDiscovery",
      ),
      privateActivityHistory: readBoolean(
        requestedPreferences.privateActivityHistory,
        currentPreferences.privateActivityHistory,
        "privateActivityHistory",
      ),
    };

    const updatedSettings = await SettingsModel.findOneAndUpdate(
      { user: authUser._id },
      {
        $set: {
          preferences,
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

    res.json({ preferences: serializePreferences(updatedSettings) });
  } catch (error) {
    if (error instanceof Error && error.message.endsWith("must be true or false.")) {
      res.status(400).json({ message: error.message });
      return;
    }

    next(error);
  }
});

export default router;
