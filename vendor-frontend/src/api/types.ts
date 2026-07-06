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
  activities: number;
  peopleAttended: number;
  averageRating: number;
};

export type VendorResponse = {
  vendor: Vendor | null;
  stats: VendorStats | null;
};

export type VidaCategory = "physical" | "social" | "cognitive" | "creative";

export type VendorActivity = {
  id: string;
  mockId: number;
  title: string;
  startsAt: string;
  location: string;
  spots: number;
  attendance: number;
  rating: number;
};

export type ActivityAttendee = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  attended: boolean;
  signedUpAt: string;
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
  categories: VidaCategory[];
  vendorId: string;
  createAsVendor: true;
};

export type VendorActivitiesResponse = {
  activities: VendorActivity[];
  stats: VendorStats;
};

export type ActivityAttendeesResponse = {
  activity: {
    id: string;
    mockId: number;
    title: string;
  };
  attendees: ActivityAttendee[];
};

export type UpdateAttendanceResponse = {
  attendee: {
    id: string;
    attended: boolean;
  };
};
