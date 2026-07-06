import { useState, type FormEvent } from "react";
import {
  AtSign,
  Loader2,
  Lock,
  LogIn,
  UserRound,
  UserPlus,
} from "lucide-react";
import { useAppState } from "../state";
import { AppShell } from "./AppShell";

type AuthMode = "signin" | "signup";

function AuthLoadingScreen() {
  return (
    <div
      className="flex h-dvh min-h-dvh items-center justify-center overflow-hidden bg-background"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
        <div className="vida-auth-logo">
          <img src="/logo.png" alt="Vida" className="vida-logo-image" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-accent" />
          Opening Vida
        </div>
      </div>
    </div>
  );
}

function AuthModeTabs({
  mode,
  onModeChange,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 rounded-2xl bg-secondary p-1">
      {[
        { id: "signin" as const, label: "Sign in", Icon: LogIn },
        { id: "signup" as const, label: "Sign up", Icon: UserPlus },
      ].map(({ id, label, Icon }) => {
        const active = mode === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onModeChange(id)}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function AuthScreen() {
  const { signIn, signUp } = useAppState();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLocalError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      if (isSignup) {
        await signUp({ name, handle: handle || undefined, email, password });
      } else {
        await signIn({ email, password });
      }
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="h-dvh min-h-dvh overflow-hidden bg-background"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="vida-phone-shell relative mx-auto h-full w-full overflow-hidden px-5 py-6">
        <div className="relative flex min-h-[calc(100vh-3rem)] flex-col justify-center">
          <div className="mb-7">
            <div className="vida-auth-brand">
              <div className="vida-auth-logo">
                <img src="/logo.png" alt="Vida" className="vida-logo-image" />
              </div>
              <div>
                <p className="vida-auth-word text-3xl leading-none text-accent">
                  Vida
                </p>
                <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground">
                  {isSignup ? "Create your account" : "Welcome back"}
                </h1>
              </div>
            </div>
            <p className="mt-2 max-w-[310px] text-sm leading-relaxed text-muted-foreground">
              {isSignup
                ? "Join activities, groups, and friends around Singapore."
                : "Sign in to continue planning your next activity."}
            </p>
          </div>

          <AuthModeTabs mode={mode} onModeChange={handleModeChange} />

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignup && (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Name
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-input-background px-3">
                    <UserRound size={16} className="text-muted-foreground" />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="h-12 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder="Linda Tan"
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Handle
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-input-background px-3">
                    <AtSign size={16} className="text-muted-foreground" />
                    <input
                      value={handle}
                      onChange={(event) => setHandle(event.target.value)}
                      className="h-12 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder="lindatan"
                      autoComplete="username"
                    />
                  </div>
                </label>
              </>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Email
              </span>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-input-background px-3">
                <AtSign size={16} className="text-muted-foreground" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Password
              </span>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-input-background px-3">
                <Lock size={16} className="text-muted-foreground" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="At least 8 characters"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
              </div>
            </label>

            {localError && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {localError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isSignup ? (
                <UserPlus size={16} />
              ) : (
                <LogIn size={16} />
              )}
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AuthGate() {
  const { isAuthReady, isAuthenticated } = useAppState();

  if (!isAuthReady) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <AppShell />;
}
