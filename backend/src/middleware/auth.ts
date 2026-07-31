import type { NextFunction, Request, Response } from "express";
import type { HydratedDocument } from "mongoose";
import {
  findAuthenticatedUser,
  type AuthUserRecord,
} from "../services/auth.js";
import { VendorModel, type VendorDocument } from "../models/VidaData.js";

export type AuthenticatedLocals = {
  user: AuthUserRecord;
};

export type VendorAuthenticatedLocals = AuthenticatedLocals & {
  vendor: HydratedDocument<VendorDocument>;
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
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const vendor = await VendorModel.findOne({ owner: user._id });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    res.locals.user = user;
    res.locals.vendor = vendor;
    next();
  } catch (error) {
    next(error);
  }
}
