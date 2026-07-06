import {
  Camera,
  MessageCircle,
  Mountain,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import {
  VidaProgressLogo,
  type VidaLogoLevels,
} from "../components/VidaProgressLogo";
import type { AppTab } from "../state";

type NavItem = {
  id: AppTab;
  label: string;
  Icon: LucideIcon;
  path: string;
};

const navItems: NavItem[] = [
  {
    id: "activities",
    label: "Activities",
    Icon: Mountain,
    path: "/activities",
  },
  { id: "feed", label: "Feed", Icon: Camera, path: "/feed" },
  { id: "chat", label: "Groups", Icon: MessageCircle, path: "/groups" },
  { id: "profile", label: "Profile", Icon: UserRound, path: "/profile" },
];

const leftNavItems = navItems.slice(0, 2);
const rightNavItems = navItems.slice(2);

function NavButton({ item }: { item: NavItem }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active =
    location.pathname === item.path ||
    (item.path !== "/activities" &&
      location.pathname.startsWith(`${item.path}/`));
  const color = active ? "var(--accent)" : "var(--muted-foreground)";

  return (
    <button
      type="button"
      onClick={() => navigate(item.path)}
      className="flex-1 flex flex-col items-center gap-1 pt-1 active:scale-90 transition-transform"
    >
      <div className="relative">
        <item.Icon
          size={22}
          strokeWidth={active ? 2.5 : 1.5}
          style={{ color }}
        />
      </div>
      <span className="text-[10px] font-semibold" style={{ color }}>
        {item.label}
      </span>
      <div
        className={`w-1 h-1 rounded-full bg-accent transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}

export function BottomNavigation({
  levels,
  onLogoClick,
}: {
  levels: VidaLogoLevels;
  onLogoClick: () => void;
}) {
  const location = useLocation();
  const hasFullScreenView =
    /^\/activities\/[^/]+$/.test(location.pathname) ||
    /^\/groups\/[^/]+$/.test(location.pathname) ||
    location.pathname === "/settings";

  if (hasFullScreenView) {
    return null;
  }

  return (
    <div
      className="vida-bottom-navigation flex items-start px-2 pt-2"
      style={{
        background:
          "linear-gradient(to top, var(--background) 62%, rgba(23,22,37,0))",
        borderTop: "1px solid var(--border)",
      }}
    >
      {leftNavItems.map((item) => (
        <NavButton key={item.id} item={item} />
      ))}

      <button
        type="button"
        className="vida-bottom-logo-button flex-1 flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        onClick={onLogoClick}
        aria-label="Open vida progress"
      >
        <VidaProgressLogo levels={levels} />
      </button>

      {rightNavItems.map((item) => (
        <NavButton key={item.id} item={item} />
      ))}
    </div>
  );
}
