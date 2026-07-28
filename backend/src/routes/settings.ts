import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  SettingsModel,
  type SettingsPreferences,
} from "../models/VidaData.js";

const router = Router();

const defaultSettingsPreferences: SettingsPreferences = {
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

// Returns settings and preferences for the signed-in user.
router.get("/", requireAuth, async (_req, res) => {
  const authUser = res.locals.user;
  const settings = await findOrCreateSettings(authUser._id);

  res.json({ preferences: serializePreferences(settings) });
});

// Replaces settings and preferences for the signed-in user.
router.put("/", requireAuth, async (req, res, next) => {
  try {
    const authUser = res.locals.user;
    const settings = await findOrCreateSettings(authUser._id);
    const currentPreferences = serializePreferences(settings);
    const body = isRecord(req.body) ? req.body : {};
    const requestedPreferences = isRecord(body.preferences)
      ? body.preferences
      : body;
    const preferences: SettingsPreferences = {
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
