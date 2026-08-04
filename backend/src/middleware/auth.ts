import type { NextFunction, Request, Response } from "express";
import type { HydratedDocument } from "mongoose";
import {
  findAuthenticatedVendorAccount,
  findAuthenticatedUser,
  type AuthUserRecord,
  type AuthVendorAccountRecord,
} from "../services/auth.js";
import {
  VendorModel,
  type VendorDocument,
} from "../models/VidaData.js";

export type AuthenticatedLocals = {
  user: AuthUserRecord;
};

export type VendorAccountAuthenticatedLocals = {
  vendorAccount: AuthVendorAccountRecord;
};

export type VendorAuthenticatedLocals = VendorAccountAuthenticatedLocals & {
  vendor: HydratedDocument<VendorDocument>;
};

export type PrincipalAuthenticatedLocals = {
  user?: AuthUserRecord;
  vendorAccount?: AuthVendorAccountRecord;
  vendor?: HydratedDocument<VendorDocument> | null;
};

export type OptionalAuthLocals = {
  user?: AuthUserRecord | null;
};

export async function optionalAuth(
  req: Request,
  res: Response<any, OptionalAuthLocals>,
  next: NextFunction,
) {
  try {
    res.locals.user = await findAuthenticatedUser(req.headers.authorization);
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuth(
  req: Request,
  res: Response<any, AuthenticatedLocals>,
  next: NextFunction,
) {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    res.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireVendorAuth(
  req: Request,
  res: Response<any, VendorAuthenticatedLocals>,
  next: NextFunction,
) {
  try {
    const vendorAccount = await findAuthenticatedVendorAccount(
      req.headers.authorization,
    );

    if (!vendorAccount) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const vendor = await VendorModel.findOne({ account: vendorAccount._id });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    res.locals.vendorAccount = vendorAccount;
    res.locals.vendor = vendor;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireVendorAccountAuth(
  req: Request,
  res: Response<any, VendorAccountAuthenticatedLocals>,
  next: NextFunction,
) {
  try {
    const vendorAccount = await findAuthenticatedVendorAccount(
      req.headers.authorization,
    );

    if (!vendorAccount) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    res.locals.vendorAccount = vendorAccount;
    next();
  } catch (error) {
    next(error);
  }
}

export async function findVendorForUser(userId: AuthUserRecord["_id"]) {
  const legacyVendor = await VendorModel.collection.findOne({ owner: userId });

  return legacyVendor ? VendorModel.hydrate(legacyVendor) : null;
}

export async function requirePrincipalAuth(
  req: Request,
  res: Response<any, PrincipalAuthenticatedLocals>,
  next: NextFunction,
) {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (user) {
      res.locals.user = user;
      res.locals.vendor = await findVendorForUser(user._id);
      next();
      return;
    }

    const vendorAccount = await findAuthenticatedVendorAccount(
      req.headers.authorization,
    );

    if (!vendorAccount) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    res.locals.vendorAccount = vendorAccount;
    res.locals.vendor = await VendorModel.findOne({ account: vendorAccount._id });
    next();
  } catch (error) {
    next(error);
  }
}
