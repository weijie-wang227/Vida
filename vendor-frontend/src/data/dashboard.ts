import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  PackagePlus,
  UserRoundCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavSection = {
  label: string;
  items: Array<{
    id?:
      | "dashboard"
      | "upcoming"
      | "create-activity"
      | "create-session"
      | "volunteer-management"
      | "finances"
      | "users"
      | "chats";
    label: string;
    active?: boolean;
    icon: LucideIcon;
  }>;
};

export const navSections: NavSection[] = [
  {
    label: "Vendor",
    items: [
      { id: "dashboard", label: "My Dashboard", active: true, icon: LayoutDashboard },
      { id: "finances", label: "Finances", icon: CreditCard },
      { id: "users", label: "Users", icon: Users },
      { id: "chats", label: "Chats", icon: MessageCircle },
    ],
  },
  {
    label: "Activity Tools",
    items: [
      { id: "create-activity", label: "Create Activity", icon: PackagePlus },
      { id: "upcoming", label: "View All Activities", icon: CalendarDays },
      {
        id: "volunteer-management",
        label: "Volunteer Management",
        icon: UserRoundCog,
      },
    ],
  },
];
