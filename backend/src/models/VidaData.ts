import mongoose, { Schema, Types } from "mongoose";
import { chatMessageTypes } from "../chatMessages.js";

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
  attendedSessionsCount: number;
};

export const sessionParticipationStatuses = [
  "registered",
  "approved",
  "rejected",
  "attended",
  "no_show",
  "cancelled",
] as const;
export type SessionParticipationStatus =
  (typeof sessionParticipationStatuses)[number];

export const sessionParticipationRoles = ["participant", "organizer"] as const;
export type SessionParticipationRole =
  (typeof sessionParticipationRoles)[number];

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

export type TagDocument = {
  _id: Types.ObjectId;
  name: string;
};

export type MembershipDocument = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  credits: number;
};

export type AccountDocument = {
  _id: Types.ObjectId;
  membership: Types.ObjectId;
  user: Types.ObjectId;
  startAt: Date;
  creditsLeft: number;
};

export type FavouriteDocument = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  activities: Types.ObjectId[];
};

export type ConsolidatedUser = {
  user: Types.ObjectId;
  joinedAt: Date;
};

export type ConversionRateDocument = {
  _id: Types.ObjectId;
  key: "creditsToDollars";
  rate: number;
};

export type ConsolidatedDocument = {
  _id: Types.ObjectId;
  vendor: Types.ObjectId;
  users: ConsolidatedUser[];
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
    attendedSessionsCount: { type: Number, required: true, default: 0, min: 0 },
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

const membershipSchema = new Schema<MembershipDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    price: { type: Number, required: true, min: 0 },
    credits: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);
membershipSchema.index({ name: 1 }, { unique: true });

const accountSchema = new Schema<AccountDocument>(
  {
    membership: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Membership",
    },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    startAt: { type: Date, required: true, default: () => new Date() },
    creditsLeft: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);
accountSchema.index({ user: 1 });
accountSchema.index({ membership: 1 });

const favouriteSchema = new Schema<FavouriteDocument>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    activities: {
      type: [{ type: Schema.Types.ObjectId, ref: "Activity" }],
      required: true,
      default: [],
    },
  },
  { timestamps: true },
);
favouriteSchema.index({ user: 1 }, { unique: true });
favouriteSchema.index({ activities: 1 });

const conversionRateSchema = new Schema<ConversionRateDocument>(
  {
    key: {
      type: String,
      required: true,
      enum: ["creditsToDollars"],
      default: "creditsToDollars",
    },
    rate: { type: Number, required: true, min: 0, default: 0.7 },
  },
  { timestamps: true },
);
conversionRateSchema.index({ key: 1 }, { unique: true });

const consolidatedUserSchema = new Schema<ConsolidatedUser>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    joinedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const consolidatedSchema = new Schema<ConsolidatedDocument>(
  {
    vendor: { type: Schema.Types.ObjectId, required: true, ref: "Vendor" },
    users: { type: [consolidatedUserSchema], required: true, default: [] },
  },
  { timestamps: true },
);
consolidatedSchema.index({ vendor: 1 }, { unique: true });
consolidatedSchema.index({ "users.user": 1 });

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
    type: {
      type: String,
      enum: chatMessageTypes,
      default: "text",
    },
    schemaVersion: { type: Number, required: true, default: 1, min: 1 },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);
chatMessageSchema.index({ chat: 1, createdAt: 1 });

const pollVoteSchema = new Schema(
  {
    message: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ChatMessage",
    },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    optionIds: [{ type: String, required: true }],
  },
  { timestamps: true },
);
pollVoteSchema.index({ message: 1, user: 1 }, { unique: true });
pollVoteSchema.index({ message: 1 });

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

const tagSchema = new Schema<TagDocument>(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);
tagSchema.index({ name: 1 }, { unique: true });

const activitySchema = new Schema(
  {
    mockId: { type: Number, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    host: { type: Schema.Types.ObjectId, required: false, ref: "Vendor" },
    rating: { type: Number, required: true, default: 5 },
    categories: [{ type: String, required: true }],
    cover: { type: String },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    isVolunteer: { type: Boolean, required: true, default: false },
    isAAC: { type: Boolean, required: true, default: false },
    sessionsNum: { type: Number, required: true, default: 0, min: 0 },
    registeredCount: { type: Number, required: true, default: 0, min: 0 },
    attendedCount: { type: Number, required: true, default: 0, min: 0 },
    totalRevenue: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);
activitySchema.index({ host: 1 });
activitySchema.index({ isAAC: 1 });

const sessionSchema = new Schema(
  {
    mockId: { type: Number, required: true, unique: true },
    activity: { type: Schema.Types.ObjectId, required: true, ref: "Activity" },
    title: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true },
    duration: { type: Number, required: true, min: 1 },
    spots: { type: Number, required: true, min: 1 },
    registeredCount: { type: Number, required: true, default: 0, min: 0 },
    attendedCount: { type: Number, required: true, default: 0, min: 0 },
    credits: { type: Number, required: true, default: 0, min: 0 },
    chat: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
    isPremium: { type: Boolean, required: true, default: false },
    skillsFuturePayable: { type: Boolean, required: true, default: false },
    isOpen: { type: Boolean, required: true, default: true },
    isActive: { type: Boolean, required: true, default: true },
    location: { type: String, required: true, trim: true },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { timestamps: true },
);
sessionSchema.index({ activity: 1, startsAt: 1 });
sessionSchema.index({ chat: 1 });
sessionSchema.index({ isOpen: 1, isActive: 1, startsAt: 1 });

const sessionParticipationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    sessionId: { type: Schema.Types.ObjectId, required: true, ref: "Session" },
    role: {
      type: String,
      enum: sessionParticipationRoles,
      required: true,
      default: "participant",
    },
    status: {
      type: String,
      enum: sessionParticipationStatuses,
      required: true,
      default: "registered",
    },
    registeredAt: { type: Date, required: true, default: () => new Date() },
    attendanceMarkedAt: { type: Date },
    reminderSentAt: { type: Date },
    reviewPromptSentAt: { type: Date },
  },
  { timestamps: true },
);
sessionParticipationSchema.index(
  { userId: 1, sessionId: 1 },
  { unique: true },
);
sessionParticipationSchema.index({ sessionId: 1, status: 1, createdAt: 1 });
sessionParticipationSchema.index({ userId: 1, status: 1, createdAt: -1 });

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
    comments:[{type: Schema.Types.ObjectId, ref: "Comment"}],
    likesCount: { type: Number, required: true, default: 0 },
    commentsNum: { type: Number, required: true, default: 0 },
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
export const MembershipModel = mongoose.model<any>(
  "Membership",
  membershipSchema,
  "memberships",
);
export const AccountModel = mongoose.model<any>(
  "Account",
  accountSchema,
  "accounts",
);
export const FavouriteModel = mongoose.model<FavouriteDocument>(
  "Favourite",
  favouriteSchema,
  "favourites",
);
export const ConsolidatedModel = mongoose.model<any>(
  "Consolidated",
  consolidatedSchema,
  "consolidated",
);
export const ConversionRateModel = mongoose.model<any>(
  "ConversionRate",
  conversionRateSchema,
  "conversionRates",
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
export const TagModel = mongoose.model<TagDocument>("Tag", tagSchema, "tags");
export const ActivityModel = mongoose.model<any>(
  "Activity",
  activitySchema,
  "activities",
);
export const SessionModel = mongoose.model<any>(
  "Session",
  sessionSchema,
  "sessions",
);
export const SessionParticipationModel = mongoose.model<any>(
  "SessionParticipation",
  sessionParticipationSchema,
  "sessionParticipations",
);
export const PollVoteModel = mongoose.model<any>(
  "PollVote",
  pollVoteSchema,
  "pollVotes",
);
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
