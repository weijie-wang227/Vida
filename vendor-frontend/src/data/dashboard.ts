import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  PackagePlus,
  Settings,
  Sparkles,
  TicketPercent,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavSection = {
  label: string;
  items: Array<{
    id?: "dashboard" | "upcoming";
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
      { id: "upcoming", label: "Upcoming", icon: CalendarDays },
    ],
  },
  {
    label: "Activity Tools",
    items: [
      { label: "Create Activity", icon: PackagePlus },
      { label: "Activity Settings", icon: Settings },
      { label: "AI Optimiser", icon: Sparkles },
    ],
  },
  {
    label: "Marketing Centre",
    items: [
      { label: "Marketing Centre", icon: Megaphone },
      { label: "Ads", icon: BarChart3 },
      { label: "Affiliate Marketing", icon: Users },
      { label: "Discount Toolkit", icon: TicketPercent },
    ],
  },
];
