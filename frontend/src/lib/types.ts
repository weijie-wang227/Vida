export type vidaCategory = "physical" | "social" | "cognitive" | "creative";
export type ActivityId = number;

export type VendorSummary = {
  id: string;
  name: string;
  profileUrl: string;
  description: string;
};

export type VendorStats = {
  activities: number;
  pastActivities: number;
  peopleAttended: number;
  attendanceRate: string;
  averageRating: number;
};

export type VendorActivity = {
  id: string;
  mockId: number;
  title: string;
  startsAt: string;
  location: string;
  spots: number;
  attendance: number;
  rating: number;
  isActive: boolean;
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
  title: string;
  host: string;
  startsAt: string;
  location: string;
  durationMinutes: number;
  spots: number;
  credits: number;
  rating: number;
  categories: vidaCategory[];
  tags: string[];
  isPremium: boolean;
  skillsFuturePayable: boolean;
  isOpen: boolean;
  isActive: boolean;
  cover?: string;
  vendor?: VendorSummary;
  joiningFriends: Friend[];
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
  credits: number;
  categories: vidaCategory[];
  cover?: string;
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
  credits: number;
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
  activity: {
    id: ActivityId;
    title: string;
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
    credits: number;
    categories: vidaCategory[];
  };
  joiningFriends: Friend[];
};

export type ChatMessage = {
  id: string;
  groupId: number;
  type: "text" | "activity_invite";
  sender: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    isAdmin: boolean;
  };
  body: string;
  time: string;
  createdAt: string;
  activityInvite?: ChatActivityInvite;
};

export type JoinActivityResponse = {
  activity: Activity;
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

export type Profile = {
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  stats: ProfileStat[];
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
