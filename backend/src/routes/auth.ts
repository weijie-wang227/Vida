import { Router } from "express";
import {
  createAuthToken,
  createAvatarUrl,
  createPasswordRecord,
  isValidEmail,
  normalizeEmail,
  normalizeHandle,
  verifyPassword,
} from "../services/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/VidaData.js";
import { serializeAuthUser } from "../serializers.js";
import {
  GoogleAuthError,
  isGoogleProfilePictureUrl,
  verifyGoogleCredential,
} from "../services/googleAuth.js";
import { getString } from "../utils/input.js";

const router = Router();
async function nextMockId() {
  const lastUser = await UserModel.findOne().sort({ mockId: -1 }).select("mockId");

  return (lastUser?.mockId ?? 0) + 1;
}

async function uniqueHandle(handle: string) {
  let candidate = handle;
  let suffix = 2;

  while (await UserModel.exists({ handle: candidate })) {
    const suffixText = String(suffix);
    candidate = `${handle.slice(0, 24 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

// Creates a user account and returns an auth token for the new session.
router.post("/signup", async (req, res, next) => {
  try {
    const name = getString(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const password = getString(req.body?.password);
    const requestedHandle = normalizeHandle(
      req.body?.handle,
      name || email.split("@")[0],
    );

    if (!name) {
      res.status(400).json({ message: "Enter your name to create an account." });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ message: "Enter a valid email address." });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        message: "Choose a password with at least 8 characters.",
      });
      return;
    }

    const existingUser = await UserModel.findOne({ email }).select(
      "+passwordHash +passwordSalt",
    );

    if (existingUser) {
      res.status(409).json({
        message:
          "There is already a Vida account with this email. Try signing in instead.",
      });
      return;
    }

    const user = await UserModel.create({
      mockId: await nextMockId(),
      name,
      handle: await uniqueHandle(requestedHandle),
      email,
      avatarUrl: createAvatarUrl(name, email),
      bio: "Ready to meet new people and try something new.",
      stats: [
        { value: "0", label: "Activities" },
        { value: "0", label: "Friends" },
        { value: "0", label: "Posts" },
      ],
      ...createPasswordRecord(password),
    });
    res.status(201).json({
      token: createAuthToken(user),
      user: serializeAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// Signs in an existing user and returns an auth token.
router.post("/signin", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = getString(req.body?.password);

    if (!isValidEmail(email) || !password) {
      res.status(400).json({
        message: "Enter your email and password to continue.",
      });
      return;
    }

    const user = await UserModel.findOne({ email }).select(
      "+passwordHash +passwordSalt",
    );

    if (!user || !verifyPassword(password, user)) {
      res.status(401).json({
        message:
          "We could not sign you in. Check your email and password, then try again.",
      });
      return;
    }

    res.json({
      token: createAuthToken(user),
      user: serializeAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// Verifies a Google account and returns a normal Vida auth token.
router.post("/google", async (req, res, next) => {
  try {
    const credential = getString(req.body?.credential);
    const password = getString(req.body?.password);

    if (!credential) {
      res.status(400).json({
        message: "Google sign-in did not complete. Please try again.",
      });
      return;
    }

    const identity = await verifyGoogleCredential(credential);
    let user = await UserModel.findOne({
      googleSubject: identity.subject,
    }).select("+googleSubject");

    if (!user) {
      const existingUser = await UserModel.findOne({
        email: identity.email,
      }).select("+googleSubject +passwordHash +passwordSalt");

      if (existingUser?.googleSubject) {
        res.status(409).json({
          message:
            "This email is connected to a different Google account. Try that Google account or sign in with your Vida password.",
        });
        return;
      }

      if (existingUser && !identity.emailIsAuthoritative) {
        if (!password || !verifyPassword(password, existingUser)) {
          res.status(409).json({
            message:
              "Enter the current Vida password for this email, then try Google sign-in again.",
          });
          return;
        }
      }

      if (existingUser) {
        existingUser.googleSubject = identity.subject;
        await existingUser.save();
        user = existingUser;
      } else {
        user = await UserModel.create({
          mockId: await nextMockId(),
          name: identity.name,
          handle: await uniqueHandle(
            normalizeHandle(undefined, identity.name || identity.email),
          ),
          email: identity.email,
          avatarUrl:
            identity.picture || createAvatarUrl(identity.name, identity.email),
          googleSubject: identity.subject,
          bio: "Ready to meet new people and try something new.",
          stats: [
            { value: "0", label: "Activities" },
            { value: "0", label: "Friends" },
            { value: "0", label: "Posts" },
          ],
        });
      }
    }

    if (
      identity.picture &&
      isGoogleProfilePictureUrl(user.avatarUrl) &&
      user.avatarUrl !== identity.picture
    ) {
      user.avatarUrl = identity.picture;
      await user.save();
    }

    res.json({
      token: createAuthToken(user),
      user: serializeAuthUser(user),
    });
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      res.status(error.kind === "configuration" ? 503 : 401).json({
        message: error.message,
      });
      return;
    }

    next(error);
  }
});

// Returns the currently authenticated user from the request token.
router.get("/me", requireAuth, async (_req, res, next) => {
  try {
    const user = res.locals.user;

    res.json({ user: serializeAuthUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
