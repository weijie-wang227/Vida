import { Router } from "express";
import { Types } from "mongoose";
import { findAuthenticatedUser } from "../auth.js";
import { NotificationModel, UserModel } from "../models/VidaData.js";
import { serializeNotification } from "../serializers.js";

const router = Router();
const maxNotificationTitleLength = 120;
const maxNotificationContentLength = 500;

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

router.get("/", async (req, res) => {
  const authUser = await findAuthenticatedUser(req.headers.authorization);

  if (!authUser) {
    res.status(401).json({ message: "Not signed in." });
    return;
  }

  const notifications = await NotificationModel.find({ user: authUser._id }).sort({
    dateReceived: -1,
  });

  res.json(notifications.map(serializeNotification));
});

router.post("/send", async (req, res) => {
  const authUser = await findAuthenticatedUser(req.headers.authorization);

  if (!authUser) {
    res.status(401).json({ message: "Not signed in." });
    return;
  }

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

router.post("/:notificationId/read", async (req, res) => {
  const authUser = await findAuthenticatedUser(req.headers.authorization);

  if (!authUser) {
    res.status(401).json({ message: "Not signed in." });
    return;
  }

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
