import mongoose, { Schema, Types } from "mongoose";

export type UserDocument = {
  _id: Types.ObjectId;
  mockId: number;
  name: string;
  handle: string;
  email: string;
  avatarUrl: string;
  passwordHash?: string;
  passwordSalt?: string;
  bio?: string;
  stats?: { label: string; value: string }[];
};

export type SettingsPreferences = {
  appearance: "light" | "dark";
  activityReminders: boolean;
  friendDiscovery: boolean;
  privateActivityHistory: boolean;
};

export type SettingsDocument = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  preferences: SettingsPreferences;
};

export type NotificationDocument = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  dateReceived: Date;
  title: string;
  content: string;
  link?: string;
  read: boolean;
};

export type VendorDocument = {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  profileUrl?: string;
  description?: string;
  numAttended: number;
  allActivities: Types.ObjectId[];
};

export type RatingDocument = {
  _id: Types.ObjectId;
  rating: number;
  activity: Types.ObjectId;
  sender?: Types.ObjectId;
  review?: string;
};

const userSchema = new Schema<UserDocument>(
  {
    mockId: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    handle: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: { type: String, required: true, unique: true },
    avatarUrl: { type: String, required: true },
    passwordHash: { type: String, select: false },
    passwordSalt: { type: String, select: false },
    bio: { type: String },
    stats: [
      {
        label: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

const settingsPreferencesSchema = new Schema<SettingsPreferences>(
  {
    appearance: {
      type: String,
      enum: ["light", "dark"],
      required: true,
      default: "dark",
    },
    activityReminders: { type: Boolean, required: true, default: true },
    friendDiscovery: { type: Boolean, required: true, default: true },
    privateActivityHistory: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const settingsSchema = new Schema<SettingsDocument>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    preferences: {
      type: settingsPreferencesSchema,
      required: true,
      default: () => ({}),
    },
  },
  { timestamps: true },
);
settingsSchema.index({ user: 1 }, { unique: true });

const notificationSchema = new Schema<NotificationDocument>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    dateReceived: { type: Date, required: true, default: () => new Date() },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true, trim: true, maxlength: 500 },
    link: { type: String, trim: true },
    read: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);
notificationSchema.index({ user: 1, dateReceived: -1 });

const friendshipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    friendId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true },
);
friendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });

const chatSchema = new Schema(
  {
    mockId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: String, default: "" },
    time: { type: String, default: "" },
    unread: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);
chatSchema.index({ members: 1 });

const adminSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    group: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
  },
  { timestamps: true },
);
adminSchema.index({ user: 1, group: 1 }, { unique: true });
adminSchema.index({ group: 1 });

const blacklistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    group: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
    blacklistedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reason: {
      type: String,
      required: true,
      default: "You are blacklisted from this group.",
    },
  },
  { timestamps: true },
);
blacklistSchema.index({ user: 1, group: 1 }, { unique: true });
blacklistSchema.index({ group: 1 });

const chatMessageSchema = new Schema(
  {
    chat: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
    sender: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ["text", "activity_invite"],
      default: "text",
    },
    activity: { type: Schema.Types.ObjectId, ref: "Activity" },
  },
  { timestamps: true },
);
chatMessageSchema.index({ chat: 1, createdAt: 1 });
chatMessageSchema.index({ activity: 1 });

const vendorSchema = new Schema<VendorDocument>(
  {
    owner: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    name: { type: String, required: true, trim: true },
    profileUrl: { type: String, trim: true },
    description: { type: String, trim: true },
    numAttended: { type: Number, required: true, default: 0, min: 0 },
    allActivities: [{ type: Schema.Types.ObjectId, ref: "Activity" }],
  },
  { timestamps: true },
);
vendorSchema.index({ owner: 1 });

const ratingSchema = new Schema<RatingDocument>(
  {
    rating: { type: Number, required: true },
    activity: { type: Schema.Types.ObjectId, required: true, ref: "Activity" },
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    review: { type: String, trim: true },
  },
  { timestamps: true },
);
ratingSchema.index({ activity: 1 });
ratingSchema.index({ sender: 1 });

const activitySchema = new Schema(
  {
    mockId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    host: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor" },
    startsAt: { type: Date, required: true },
    location: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    spots: { type: Number, required: true },
    credits: { type: Number, required: true, default: 0, min: 0 },
    rating: { type: Number, required: true },
    categories: [{ type: String, required: true }],
    chat: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
    isPremium: { type: Boolean, required: true, default: false },
    cover: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true },
);

const activityJoinSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    activityId: { type: Schema.Types.ObjectId, required: true, ref: "Activity" },
    sentNotification: { type: Boolean, required: true, default: false },
    attended: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);
activityJoinSchema.index({ userId: 1, activityId: 1 }, { unique: true });

const mapPinSchema = new Schema(
  {
    mockId: { type: Number, required: true, unique: true },
    activity: { type: Schema.Types.ObjectId, required: true, ref: "Activity" },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    label: { type: String, required: true },
    premium: { type: Boolean },
  },
  { timestamps: true },
);

const feedPostSchema = new Schema(
  {
    mockId: { type: Number, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    activity: { type: Schema.Types.ObjectId, ref: "Activity" },
    group: { type: Schema.Types.ObjectId, ref: "Chat" },
    caption: { type: String, required: true },
    image: { type: String },
    durationMinutes: { type: Number },
    categories: [{ type: String }],
    likesCount: { type: Number, required: true, default: 0 },
    comments: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

const commentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, required: true, ref: "FeedPost" },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    body: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);
commentSchema.index({ post: 1, createdAt: 1, _id: 1 });
commentSchema.index({ user: 1, createdAt: -1 });

const likeSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, required: true, ref: "FeedPost" },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true },
);
likeSchema.index({ post: 1, user: 1 }, { unique: true });
likeSchema.index({ user: 1, createdAt: -1 });

export const UserModel = mongoose.model<any>("User", userSchema, "users");
export const SettingsModel = mongoose.model<any>(
  "Settings",
  settingsSchema,
  "settings",
);
export const NotificationModel = mongoose.model<any>(
  "Notification",
  notificationSchema,
  "notifications",
);
export const FriendshipModel = mongoose.model(
  "Friendship",
  friendshipSchema,
  "friendships",
);
export const ChatModel = mongoose.model<any>("Chat", chatSchema, "chats");
export const AdminModel = mongoose.model<any>("Admin", adminSchema, "admins");
export const BlacklistModel = mongoose.model<any>(
  "Blacklist",
  blacklistSchema,
  "blacklists",
);
export const ChatMessageModel = mongoose.model<any>(
  "ChatMessage",
  chatMessageSchema,
  "chatMessages",
);
export const VendorModel = mongoose.model<any>("Vendor", vendorSchema, "vendors");
export const RatingModel = mongoose.model<any>("Rating", ratingSchema, "ratings");
export const ActivityModel = mongoose.model<any>(
  "Activity",
  activitySchema,
  "activities",
);
export const ActivityJoinModel = mongoose.model<any>(
  "ActivityJoin",
  activityJoinSchema,
  "activityJoins",
);
export const MapPinModel = mongoose.model<any>("MapPin", mapPinSchema, "mapPins");
export const FeedPostModel = mongoose.model<any>(
  "FeedPost",
  feedPostSchema,
  "feedPosts",
);
export const CommentModel = mongoose.model<any>(
  "Comment",
  commentSchema,
  "comments",
);
export const LikeModel = mongoose.model<any>("Like", likeSchema, "likes");
