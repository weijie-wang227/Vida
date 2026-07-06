import {
  Bell,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Lock,
  LogOut,
  Mail,
  Moon,
  Shield,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { vidaThemeMode } from "../app/themeMode";
import { FriendAvatar } from "../components/FriendAvatars";
import type { SettingsPreferences } from "../lib/types";
import { useAppState } from "../state";

type SettingToggleProps = {
  checked: boolean;
  description: string;
  icon: LucideIcon;
  label: string;
  onToggle: () => void;
};

type SettingsLinkProps = {
  description: string;
  icon: LucideIcon;
  label: string;
};

type ThemeModeSelectorProps = {
  mode: vidaThemeMode;
  onModeChange: (mode: vidaThemeMode) => void;
};

function SettingToggle({
  checked,
  description,
  icon: Icon,
  label,
  onToggle,
}: SettingToggleProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={onToggle}
        className={`flex h-7 w-12 flex-shrink-0 items-center rounded-full px-1 transition-colors ${
          checked ? "justify-end bg-accent" : "justify-start bg-secondary"
        }`}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
      </button>
    </div>
  );
}

function SettingsLink({ description, icon: Icon, label }: SettingsLinkProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left last:border-b-0"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
      <ChevronRight size={16} className="flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

function ThemeModeSelector({ mode, onModeChange }: ThemeModeSelectorProps) {
  const options: { id: vidaThemeMode; label: string; Icon: LucideIcon }[] = [
    { id: "light", label: "Light", Icon: Sun },
    { id: "dark", label: "Dark", Icon: Moon },
  ];

  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
        {mode === "light" ? (
          <Sun size={15} className="text-muted-foreground" />
        ) : (
          <Moon size={15} className="text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-foreground">Appearance</p>
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
          Choose the app theme for this device.
        </p>
      </div>
      <div className="flex flex-shrink-0 rounded-full bg-secondary p-1">
        {options.map(({ id, label, Icon }) => {
          const active = mode === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id)}
              className={`flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-colors ${
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              aria-pressed={active}
            >
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const {
    authUser,
    closeSettings,
    profile,
    settingsPreferences,
    signOut,
    updateSettingsPreferences,
  } = useAppState();

  const savePreferences = (patch: Partial<SettingsPreferences>) => {
    void updateSettingsPreferences({
      ...settingsPreferences,
      ...patch,
    }).catch(() => undefined);
  };

  const handleThemeModeChange = (mode: vidaThemeMode) => {
    savePreferences({ appearance: mode });
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 pt-5 pb-3">
        <button
          type="button"
          onClick={closeSettings}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
          aria-label="Back to profile"
        >
          <ChevronLeft size={17} className="text-foreground" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
          Settings
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-minimal">
        <section className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <FriendAvatar
              user={{
                name: profile.name || "vida profile",
                handle: profile.handle || authUser?.email || "",
                avatar: profile.avatar,
              }}
              className="h-12 w-12"
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-foreground">
                {profile.name || "vida profile"}
              </h2>
              <p className="truncate text-[11px] font-medium text-accent">
                {profile.handle || authUser?.email}
              </p>
              {authUser?.email ? (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {authUser.email}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <ThemeModeSelector
            mode={settingsPreferences.appearance}
            onModeChange={handleThemeModeChange}
          />
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <SettingToggle
            checked={settingsPreferences.activityReminders}
            description="Activity starts, group updates, and host messages."
            icon={Bell}
            label="Activity reminders"
            onToggle={() =>
              savePreferences({
                activityReminders: !settingsPreferences.activityReminders,
              })
            }
          />
          <SettingToggle
            checked={settingsPreferences.friendDiscovery}
            description="Let friends find you with your handle and QR invite."
            icon={UserRound}
            label="Friend discovery"
            onToggle={() =>
              savePreferences({
                friendDiscovery: !settingsPreferences.friendDiscovery,
              })
            }
          />
          <SettingToggle
            checked={settingsPreferences.privateActivityHistory}
            description="Hide past activities from profile visitors."
            icon={Lock}
            label="Private activity history"
            onToggle={() =>
              savePreferences({
                privateActivityHistory:
                  !settingsPreferences.privateActivityHistory,
              })
            }
          />
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <SettingsLink
            description="Manage profile visibility and friend requests."
            icon={Shield}
            label="Privacy"
          />
          <SettingsLink
            description="Email, password, and sign-in preferences."
            icon={Mail}
            label="Account"
          />
          <SettingsLink
            description="Get help with activities, groups, and invites."
            icon={HelpCircle}
            label="Support"
          />
        </section>

        <button
          type="button"
          onClick={signOut}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-secondary py-3 text-sm font-semibold text-foreground"
        >
          <LogOut size={15} className="text-muted-foreground" />
          Sign out
        </button>
      </div>
    </div>
  );
}
