import mongoose, { Schema, Types } from "mongoose";
import {
  chatMessageTypes,
  type ChatMessageType,
  type StoredMessagePayload,
} from "../domain/chatMessages.js";
import {
  announcementTypes,
  type AnnouncementPoll,
  type AnnouncementType,
} from "../domain/announcements.js";

export type EntityId = Types.ObjectId | string;

export type UserDocument = {
  _id: Types.ObjectId;
  mockId: number;
  name: string;
  handle: string;
  email: string;
  avatarUrl: string;
  googleSubject?: string;
  passwordHash?: string;
  passwordSalt?: string;
  bio?: string;
  stats?: { label: string; value: string }[];
  attendedSessionsCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorAccountDocument = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  googleSubject?: string;
  passwordHash?: string;
  passwordSalt?: string;
  createdAt: Date;
  updatedAt: Date;
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
  activityReminders: boolean;
  friendDiscovery: boolean;
  privateActivityHistory: boolean;
};

export type SettingsDocument = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  preferences: SettingsPreferences;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationDocument = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  dateReceived: Date;
  title: string;
  content: string;
  link?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorDocument = {
  _id: Types.ObjectId;
  account?: Types.ObjectId;
  name: string;
  profileUrl?: string;
  description?: string;
  numAttended: number;
  allActivities: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

export type RatingDocument = {
  _id: Types.ObjectId;
  rating: number;
  activity: Types.ObjectId;
  sender?: Types.ObjectId;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TagDocument = {
  _id: Types.ObjectId;
  name: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FavouriteDocument = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  activities: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

export type ConsolidatedUser = {
  user: Types.ObjectId;
  joinedAt: Date;
};

export type ConsolidatedDocument = {
  _id: Types.ObjectId;
  vendor: Types.ObjectId;
  users: ConsolidatedUser[];
  createdAt: Date;
  updatedAt: Date;
};

export type FriendshipDocument = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  friendId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatDocument = {
  _id: Types.ObjectId;
  mockId: number;
  name: string;
  avatar: string;
  members: Types.ObjectId[];
  lastMessagePreview: string;
  lastMessageAt: Date | null;
  lastMessageId: Types.ObjectId | null;
  lastMessage: string;
  time: string;
  unread: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminDocument = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  group: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type BlacklistDocument = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  group: Types.ObjectId;
  blacklistedBy?: Types.ObjectId;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatMessageDocument = {
  _id: Types.ObjectId;
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  type: ChatMessageType;
  schemaVersion: number;
  payload: StoredMessagePayload;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivityDocument = {
  _id: Types.ObjectId;
  mockId: number;
  title: string;
  description: string;
  suitability: string;
  host?: Types.ObjectId;
  rating: number;
  categories: string[];
  imageUrls: string[];
  tags: Types.ObjectId[];
  isVolunteer: boolean;
  isAAC: boolean;
  sessionsNum: number;
  registeredCount: number;
  attendedCount: number;
  totalRevenue: number;
  grossRevenueMinor: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionDocument = {
  _id: Types.ObjectId;
  mockId: number;
  activity: Types.ObjectId;
  title: string;
  instructor: string;
  startsAt: Date;
  endAt: Date;
  spots: number;
  priceSgd: number;
  isPremium: boolean;
  skillsFuturePayable: boolean;
  grossRevenueMinor: number;
  pendingPaymentCount: number;
  registeredCount: number;
  attendedCount: number;
  chat: Types.ObjectId;
  isOpen: boolean;
  isActive: boolean;
  location: string;
  lat: number;
  lng: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AnnouncementDocument = {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  chatId: Types.ObjectId;
  content: string;
  type: AnnouncementType;
  poll?: AnnouncementPoll;
  createdAt: Date;
  updatedAt: Date;
};

export type AnnouncementVoteDocument = {
  _id: Types.ObjectId;
  announcementId: Types.ObjectId;
  userId: Types.ObjectId;
  optionId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionParticipationDocument = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sessionId: Types.ObjectId;
  role: SessionParticipationRole;
  status: SessionParticipationStatus;
  paymentId?: Types.ObjectId;
  amountPaidMinor: number;
  currency: "SGD";
  registeredAt: Date;
  attendanceMarkedAt?: Date;
  reminderSentAt?: Date;
  reviewPromptSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type PollVoteDocument = {
  _id: Types.ObjectId;
  message: Types.ObjectId;
  user: Types.ObjectId;
  optionIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type FeedPostDocument = {
  _id: Types.ObjectId;
  mockId: number;
  user: Types.ObjectId;
  activity?: Types.ObjectId;
  group?: Types.ObjectId;
  caption: string;
  image?: string;
  durationMinutes?: number;
  categories: string[];
  comments: Types.ObjectId[];
  likesCount: number;
  commentsNum: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CommentDocument = {
  _id: Types.ObjectId;
  post: Types.ObjectId;
  user: Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LikeDocument = {
  _id: Types.ObjectId;
  post: Types.ObjectId;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
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
    googleSubject: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
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

const vendorAccountSchema = new Schema<VendorAccountDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    googleSubject: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    passwordHash: { type: String, select: false },
    passwordSalt: { type: String, select: false },
  },
  { timestamps: true },
);

const settingsPreferencesSchema = new Schema<SettingsPreferences>(
  {
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

const friendshipSchema = new Schema<FriendshipDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    friendId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true },
);
friendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });

const chatSchema = new Schema<ChatDocument>(
  {
    mockId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastMessagePreview: { type: String, default: "" },
    lastMessageAt: { type: Date, default: null },
    lastMessageId: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
      default: null,
    },
    lastMessage: { type: String, default: "" },
    time: { type: String, default: "" },
    unread: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);
chatSchema.index({ members: 1 });
chatSchema.index({ members: 1, lastMessageAt: -1, _id: -1 });

const adminSchema = new Schema<AdminDocument>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    group: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
  },
  { timestamps: true },
);
adminSchema.index({ user: 1, group: 1 }, { unique: true });
adminSchema.index({ group: 1 });

const blacklistSchema = new Schema<BlacklistDocument>(
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

const chatMessageSchema = new Schema<ChatMessageDocument>(
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
chatMessageSchema.index({ chat: 1, createdAt: -1, _id: -1 });

const pollVoteSchema = new Schema<PollVoteDocument>(
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
    account: { type: Schema.Types.ObjectId, ref: "VendorAccount" },
    name: { type: String, required: true, trim: true },
    profileUrl: { type: String, trim: true },
    description: { type: String, trim: true },
    numAttended: { type: Number, required: true, default: 0, min: 0 },
    allActivities: [{ type: Schema.Types.ObjectId, ref: "Activity" }],
  },
  { timestamps: true },
);
vendorSchema.index({ account: 1 }, { unique: true, sparse: true });

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
    imageUrl: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);
tagSchema.index({ name: 1 }, { unique: true });

const activitySchema = new Schema<ActivityDocument>(
  {
    mockId: { type: Number, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    suitability: { type: String, trim: true, default: "", maxlength: 500 },
    host: { type: Schema.Types.ObjectId, required: false, ref: "Vendor" },
    rating: { type: Number, required: true, default: 5 },
    categories: [{ type: String, required: true }],
    imageUrls: {
      type: [{ type: String, trim: true }],
      required: true,
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 5,
        message: "An activity can have at most 5 images.",
      },
    },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    isVolunteer: { type: Boolean, required: true, default: false },
    isAAC: { type: Boolean, required: true, default: false },
    sessionsNum: { type: Number, required: true, default: 0, min: 0 },
    registeredCount: { type: Number, required: true, default: 0, min: 0 },
    attendedCount: { type: Number, required: true, default: 0, min: 0 },
    totalRevenue: { type: Number, required: true, default: 0, min: 0 },
    grossRevenueMinor: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);
activitySchema.index({ host: 1 });
activitySchema.index({ isAAC: 1 });

const sessionSchema = new Schema<SessionDocument>(
  {
    mockId: { type: Number, required: true, unique: true },
    activity: { type: Schema.Types.ObjectId, required: true, ref: "Activity" },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      default: "Session",
    },
    instructor: { type: String, trim: true, default: "", maxlength: 120 },
    startsAt: { type: Date, required: true },
    endAt: {
      type: Date,
      required: true,
      validate: {
        validator(
          this:
            | (mongoose.Document & SessionDocument)
            | mongoose.Query<unknown, SessionDocument>,
          value: Date,
        ) {
          const startsAt =
            this instanceof mongoose.Query ? this.get("startsAt") : this.startsAt;

          return (
            startsAt instanceof Date &&
            value instanceof Date &&
            value.getTime() - startsAt.getTime() >= 15 * 60 * 1000
          );
        },
        message: "Session end time must be at least 15 minutes after its start time.",
      },
    },
    spots: { type: Number, required: true, min: 1 },
    priceSgd: { type: Number, required: true, default: 0, min: 0 },
    isPremium: { type: Boolean, required: true, default: false },
    skillsFuturePayable: { type: Boolean, required: true, default: false },
    grossRevenueMinor: { type: Number, required: true, default: 0, min: 0 },
    pendingPaymentCount: { type: Number, required: true, default: 0, min: 0 },
    registeredCount: { type: Number, required: true, default: 0, min: 0 },
    attendedCount: { type: Number, required: true, default: 0, min: 0 },
    chat: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
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
sessionSchema.index({ isActive: 1, endAt: 1 });

const announcementSchema = new Schema<AnnouncementDocument>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Session",
    },
    chatId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Chat",
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: announcementTypes,
      required: true,
      default: "message",
    },
    poll: {
      options: [
        {
          _id: false,
          id: { type: String, required: true },
          label: { type: String, required: true, trim: true, maxlength: 100 },
        },
      ],
      allowsMultiple: { type: Boolean, required: true, default: false },
    },
  },
  { timestamps: true },
);
announcementSchema.index({ sessionId: 1, createdAt: 1 });
announcementSchema.index({ chatId: 1, createdAt: 1 });

const announcementVoteSchema = new Schema<AnnouncementVoteDocument>(
  {
    announcementId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Announcement",
    },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    optionId: { type: String, required: true },
  },
  { timestamps: true },
);
announcementVoteSchema.index(
  { announcementId: 1, userId: 1 },
  { unique: true },
);
announcementVoteSchema.index({ announcementId: 1 });

const sessionParticipationSchema = new Schema<SessionParticipationDocument>(
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
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    amountPaidMinor: { type: Number, required: true, default: 0, min: 0 },
    currency: {
      type: String,
      enum: ["SGD"],
      required: true,
      default: "SGD",
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

const feedPostSchema = new Schema<FeedPostDocument>(
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

const commentSchema = new Schema<CommentDocument>(
  {
    post: { type: Schema.Types.ObjectId, required: true, ref: "FeedPost" },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    body: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);
commentSchema.index({ post: 1, createdAt: 1, _id: 1 });
commentSchema.index({ user: 1, createdAt: -1 });

const likeSchema = new Schema<LikeDocument>(
  {
    post: { type: Schema.Types.ObjectId, required: true, ref: "FeedPost" },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true },
);
likeSchema.index({ post: 1, user: 1 }, { unique: true });
likeSchema.index({ user: 1, createdAt: -1 });

export const UserModel = mongoose.model<UserDocument>("User", userSchema, "users");
export const VendorAccountModel = mongoose.model<VendorAccountDocument>(
  "VendorAccount",
  vendorAccountSchema,
  "vendorAccounts",
);
export const SettingsModel = mongoose.model<SettingsDocument>(
  "Settings",
  settingsSchema,
  "settings",
);
export const NotificationModel = mongoose.model<NotificationDocument>(
  "Notification",
  notificationSchema,
  "notifications",
);
export const FavouriteModel = mongoose.model<FavouriteDocument>(
  "Favourite",
  favouriteSchema,
  "favourites",
);
export const ConsolidatedModel = mongoose.model<ConsolidatedDocument>(
  "Consolidated",
  consolidatedSchema,
  "consolidated",
);
export const FriendshipModel = mongoose.model<FriendshipDocument>(
  "Friendship",
  friendshipSchema,
  "friendships",
);
export const ChatModel = mongoose.model<ChatDocument>(
  "Chat",
  chatSchema,
  "chats",
);
export const AdminModel = mongoose.model<AdminDocument>(
  "Admin",
  adminSchema,
  "admins",
);
export const BlacklistModel = mongoose.model<BlacklistDocument>(
  "Blacklist",
  blacklistSchema,
  "blacklists",
);
export const ChatMessageModel = mongoose.model<ChatMessageDocument>(
  "ChatMessage",
  chatMessageSchema,
  "chatMessages",
);
export const VendorModel = mongoose.model<VendorDocument>(
  "Vendor",
  vendorSchema,
  "vendors",
);
export const RatingModel = mongoose.model<RatingDocument>(
  "Rating",
  ratingSchema,
  "ratings",
);
export const TagModel = mongoose.model<TagDocument>("Tag", tagSchema, "tags");
export const ActivityModel = mongoose.model<ActivityDocument>(
  "Activity",
  activitySchema,
  "activities",
);
export const SessionModel = mongoose.model<SessionDocument>(
  "Session",
  sessionSchema,
  "sessions",
);
export const AnnouncementModel = mongoose.model<AnnouncementDocument>(
  "Announcement",
  announcementSchema,
  "announcements",
);
export const AnnouncementVoteModel = mongoose.model<AnnouncementVoteDocument>(
  "AnnouncementVote",
  announcementVoteSchema,
  "announcementVotes",
);
export const SessionParticipationModel =
  mongoose.model<SessionParticipationDocument>(
    "SessionParticipation",
    sessionParticipationSchema,
    "sessionParticipations",
  );
export const PollVoteModel = mongoose.model<PollVoteDocument>(
  "PollVote",
  pollVoteSchema,
  "pollVotes",
);
export const FeedPostModel = mongoose.model<FeedPostDocument>(
  "FeedPost",
  feedPostSchema,
  "feedPosts",
);
export const CommentModel = mongoose.model<CommentDocument>(
  "Comment",
  commentSchema,
  "comments",
);
export const LikeModel = mongoose.model<LikeDocument>("Like", likeSchema, "likes");
