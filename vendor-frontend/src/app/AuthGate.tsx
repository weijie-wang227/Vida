import { CreateVendorPage } from "../pages/CreateVendorPage";
import { LoginPage } from "../pages/LoginPage";
import { useVendorState } from "../state";
import { AppShell } from "./AppShell";

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="loading-screen">
      <img src="/logo.png" alt="Vida" />
      <span>{label}</span>
    </div>
  );
}

export function AuthGate() {
  const {
    status,
    error,
    isSubmitting,
    submitAuth,
    signInWithGoogle,
    createVendorProfile,
  } = useVendorState();

  if (status === "loading" || status === "vendor-check") {
    return (
      <LoadingScreen
        label={status === "loading" ? "Opening Vida" : "Checking vendor"}
      />
    );
  }

  if (status === "auth") {
    return (
      <LoginPage
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={submitAuth}
        onGoogleSignIn={signInWithGoogle}
      />
    );
  }

  if (status === "vendor-create") {
    return (
      <CreateVendorPage
        error={error}
        isSubmitting={isSubmitting}
        onCreate={createVendorProfile}
      />
    );
  }

  return <AppShell />;
}
