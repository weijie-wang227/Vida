export type AuthUser = {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatar: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type Vendor = {
  id: string;
  owner: string;
  name: string;
  profileUrl: string;
  description: string;
  numAttended: number;
  allEvents: string[];
};

export type VendorStats = {
  revenue: number;
  newUsers: number;
  totalUsers: number;
};

export type VendorUsersPageSessionFillRate = {
  sessionId: string;
  sessionMockId: string;
  title: string;
  startsAt: string;
  label: string;
  booked: number;
  capacity: number;
  fillRate: number;
  status: "strong" | "warning" | "low";
};

export type VendorUsersPageStats = {
  totalBookings: number;
  totalBookingsTrendPercent: number;
  averageFillRate: number;
  sessionCount: number;
  noShowRate: number;
  noShowRateTrendPercent: number;
  repeatAttendeeRate: number;
  sessionFillRates: VendorUsersPageSessionFillRate[];
};

export type VendorUsersPageStatsResponse = {
  stats: VendorUsersPageStats;
};

export type VendorResponse = {
  vendor: Vendor | null;
  stats: VendorStats | null;
};

export type VidaCategory = "physical" | "social" | "cognitive" | "creative";

export type AvailableTag = {
  id: string;
  name: string;
};

export type BaseSession = {
  activity?: Activity;
  activityId?: number | string;
  activityMockId?: number;
  instructor?: string;
  startsAt: string;
  endAt: string;
  spots: number;
  location: string;
  lat: number;
  lng: number;
}

export type Session = BaseSession &{
  title: string;
  id?: string;
  objectId?: string;
  mockId: string;
  isOpen: boolean;
  isActive: boolean;
  registeredCount: number;
  attendedCount: number;
  rating: number;
};

export type CreateSessionInput = BaseSession & {
  vendorId: string;
  createAsVendor: true;
};

export type BaseActivity = {
  title: string;
  description?: string;
  suitability?: string;
  categories: VidaCategory[];
  imageUrls: string[];
  tags?: string[];
  isVolunteer: boolean;
  credits: number;
  isPremium: boolean;
  skillsFuturePayable: boolean;
}

export type CreateActivityInput = Omit<BaseActivity, "tags"> & {
  vendorId: string;
  createAsVendor: true;
  tagIds?: string[];
};

export type Activity = BaseActivity & {
  id: string;
  mockId: number;
  rating: number;
  isOpen: boolean;
  sessionsNum?: number;
  registeredCount?: number;
  totalRevenue?: number;
}

export type FinancePeriodKey = "ytd" | "mtd";

export type FinanceTrendPoint = {
  label: string;
  revenue: number;
};

export type FinanceActivity = {
  id: string;
  title: string;
  sessionsNum: number;
  registeredCount: number;
  totalRevenue: number;
  revenuePerSession: number;
  deltaVsAveragePercent: number;
};

export type FinancePeriod = {
  period: FinancePeriodKey;
  label: string;
  rangeLabel: string;
  revenue: number;
  revenueTrendPercent: number;
  bookings: number;
  bookingsTrendPercent: number;
  sessionsNum: number;
  averagePerSession: number;
  trend: FinanceTrendPoint[];
  activities: FinanceActivity[];
};

export type VendorFinanceResponse = {
  currency: "SGD";
  conversionRate: number;
  periods: Record<FinancePeriodKey, FinancePeriod>;
};

export type VendorFinanceActivityResponse = {
  currency: "SGD";
  conversionRate: number;
  activity: {
    id: string;
    title: string;
    sessionsYtd: number;
  };
  summary: {
    sessionsThisMonth: number;
    revenueThisMonth: number;
    averageAttendees: number;
    averagePerSession: number;
  };
  recentSessions: Array<{
    id: string;
    mockId: string;
    title: string;
    startsAt: string;
    registeredCount: number;
    revenue: number;
  }>;
};

export type VolunteerOpportunityStatus =
  | "open"
  | "full"
  | "closed"
  | "completed";

export type VolunteerOpportunity = {
  id: string;
  mockId: string;
  activityId: string;
  activityMockId?: number;
  title: string;
  activityTitle: string;
  startsAt: string;
  location: string;
  booked: number;
  capacity: number;
  status: VolunteerOpportunityStatus;
};

export type VolunteerOverviewResponse = {
  summary: {
    openOpportunities: number;
    fillRate: number;
    pendingReview: number;
    hoursThisMonth: number;
  };
  opportunities: VolunteerOpportunity[];
};

export type VolunteerRosterResponse = {
  session: {
    id: string;
    mockId: string;
    title: string;
    activityTitle: string;
  };
  volunteers: Array<{
    id: string;
    name: string;
    handle: string;
    avatar: string;
    status:
      | "registered"
      | "approved"
      | "rejected"
      | "completed"
      | "no_show";
  }>;
};

export type UpdateVolunteerApplicationResponse = {
  volunteer: {
    id: string;
    status: "approved" | "rejected";
  };
};

export type VendorActivitiesResponse = {
  activities: Activity[];
  stats?: VendorStats;
};

export type VendorSessionsResponse = {
  sessions: Session[];
};

export type DeleteVendorSessionResponse = {
  session: {
    id: string;
    mockId: number | string;
    title: string;
  };
  activity: {
    id: string;
    mockId: number;
    sessionsNum: number;
    registeredCount: number;
    attendedCount: number;
    totalRevenue: number;
  };
  deletedParticipationCount: number;
};

export type VendorChat = {
  id: string;
  mockId: number;
  name: string;
  avatar: string;
  memberCount: number;
  lastMessage: string;
  updatedAt: string;
  session: {
    id: string;
    mockId: string;
    title: string;
    startsAt: string;
    location: string;
    registeredCount: number;
    spots: number;
    isOpen: boolean;
    isActive: boolean;
  };
  activity: {
    id: string;
    mockId: number;
    title: string;
  };
};

export type VendorChatsResponse = {
  chats: VendorChat[];
};

export type VendorAnnouncementSession = {
  id: string;
  mockId: string;
  lastAnnouncement: string;
  updatedAt: string;
  session: {
    id: string;
    mockId: string;
    title: string;
    startsAt: string;
    location: string;
    registeredCount: number;
    spots: number;
    isOpen: boolean;
    isActive: boolean;
  };
  activity: {
    id: string;
    mockId: number;
    title: string;
  };
};

export type VendorAnnouncementsResponse = {
  sessions: VendorAnnouncementSession[];
};

type AnnouncementBase = {
  id: string;
  sessionId: string;
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

export type CreateAnnouncementResponse = {
  announcement: Announcement;
};

type VendorChatMessageBase = {
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

export type VendorChatMessage =
  | (VendorChatMessageBase & {
      type: "text";
      payload: { text: string };
    })
  | (VendorChatMessageBase & {
      type: "activity_invite";
      payload: {
        activity: {
          id: number | string;
          title: string;
          startsAt: string;
          location: string;
          durationMinutes: number;
          credits: number;
          categories: VidaCategory[];
        };
        session: { id: number | string; objectId: string };
        participatingFriends: Array<{
          id: number | string;
          name: string;
          handle: string;
          avatar: string;
        }>;
      };
    })
  | (VendorChatMessageBase & {
      type: "poll";
      payload: {
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
    });

export type CreateVendorChatMessageResponse = {
  message: VendorChatMessage;
};

export type VendorChatProfileActivity = {
  id: number | string;
  title: string;
  location: string;
  startsAt?: string;
};

export type AttendanceStatus =
  | "registered"
  | "approved"
  | "attended"
  | "no_show";

export type ActivityAttendee = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  status: AttendanceStatus;
  signedUpAt: string;
};

export type Onboarded = {
  userId: string;
  onboardedAt: string;
}

export type ActivityAttendeesResponse = {
  activity: {
    id: string;
    mockId: number;
    title: string;
  };
  attendees: ActivityAttendee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ActivityReview = {
  id: string;
  rating: number;
  review: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  } | null;
};

export type ActivityReviewsResponse = {
  session: {
    id: number;
    title: string;
    startsAt: string;
    location: string;
    rating: number;
  };
  reviews: ActivityReview[];
};

export type UpdateAttendanceResponse = {
  attendee: {
    id: string;
    status: AttendanceStatus;
  };
};

export type UpdateActivityOpenResponse = {
  activity: {
    id: string;
    mockId: number;
    title: string;
    isOpen: boolean;
  };
  session?: {
    id: string;
    mockId: number;
    title: string;
    isOpen: boolean;
  };
};

export type CreateVendorActivityResponse = {
  activity: {
    id: number | string;
    mockId?: number;
    title: string;
  };
  session?: null;
};

export type CreateVendorSessionResponse = {
  activity?: Activity;
  session?: {
    id: string;
    mockId?: number;
    activityId?: string | number;
    title?: string;
    isOpen?: boolean;
  };
  sessions?: Session[];
};
