import type { AuthMode } from "../api/auth";
import type {
  Activity,
  VendorAccount,
  CreateActivityInput,
  CreateSessionInput,
  CreateVendorActivityResponse,
  CreateVendorSessionResponse,
  Onboarded,
  Session,
  UpdateSessionInput,
  UpdateVendorSessionResponse,
  Vendor,
  VendorStats,
} from "../api/types";
import type { CreateVendorInput, UpdateVendorProfileInput } from "../api/vendors";

export type VendorAppStatus =
  | "loading"
  | "auth"
  | "vendor-check"
  | "vendor-create"
  | "ready";

export type AuthSubmitInput = {
  name: string;
  email: string;
  password: string;
};

export type VendorState = {
  status: VendorAppStatus;
  account: VendorAccount | null;
  vendor: Vendor | null;
  stats: VendorStats | null;
  activities: Activity[];
  sessions: Session[];
  onboarded: Onboarded[];
  error: string | null;
  activityError: string | null;
  isSubmitting: boolean;
  isCreatingActivity: boolean;
  updatingSessionId: string | null;
  deletingSessionId: string | null;
  submitAuth: (mode: AuthMode, input: AuthSubmitInput) => Promise<void>;
  signInWithGoogle: (credential: string, password?: string) => Promise<void>;
  createVendorProfile: (input: CreateVendorInput) => Promise<void>;
  signOut: () => void;
  createActivity: (
    input: CreateActivityInput,
  ) => Promise<CreateVendorActivityResponse>;
  createSession: (
    input: CreateSessionInput,
  ) => Promise<CreateVendorSessionResponse>;
  updateSessionDetails: (
    sessionId: number | string,
    input: UpdateSessionInput,
  ) => Promise<UpdateVendorSessionResponse>;
  updateVendorProfile: (input: UpdateVendorProfileInput) => Promise<void>;
  toggleSessionOpen: (
    sessionId: number | string,
    isOpen: boolean,
  ) => Promise<void>;
  deleteSession: (sessionId: number | string) => Promise<void>;
};
