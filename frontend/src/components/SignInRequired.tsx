import { LogIn } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAppState } from "../state";

export type SignInLocationState = {
  returnTo?: string;
};

export function getReturnPath({
  pathname,
  search,
  hash,
}: {
  pathname: string;
  search: string;
  hash: string;
}) {
  return `${pathname}${search}${hash}`;
}

export function SignInRequired() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-full items-center justify-center bg-background px-6 text-center">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-accent">
          <LogIn size={24} />
        </span>
        <h1 className="mt-4 text-lg font-bold text-foreground">
          Please sign in to view this page
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sign in to access your Vida account and continue where you left off.
        </p>
        <button
          type="button"
          onClick={() =>
            navigate("/signin", {
              state: { returnTo: getReturnPath(location) } satisfies SignInLocationState,
            })
          }
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground transition-transform active:scale-[0.98]"
        >
          <LogIn size={16} />
          Sign in
        </button>
      </div>
    </div>
  );
}

export function RequireSignIn({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAppState();

  return isAuthenticated ? children : <SignInRequired />;
}
