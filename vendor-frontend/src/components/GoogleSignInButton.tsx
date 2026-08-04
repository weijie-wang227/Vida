import { useEffect, useRef } from "react";

type GoogleCredentialResponse = {
  credential: string;
};

type GoogleIdentityApi = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme: "outline";
      size: "large";
      shape: "rectangular";
      text: "continue_with";
      width: number;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentityApi;
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityServices() {
  if (window.google?.accounts.id) {
    return Promise.resolve();
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]',
      );
      const script = existingScript ?? document.createElement("script");
      const handleLoad = () => resolve();
      const handleError = () => {
        googleScriptPromise = null;
        reject(new Error("Unable to load Google sign-in."));
      };

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });

      if (!existingScript) {
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    });
  }

  return googleScriptPromise;
}

export function GoogleSignInButton({
  disabled,
  onCredential,
  onError,
}: {
  disabled?: boolean;
  onCredential: (credential: string) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const credentialHandlerRef = useRef(onCredential);
  const errorHandlerRef = useRef(onError);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  credentialHandlerRef.current = onCredential;
  errorHandlerRef.current = onError;

  useEffect(() => {
    if (!clientId) {
      return;
    }

    let active = true;

    void loadGoogleIdentityServices()
      .then(() => {
        const container = containerRef.current;
        const googleIdentity = window.google?.accounts.id;

        if (!active || !container || !googleIdentity) {
          return;
        }

        googleIdentity.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            void credentialHandlerRef.current(credential);
          },
        });
        container.replaceChildren();
        googleIdentity.renderButton(container, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: Math.max(200, Math.min(400, container.clientWidth)),
        });
      })
      .catch((error) => {
        if (active) {
          errorHandlerRef.current(
            error instanceof Error
              ? error.message
              : "Unable to load Google sign-in.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [clientId]);

  if (!clientId) {
    return null;
  }

  return (
    <div
      className={`auth-google__button${disabled ? " auth-google__button--disabled" : ""}`}
      aria-busy={disabled}
    >
      <div ref={containerRef} />
    </div>
  );
}
