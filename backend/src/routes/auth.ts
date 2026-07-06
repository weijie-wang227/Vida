import { Router } from "express";
import {
  createAuthToken,
  createAvatarUrl,
  createPasswordRecord,
  findAuthenticatedUser,
  isValidEmail,
  normalizeEmail,
  normalizeHandle,
  verifyPassword,
} from "../auth.js";
import { UserModel } from "../models/VidaData.js";
import { serializeAuthUser } from "../serializers.js";

const router = Router();

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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
      res.status(400).json({ message: "Name is required." });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ message: "A valid email is required." });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters." });
      return;
    }

    const existingUser = await UserModel.findOne({ email }).select(
      "+passwordHash +passwordSalt",
    );

    if (existingUser) {
      res.status(409).json({ message: "An account already exists for this email." });
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

router.post("/signin", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = getString(req.body?.password);

    if (!isValidEmail(email) || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await UserModel.findOne({ email }).select(
      "+passwordHash +passwordSalt",
    );

    if (!user || !verifyPassword(password, user)) {
      res.status(401).json({ message: "Invalid email or password." });
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

router.get("/me", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    res.json({ user: serializeAuthUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
