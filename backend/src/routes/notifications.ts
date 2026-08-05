import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { authenticatedMutationRateLimiter } from "../middleware/rateLimits.js";
import { NotificationModel, UserModel } from "../models/VidaData.js";
import { serializeNotification } from "../serializers.js";
import { getString } from "../utils/input.js";

const router = Router();
const maxNotificationTitleLength = 120;
const maxNotificationContentLength = 500;

// Lists notifications for the signed-in user.
router.get("/", requireAuth, async (_req, res) => {
  const authUser = res.locals.user;
  const notifications = await NotificationModel.find({ user: authUser._id }).sort({
    dateReceived: -1,
  });

  res.json(notifications.map(serializeNotification));
});

// Sends a notification to a user and emails them when an address is available.
router.post("/send", requireAuth, authenticatedMutationRateLimiter, async (req, res) => {
  const userId = getString(req.body?.userId ?? req.body?.recipientId);
  const title = getString(req.body?.title);
  const content = getString(req.body?.content);
  const link = getString(req.body?.link);

  if (!userId) {
    res.status(400).json({ message: "Recipient user ID is required." });
    return;
  }

  if (!Types.ObjectId.isValid(userId)) {
    res.status(404).json({ message: "Recipient not found." });
    return;
  }

  if (!title) {
    res.status(400).json({ message: "Notification title is required." });
    return;
  }

  if (title.length > maxNotificationTitleLength) {
    res.status(400).json({
      message: `Notification title must be ${maxNotificationTitleLength} characters or less.`,
    });
    return;
  }

  if (!content) {
    res.status(400).json({ message: "Notification content is required." });
    return;
  }

  if (content.length > maxNotificationContentLength) {
    res.status(400).json({
      message: `Notification content must be ${maxNotificationContentLength} characters or less.`,
    });
    return;
  }

  const recipient = await UserModel.findById(userId).select("_id");

  if (!recipient) {
    res.status(404).json({ message: "Recipient not found." });
    return;
  }

  const notification = await NotificationModel.create({
    user: recipient._id,
    title,
    content,
    link: link || undefined,
    read: false,
  });

  res.status(201).json(serializeNotification(notification));
});

// Marks one notification as read for the signed-in user.
router.post("/:notificationId/read", requireAuth, authenticatedMutationRateLimiter, async (req, res) => {
  const authUser = res.locals.user;
  const notificationId = getString(req.params.notificationId);

  if (!Types.ObjectId.isValid(notificationId)) {
    res.status(404).json({ message: "Notification not found." });
    return;
  }

  const notification = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, user: authUser._id },
    { $set: { read: true } },
    { returnDocument: 'after' },
  );

  if (!notification) {
    res.status(404).json({ message: "Notification not found." });
    return;
  }

  res.json(serializeNotification(notification));
});

export default router;
