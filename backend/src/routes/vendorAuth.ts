import { Router } from "express";
import { requireVendorAccountAuth } from "../middleware/auth.js";
import {
  googleAuthRateLimiter,
  passwordSignInRateLimiters,
  signUpRateLimiter,
} from "../middleware/rateLimits.js";
import { UserModel, VendorAccountModel } from "../models/VidaData.js";
import { serializeVendorAccount } from "../serializers.js";
import {
  createPasswordRecord,
  createVendorAuthToken,
  INVALID_SIGN_IN_MESSAGE,
  isValidEmail,
  normalizeEmail,
  verifyPassword,
  verifyPasswordAndUpgrade,
} from "../services/auth.js";
import {
  GoogleAuthError,
  verifyGoogleCredential,
} from "../services/googleAuth.js";
import { validatePasswordInput } from "../services/passwordPolicy.js";
import { getString } from "../utils/input.js";

const router = Router();
const credentialSelection = "+googleSubject +passwordHash +passwordSalt";

function sendVendorAccountSession(res: any, account: Record<string, any>, status = 200) {
  res.status(status).json({
    token: createVendorAuthToken(account as any),
    account: serializeVendorAccount(account),
  });
}

// Creates a vendor-only login. A matching user may share the same credentials.
router.post("/signup", signUpRateLimiter, async (req, res, next) => {
  try {
    const name = getString(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const passwordValidation = validatePasswordInput(req.body?.password);

    if (!name) {
      res.status(400).json({ message: "Enter your name to create a vendor account." });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ message: "Enter a valid email address." });
      return;
    }

    if (!passwordValidation.ok) {
      res.status(400).json({ message: passwordValidation.message });
      return;
    }

    const password = passwordValidation.password;

    if (await VendorAccountModel.exists({ email })) {
      res.status(409).json({
        message:
          "There is already a vendor account with this email. Try signing in instead.",
      });
      return;
    }

    const sourceUser = await UserModel.findOne({ email }).select(
      credentialSelection,
    );

    if (sourceUser && !(await verifyPassword(password, sourceUser))) {
      res.status(409).json({
        message: sourceUser.passwordHash
          ? "This email belongs to a Vida vendor account. Enter that account's password so both logins can use the same credentials."
          : "This email belongs to a Google-only Vida user account. Continue with Google instead.",
      });
      return;
    }

    const passwordRecord = sourceUser
      ? {
          passwordHash: sourceUser.passwordHash,
          passwordSalt: sourceUser.passwordSalt,
        }
      : await createPasswordRecord(password);
    const account = await VendorAccountModel.create({
      name,
      email,
      googleSubject: sourceUser?.googleSubject,
      ...passwordRecord,
    });

    sendVendorAccountSession(res, account, 201);
  } catch (error) {
    next(error);
  }
});

// Signs in an existing vendor account.
router.post("/signin", ...passwordSignInRateLimiters, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const passwordValidation = validatePasswordInput(req.body?.password);

    if (!passwordValidation.ok) {
      res.status(400).json({ message: passwordValidation.message });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({
        message: "Enter your email and password to continue.",
      });
      return;
    }

    const password = passwordValidation.password;

    const account = await VendorAccountModel.findOne({ email }).select(
      "+passwordHash +passwordSalt",
    );

    if (!account || !(await verifyPasswordAndUpgrade(password, account))) {
      res.status(401).json({
        message: INVALID_SIGN_IN_MESSAGE,
      });
      return;
    }

    sendVendorAccountSession(res, account);
  } catch (error) {
    next(error);
  }
});

// Verifies Google and creates or links a vendor-only login.
router.post("/google", googleAuthRateLimiter, async (req, res, next) => {
  try {
    const credential = getString(req.body?.credential);
    const passwordValidation = validatePasswordInput(req.body?.password, {
      optional: true,
    });

    if (!passwordValidation.ok) {
      res.status(400).json({ message: passwordValidation.message });
      return;
    }

    const password = passwordValidation.password;

    if (!credential) {
      res.status(400).json({
        message: "Google sign-in did not complete. Please try again.",
      });
      return;
    }

    const identity = await verifyGoogleCredential(credential);
    let account = await VendorAccountModel.findOne({
      googleSubject: identity.subject,
    }).select("+googleSubject");

    if (!account) {
      const existingAccount = await VendorAccountModel.findOne({
        email: identity.email,
      }).select(credentialSelection);

      if (existingAccount?.googleSubject) {
        res.status(409).json({
          message:
            "This vendor email is connected to a different Google account.",
        });
        return;
      }

      if (
        existingAccount &&
        !identity.emailIsAuthoritative &&
        (!password || !(await verifyPassword(password, existingAccount)))
      ) {
        res.status(409).json({
          message:
            "Enter the current vendor password for this email, then try Google sign-in again.",
        });
        return;
      }

      if (existingAccount) {
        existingAccount.googleSubject = identity.subject;
        await existingAccount.save();
        account = existingAccount;
      } else {
        const sourceUser = await UserModel.findOne({
          email: identity.email,
        }).select(credentialSelection);

        if (sourceUser?.googleSubject && sourceUser.googleSubject !== identity.subject) {
          res.status(409).json({
            message:
              "This email is connected to a different Google account in Vida.",
          });
          return;
        }

        if (
          sourceUser &&
          !identity.emailIsAuthoritative &&
          (!password || !(await verifyPassword(password, sourceUser)))
        ) {
          res.status(409).json({
            message:
              "Enter the current Vida user password for this email, then try Google sign-in again.",
          });
          return;
        }

        account = await VendorAccountModel.create({
          name: sourceUser?.name || identity.name,
          email: identity.email,
          googleSubject: identity.subject,
          passwordHash: sourceUser?.passwordHash,
          passwordSalt: sourceUser?.passwordSalt,
        });
      }
    }

    sendVendorAccountSession(res, account);
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

router.get("/me", requireVendorAccountAuth, async (_req, res, next) => {
  try {
    res.json({ account: serializeVendorAccount(res.locals.vendorAccount) });
  } catch (error) {
    next(error);
  }
});

export default router;
