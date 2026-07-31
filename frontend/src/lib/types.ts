export type vidaCategory = "physical" | "social" | "cognitive" | "creative";
export type ActivityId = number;

export type VendorSummary = {
  id: string;
  name: string;
  profileUrl: string;
  description: string;
};

export type VendorStats = {
  revenue: number;
  newUsers: number;
  totalUsers: number;
};

export type AvailableTag = {
  id: string;
  name: string;
  imageUrl?: string;
};

export type VendorActivity = {
  id: string;
  mockId: number;
  title: string;
  description: string;
  categories: vidaCategory[];
  imageUrls: string[];
  tags: string[];
  isVolunteer: boolean;
  rating: number;
  isOpen: boolean;
};

export type VendorSession = {
  id: string;
  objectId?: string;
  mockId: string;
  activity?: VendorActivity;
  activityId: string | number;
  activityMockId?: number;
  title: string;
  startsAt: string;
  endAt: string;
  location: string;
  spots: number;
  priceSgd: number;
  isPremium: boolean;
  skillsFuturePayable: boolean;
  isOpen: boolean;
  isActive: boolean;
  attendedCount: number;
  rating: number;
};

export type ActivitySession = {
  id: string | number;
  objectId?: string;
  mockId?: string | number;
  activityId?: string | number;
  activityMockId?: number;
  title: string;
  startsAt: string;
  endAt: string;
  location: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  spots: number;
  priceSgd: number;
  registeredCount: number;
  attendedCount: number;
  groupId?: number;
  chat?: string;
  isPremium: boolean;
  skillsFuturePayable: boolean;
  isOpen: boolean;
  isActive: boolean;
  participatingFriends?: Friend[];
};

export type Friend = {
  id: number;
  name: string;
  handle: string;
  avatar: string;
};

export type FriendSearchResult = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
};

export type Activity = {
  id: ActivityId;
  objectId?: string;
  sessionId?: ActivityId;
  activityId?: ActivityId;
  activityObjectId?: string;
  title: string;
  description?: string;
  suitability?: string;
  host: string;
  startsAt: string;
  location: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  endAt: string;
  registeredCount: number;
  attendedCount: number;
  rating: number;
  categories: vidaCategory[];
  tags: string[];
  isVolunteer: boolean;
  isOpen: boolean;
  isActive: boolean;
  imageUrls: string[];
  vendor?: VendorSummary;
  sessions?: ActivitySession[];
  participatingFriends: Friend[];
  joinDisabledReason?: string;
};

export type CreateActivityInput = {
  title: string;
  startsAt: string;
  location: string;
  latitude: number;
  longitude: number;
  durationMinutes: number;
  spots: number;
  priceSgd: number;
  categories: vidaCategory[];
  tagIds?: string[];
  imageUrls?: string[];
  groupId?: number;
};

export type CreateActivityResponse = {
  activity: Activity;
  mapPin: MapPin;
  group: GroupChat;
};

export type PreviousActivity = {
  id: ActivityId;
  title: string;
  startsAt: string;
  location: string;
};

export type ActivityTemplate = {
  id: ActivityId;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  durationMinutes: number;
  spots: number;
  priceSgd: number;
  categories: vidaCategory[];
  groupId?: number;
};

export type ActivityReview = {
  id: string;
  activityId: string;
  rating: number;
  review: string;
};

export type ActivityReviewResponse = {
  activity?: {
    id: ActivityId;
    title: string;
    startsAt: string;
  };
  session?: {
    id: ActivityId;
    title: string;
    sessionTitle?: string;
    startsAt: string;
  };
  review: ActivityReview | null;
};

export type SubmitActivityReviewInput = {
  rating: number;
  review: string;
};

export type FeedPost = {
  id: number;
  user: string;
  handle: string;
  avatar: string;
  createdAt: string;
  caption: string;
  image?: string;
  likesCount: number;
  likedByMe: boolean;
  comments: number;
  activity?: string;
  durationMinutes?: number;
  categories: vidaCategory[];
  group?: FeedPostGroupReference;
};

export type FeedComment = {
  id: string;
  postId: number;
  user: string;
  handle: string;
  avatar: string;
  body: string;
  createdAt: string;
};

export type FeedPostGroupReference = {
  id: number;
  name: string;
  avatar: string;
  members: number;
};

export type Notification = {
  id: string;
  dateReceived: string;
  title: string;
  content: string;
  link?: string;
  read: boolean;
};

export type GroupMember = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  isAdmin: boolean;
};

export type CreateFeedPostInput = {
  caption: string;
  image?: string;
  groupId?: number;
  categories: vidaCategory[];
  durationMinutes: number;
};

export type UpdateFeedPostInput = {
  caption: string;
};

export type CreateFeedCommentInput = {
  body: string;
};

export type FeedCommentsResponse = {
  comments: FeedComment[];
  commentCount: number;
};

export type CreateFeedCommentResponse = {
  comment: FeedComment;
  commentCount: number;
};

export type FeedLikeResponse = {
  postId: number;
  likesCount: number;
  likedByMe: boolean;
};

export type GroupChat = {
  id: number;
  sessionId?: string;
  name: string;
  members: number;
  memberList?: GroupMember[];
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isAdmin: boolean;
};

export type ChatActivityInvite = {
  activity: {
    id: ActivityId;
    title: string;
    startsAt: string;
    location: string;
    durationMinutes: number;
    priceSgd: number;
    categories: vidaCategory[];
  };
  session: {
    id: ActivityId;
    objectId: string;
  };
  participatingFriends: Friend[];
};

type ChatMessageBase = {
  id: string;
  groupId: number;
  schemaVersion: number;
  sender: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    isAdmin: boolean;
  };
  time: string;
  createdAt: string;
};

export type ChatPoll = {
  question: string;
  options: Array<{
    id: string;
    label: string;
    votes: number;
    selected: boolean;
  }>;
  allowsMultiple: false;
  totalVotes: number;
};

export type ChatMessage =
  | (ChatMessageBase & {
      type: "text";
      payload: { text: string };
    })
  | (ChatMessageBase & {
      type: "activity_invite";
      payload: ChatActivityInvite;
    })
  | (ChatMessageBase & {
      type: "poll";
      payload: ChatPoll;
    });

type AnnouncementBase = {
  id: string;
  sessionId: string;
  chatId: string;
  groupId?: number;
  content: string;
  createdAt: string;
};

export type Announcement =
  | (AnnouncementBase & {
      type: "message";
    })
  | (AnnouncementBase & {
      type: "poll";
      poll: {
        options: Array<{
          id: string;
          label: string;
          votes: number;
          selected: boolean;
        }>;
        allowsMultiple: false;
        totalVotes: number;
      };
    });

export type JoinActivityResponse = {
  activity: Activity;
  session?: ActivitySession;
  group: GroupChat;
};

export type SendGroupMessageResponse = {
  message: ChatMessage;
  group: GroupChat;
};

export type JoinGroupResponse = {
  group: GroupChat;
};

export type GroupMutationResponse = {
  group: GroupChat;
};

export type MapPin = {
  id: number;
  activityId: ActivityId;
  sessionId?: ActivityId;
  registeredCount: number;
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  label: string;
  premium?: boolean;
  categories?: vidaCategory[];
};

export type ProfileStat = {
  label: string;
  value: string;
};

export type PollVoteResponse = {
  message: ChatMessage;
};

export type Profile = {
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  stats: ProfileStat[];
};

export type PaymentCheckoutResponse = {
  paymentId: string;
  status: "pending";
  checkoutUrl: string;
  amountMinor: number;
  currency: "SGD";
  expiresAt: string;
};

export type PaymentStatus =
  | "creating"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "needs_review"
  | "refund_pending"
  | "refunded";

export type PaymentStatusResponse = {
  paymentId: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  amountMinor: number;
  currency: "SGD";
  expiresAt: string;
  failureReason?: string;
  sessionId?: ActivityId;
  activityId?: string;
  groupId?: number;
  joined: boolean;
};

export type UpdateProfileInput = {
  name: string;
  handle: string;
  bio: string;
  avatar?: string;
};

export type SettingsPreferences = {
  appearance: "light" | "dark";
  activityReminders: boolean;
  friendDiscovery: boolean;
  privateActivityHistory: boolean;
};

export type RemoteSettingsPreferences = Omit<SettingsPreferences, "appearance">;

export type HandleAvailability = {
  handle: string;
  available: boolean;
  message?: string;
};

export type AuthUser = Profile & {
  id: string;
  email: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = SignInInput & {
  name: string;
  handle?: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
