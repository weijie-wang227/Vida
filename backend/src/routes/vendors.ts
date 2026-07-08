import { Router } from "express";
import { Types } from "mongoose";
import { findAuthenticatedUser } from "../auth.js";
import {
  ActivityJoinModel,
  ActivityModel,
  MapPinModel,
  NotificationModel,
  RatingModel,
  VendorModel,
} from "../models/VidaData.js";
import { serializeVendor } from "../serializers.js";

const router = Router();

function asObject(doc: Record<string, any>) {
  return typeof doc.toObject === "function" ? doc.toObject() : doc;
}

function getLinkedActivityIds(vendor: Record<string, any>) {
  if (Array.isArray(vendor.allActivities)) {
    return vendor.allActivities;
  }

  return Array.isArray(vendor.allEvents) ? vendor.allEvents : [];
}

async function getVendorStats(vendor: Record<string, any>) {
  const vendorId = vendor._id;
  const linkedEventIds = getLinkedActivityIds(vendor);
  const activities = await ActivityModel.find({
    $or: [{ vendor: vendorId }, { _id: { $in: linkedEventIds } }],
  }).select("_id rating isActive");
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);
  const pastActivityIds = activities
    .filter((activity: Record<string, any>) => activity.isActive === false)
    .map((activity: Record<string, any>) => activity._id);
  const attendedCount =
    activityIds.length > 0
      ? await ActivityJoinModel.countDocuments({
          activityId: { $in: activityIds },
          attended: true,
        })
      : 0;
  const [pastAttendedCount, pastJoinCount] =
    pastActivityIds.length > 0
      ? await Promise.all([
          ActivityJoinModel.countDocuments({
            activityId: { $in: pastActivityIds },
            attended: true,
          }),
          ActivityJoinModel.countDocuments({
            activityId: { $in: pastActivityIds },
          }),
        ])
      : [0, 0];
  const ratingRows =
    activityIds.length > 0
      ? await RatingModel.find({ activity: { $in: activityIds } }).select("rating")
      : [];
  const ratingValues = ratingRows.length
    ? ratingRows.map((row: Record<string, any>) => Number(row.rating))
    : activities.map((activity: Record<string, any>) => Number(activity.rating));
  const validRatings = ratingValues.filter((rating: number) => Number.isFinite(rating));
  const averageRating =
    validRatings.length > 0
      ? Math.round(
          (validRatings.reduce((sum: number, rating: number) => sum + rating, 0) /
            validRatings.length) *
            10,
        ) / 10
      : 0;
  const attendanceRate =
    pastJoinCount > 0
      ? `${Math.round((pastAttendedCount / pastJoinCount) * 100)}%`
      : "0%";

  return {
    activities: activities.length,
    pastActivities: pastActivityIds.length,
    peopleAttended: attendedCount || vendor.numAttended || 0,
    attendanceRate,
    averageRating,
  };
}

async function sendVendorResponse(res: any, vendor: Record<string, any>, status = 200) {
  res.status(status).json({
    vendor: serializeVendor(vendor),
    stats: await getVendorStats(vendor),
  });
}

async function getVendorActivities(vendor: Record<string, any>) {
  const linkedEventIds = getLinkedActivityIds(vendor);
  const activities = await ActivityModel.find({
    $or: [{ vendor: vendor._id }, { _id: { $in: linkedEventIds } }],
  })
    .sort({ startsAt: -1 })
    .lean();
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);
  const [joins, ratings] = await Promise.all([
    activityIds.length
      ? ActivityJoinModel.aggregate([
          { $match: { activityId: { $in: activityIds } } },
          {
            $group: {
              _id: "$activityId",
              count: { $sum: { $cond: ["$attended", 1, 0] } },
            },
          },
        ])
      : [],
    activityIds.length
      ? RatingModel.aggregate([
          { $match: { activity: { $in: activityIds } } },
          { $group: { _id: "$activity", averageRating: { $avg: "$rating" } } },
        ])
      : [],
  ]);
  const attendanceByActivityId = new Map(
    joins.map((row: Record<string, any>) => [String(row._id), row.count]),
  );
  const ratingByActivityId = new Map(
    ratings.map((row: Record<string, any>) => [
      String(row._id),
      Math.round(Number(row.averageRating) * 10) / 10,
    ]),
  );

  return activities.map((activity: Record<string, any>) => {
    const activityId = String(activity._id);
    const rating = ratingByActivityId.get(activityId) ?? Number(activity.rating) ?? 0;

    return {
      id: activityId,
      mockId: activity.mockId,
      title: activity.title,
      startsAt: activity.startsAt,
      location: activity.location,
      spots: activity.spots,
      attendance: attendanceByActivityId.get(activityId) ?? 0,
      rating: Number.isFinite(rating) ? rating : 0,
      isOpen: activity.isOpen !== false,
      isActive: activity.isActive !== false,
    };
  });
}

function serializeActivityTemplate(activity: Record<string, any>, pin: Record<string, any>) {
  return {
    id: activity.mockId,
    title: activity.title,
    location: activity.location,
    latitude: pin.latitude,
    longitude: pin.longitude,
    durationMinutes: activity.durationMinutes,
    spots: activity.spots,
    credits: activity.credits,
    categories: Array.isArray(activity.categories) ? activity.categories : [],
  };
}

async function getVendorActivityTemplates(vendor: Record<string, any>) {
  const linkedEventIds = getLinkedActivityIds(vendor);
  const activities = await ActivityModel.find({
    $or: [{ vendor: vendor._id }, { _id: { $in: linkedEventIds } }],
    startsAt: { $lt: new Date() },
  })
    .sort({ startsAt: -1 })
    .lean();
  const activityIds = activities.map((activity: Record<string, any>) => activity._id);
  const pins = activityIds.length
    ? await MapPinModel.find({ activity: { $in: activityIds } }).lean()
    : [];
  const pinsByActivityId = new Map(
    pins.map((pin: Record<string, any>) => [
      String(pin.activity?._id ?? pin.activity),
      pin,
    ]),
  );

  return activities
    .map((activity: Record<string, any>) => {
      const pin = pinsByActivityId.get(String(activity._id));

      return pin ? serializeActivityTemplate(activity, pin) : null;
    })
    .filter(Boolean);
}

function getActivitySelector(activityId: string) {
  const activitySelector: Record<string, any>[] = [];
  const mockId = Number(activityId);

  if (Number.isInteger(mockId)) {
    activitySelector.push({ mockId });
  }

  if (Types.ObjectId.isValid(activityId)) {
    activitySelector.push({ _id: activityId });
  }

  return activitySelector;
}

async function findVendorActivity(
  vendor: Record<string, any>,
  activityId: string,
  select = "_id mockId title isOpen",
) {
  const linkedEventIds = getLinkedActivityIds(vendor);
  const activitySelector = getActivitySelector(activityId);

  if (activitySelector.length === 0) {
    return null;
  }

  return ActivityModel.findOne({
    $and: [
      { $or: [{ vendor: vendor._id }, { _id: { $in: linkedEventIds } }] },
      { $or: activitySelector },
    ],
  }).select(select);
}

router.get("/me", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Sign in to view your vendor profile." });
      return;
    }

    const vendor = await VendorModel.findOne({ owner: user._id });

    if (!vendor) {
      res.json({ vendor: null, stats: null });
      return;
    }

    await sendVendorResponse(res, vendor);
  } catch (error) {
    next(error);
  }
});

router.get("/me/activities", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Sign in to view vendor activities." });
      return;
    }

    const vendor = await VendorModel.findOne({ owner: user._id });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    res.json({
      activities: await getVendorActivities(vendor),
      stats: await getVendorStats(vendor),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/me", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Sign in to update your vendor profile." });
      return;
    }

    const vendor = await VendorModel.findOne({ owner: user._id });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    const profileUrl = String(req.body?.profileUrl ?? "").trim();
    const description = String(req.body?.description ?? "").trim();

    if (description.length > 500) {
      res.status(400).json({ message: "Description must be 500 characters or less." });
      return;
    }

    vendor.profileUrl = profileUrl;
    vendor.description = description;
    await vendor.save();

    await sendVendorResponse(res, vendor);
  } catch (error) {
    next(error);
  }
});

router.get("/me/activity-templates", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Sign in to view vendor activities." });
      return;
    }

    const vendor = await VendorModel.findOne({ owner: user._id });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    res.json(await getVendorActivityTemplates(vendor));
  } catch (error) {
    next(error);
  }
});

router.get("/me/activities/:activityId/attendees", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Sign in to view attendance." });
      return;
    }

    const vendor = await VendorModel.findOne({ owner: user._id });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    const activitySelector = getActivitySelector(req.params.activityId);

    if (activitySelector.length === 0) {
      res.status(400).json({ message: "Choose a valid activity." });
      return;
    }

    const activity = await findVendorActivity(
      vendor,
      req.params.activityId,
      "_id mockId title",
    );

    if (!activity) {
      res.status(404).json({ message: "Activity not found." });
      return;
    }

    const joins = await ActivityJoinModel.find({ activityId: activity._id })
      .populate("userId")
      .sort({ createdAt: 1 });

    res.json({
      activity: {
        id: String(activity._id),
        mockId: activity.mockId,
        title: activity.title,
      },
      attendees: joins.map((join: Record<string, any>) => {
        const item = asObject(join);
        const attendee = asObject(item.userId ?? {});

        return {
          id: String(attendee._id ?? item.userId),
          name: attendee.name ?? "Unknown user",
          handle: attendee.handle ?? "",
          avatar: attendee.avatarUrl ?? "",
          attended: Boolean(item.attended),
          signedUpAt: item.createdAt,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/me/activities/:activityId/open", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Sign in to update activity status." });
      return;
    }

    const vendor = await VendorModel.findOne({ owner: user._id });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    const activitySelector = getActivitySelector(req.params.activityId);

    if (activitySelector.length === 0) {
      res.status(400).json({ message: "Choose a valid activity." });
      return;
    }

    const isOpen = req.body?.isOpen;

    if (typeof isOpen !== "boolean") {
      res.status(400).json({ message: "Choose whether the activity is open." });
      return;
    }

    const activity = await findVendorActivity(vendor, req.params.activityId);

    if (!activity) {
      res.status(404).json({ message: "Activity not found." });
      return;
    }

    activity.isOpen = isOpen;
    await activity.save();

    res.json({
      activity: {
        id: String(activity._id),
        mockId: activity.mockId,
        title: activity.title,
        isOpen: activity.isOpen !== false,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/me/activities/:activityId/attendees/:userId",
  async (req, res, next) => {
    try {
      const user = await findAuthenticatedUser(req.headers.authorization);

      if (!user) {
        res.status(401).json({ message: "Sign in to update attendance." });
        return;
      }

      const vendor = await VendorModel.findOne({ owner: user._id });

      if (!vendor) {
        res.status(404).json({ message: "Vendor profile not found." });
        return;
      }

      const activitySelector = getActivitySelector(req.params.activityId);

      if (activitySelector.length === 0 || !Types.ObjectId.isValid(req.params.userId)) {
        res.status(400).json({ message: "Choose a valid attendee." });
        return;
      }

      const activity = await findVendorActivity(
        vendor,
        req.params.activityId,
        "_id mockId title",
      );

      if (!activity) {
        res.status(404).json({ message: "Activity not found." });
        return;
      }

      const attended = Boolean(req.body?.attended);
      const join = await ActivityJoinModel.findOneAndUpdate(
        { activityId: activity._id, userId: req.params.userId },
        { attended },
        { returnDocument: "after" },
      );

      if (!join) {
        res.status(404).json({ message: "Signed-up user not found." });
        return;
      }

      if (attended && !join.sentReview) {
        await NotificationModel.create({
          user: join.userId,
          title: "Review your activity",
          content: `How was ${activity.title}? Share a quick rating and note.`,
          link: `/activities/${activity.mockId}/review`,
          read: false,
        });

        join.sentReview = true;
        await join.save();
      }

      res.json({
        attendee: {
          id: String(join.userId),
          attended: Boolean(join.attended),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id", async (req, res, next) => {
  try {
    const vendor = await VendorModel.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    await sendVendorResponse(res, vendor);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/activities", async (req, res, next) => {
  try {
    const vendor = await VendorModel.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found." });
      return;
    }

    res.json({
      activities: await getVendorActivities(vendor),
      stats: await getVendorStats(vendor),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/createVendor", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Sign in to create a vendor." });
      return;
    }

    const name = String(req.body?.name ?? "").trim();
    const profileUrl = String(req.body?.profileUrl ?? "").trim();
    const description = String(req.body?.description ?? "").trim();

    if (!name) {
      res.status(400).json({ message: "Vendor name is required." });
      return;
    }

    const existingVendor = await VendorModel.findOne({ owner: user._id });

    if (existingVendor) {
      await sendVendorResponse(res, existingVendor);
      return;
    }

    const vendor = await VendorModel.create({
      owner: user._id,
      name,
      profileUrl,
      description,
      numAttended: 0,
      allActivities: [],
    });

    await sendVendorResponse(res, vendor, 201);
  } catch (error) {
    next(error);
  }
});

export default router;
