import { useState, type FormEvent } from "react";
import {
  AtSign,
  Loader2,
  Lock,
  LogIn,
  Store,
  UserRound,
  UserPlus,
} from "lucide-react";
import type { AuthMode } from "../api/auth";
import { BrandLogo } from "../components/BrandLogo";

type LoginPageProps = {
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (
    mode: AuthMode,
    input: {
      name: string;
      handle?: string;
      email: string;
      password: string;
    },
  ) => Promise<void>;
};

export function LoginPage({ error, isSubmitting, onSubmit }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isSignup = mode === "signup";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(mode, { name, handle, email, password });
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card__brand">
          <BrandLogo />
          <div className="auth-card__badge">
            <Store size={16} />
            Vendor access
          </div>
        </div>

        <h1>{isSignup ? "Create your Vida account" : "Welcome back"}</h1>
        <p>
          {isSignup
            ? "Create an account, then set up your vendor profile to manage activities."
            : "Sign in to continue to your vendor centre."}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === "signin" ? "auth-tabs__button--active" : ""}
            onClick={() => setMode("signin")}
          >
            <LogIn size={15} />
            Sign in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "auth-tabs__button--active" : ""}
            onClick={() => setMode("signup")}
          >
            <UserPlus size={15} />
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label>
                <span>Name</span>
                <div className="auth-field">
                  <UserRound size={16} />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Linda Tan"
                    autoComplete="name"
                    required
                  />
                </div>
              </label>

              <label>
                <span>Handle</span>
                <div className="auth-field">
                  <AtSign size={16} />
                  <input
                    value={handle}
                    onChange={(event) => setHandle(event.target.value)}
                    placeholder="lindatan"
                    autoComplete="username"
                  />
                </div>
              </label>
            </>
          )}

          <label>
            <span>Email</span>
            <div className="auth-field">
              <AtSign size={16} />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="auth-field">
              <Lock size={16} />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </div>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 size={16} className="spin" />
            ) : isSignup ? (
              <UserPlus size={16} />
            ) : (
              <LogIn size={16} />
            )}
            {isSignup ? "Create account" : "Sign in"}
          </button>
        </form>
      </section>

      <section className="auth-preview" aria-hidden="true">
        <div className="auth-preview__panel">
          <span>Vendor metrics</span>
          <strong>Activities, attendance, and ratings in one place.</strong>
        </div>
      </section>
    </main>
  );
}
