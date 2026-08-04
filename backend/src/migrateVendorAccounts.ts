import "./env.js";
import mongoose, { Types } from "mongoose";
import { connectDB, disconnectDB } from "./db.js";
import {
  UserModel,
  VendorAccountModel,
  VendorModel,
} from "./models/VidaData.js";
import { normalizeEmail } from "./services/auth.js";

type LegacyVendor = {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
};

async function migrateVendorAccounts() {
  const shouldApply = process.argv.includes("--apply");
  const connected = await connectDB();

  if (!connected || !mongoose.connection.db) {
    throw new Error("A MongoDB connection is required for vendor account migration.");
  }

  const legacyVendors = (await VendorModel.collection
    .find(
      {
        account: { $exists: false },
        owner: { $type: "objectId" },
      },
      { projection: { _id: 1, owner: 1 } },
    )
    .toArray()) as LegacyVendor[];
  const ownerIds = [
    ...new Map(
      legacyVendors.map((vendor) => [String(vendor.owner), vendor.owner]),
    ).values(),
  ];
  const users = await UserModel.find({ _id: { $in: ownerIds } })
    .select("+googleSubject +passwordHash +passwordSalt")
    .lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const missingOwnerIds = ownerIds.filter(
    (ownerId) => !usersById.has(String(ownerId)),
  );
  const credentiallessUsers = users.filter(
    (user) => !user.googleSubject && (!user.passwordHash || !user.passwordSalt),
  );
  const duplicateOwnerIds = [...new Set(
    legacyVendors
      .filter(
        (vendor, index, items) =>
          items.findIndex(
            (candidate) => String(candidate.owner) === String(vendor.owner),
          ) !== index,
      )
      .map((vendor) => String(vendor.owner)),
  )];

  console.log(
    `Vendor account migration found ${legacyVendors.length} legacy vendors owned by ${ownerIds.length} users. ${missingOwnerIds.length} owners are missing and ${credentiallessUsers.length} users have no password or Google identity to copy.`,
  );

  if (!shouldApply) {
    console.log(
      "Preview only. Run `npm run migrate:vendor-accounts:apply` to create vendor accounts and replace legacy owner links.",
    );
    return;
  }

  if (missingOwnerIds.length > 0) {
    throw new Error(
      `Cannot migrate vendors with missing owners: ${missingOwnerIds.map(String).join(", ")}`,
    );
  }

  if (duplicateOwnerIds.length > 0) {
    throw new Error(
      `Cannot link more than one vendor to the same account. Duplicate owners: ${duplicateOwnerIds.join(", ")}`,
    );
  }

  let createdAccountCount = 0;
  let linkedVendorCount = 0;

  await mongoose.connection.transaction(async (dbSession) => {
    for (const ownerId of ownerIds) {
      const user = usersById.get(String(ownerId));

      if (!user) {
        continue;
      }

      const email = normalizeEmail(user.email);
      let account = await VendorAccountModel.findOne({ email })
        .select("+googleSubject +passwordHash +passwordSalt")
        .session(dbSession);

      if (
        account?.googleSubject &&
        user.googleSubject &&
        account.googleSubject !== user.googleSubject
      ) {
        throw new Error(
          `Vendor account ${String(account._id)} has a different Google identity from user ${String(user._id)}.`,
        );
      }

      if (
        account?.passwordHash &&
        user.passwordHash &&
        account.passwordHash !== user.passwordHash
      ) {
        throw new Error(
          `Vendor account ${String(account._id)} has different password credentials from user ${String(user._id)}.`,
        );
      }

      if (!account) {
        [account] = await VendorAccountModel.create(
          [
            {
              name: user.name,
              email,
              googleSubject: user.googleSubject,
              passwordHash: user.passwordHash,
              passwordSalt: user.passwordSalt,
            },
          ],
          { session: dbSession },
        );
        createdAccountCount += 1;
      } else {
        account.name ||= user.name;
        account.googleSubject ||= user.googleSubject;

        if (!account.passwordHash && !account.passwordSalt) {
          account.passwordHash = user.passwordHash;
          account.passwordSalt = user.passwordSalt;
        }

        await account.save({ session: dbSession });
      }

      const result = await VendorModel.collection.updateMany(
        {
          account: { $exists: false },
          owner: user._id,
        },
        {
          $set: { account: account._id },
          $unset: { owner: "" },
        },
        { session: dbSession },
      );
      linkedVendorCount += result.modifiedCount;
    }
  });

  console.log(
    `Vendor account migration created ${createdAccountCount} accounts and linked ${linkedVendorCount} vendors.`,
  );

  if (credentiallessUsers.length > 0) {
    console.warn(
      `${credentiallessUsers.length} migrated vendor accounts still require a password or Google identity before they can sign in.`,
    );
  }
}

migrateVendorAccounts()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
