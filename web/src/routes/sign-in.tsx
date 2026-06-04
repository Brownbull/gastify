import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useEffect } from "react";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const { user, loading, error, signInWithGoogle, signInWithTestAuth, signInWithTestAuthB } =
    useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      void navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{
            borderColor: "var(--primary)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div
        className="w-full max-w-sm space-y-6 rounded-xl p-8 shadow-lg"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div className="text-center">
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--primary)" }}
          >
            {t("app.name")}
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("auth.tagline")}
          </p>
        </div>

        {error && (
          <div
            className="rounded-lg p-3 text-sm"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--error) 10%, transparent)",
              color: "var(--error)",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={signInWithGoogle}
          data-testid="sign-in-google-button"
          className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-(--primary-light)"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          <GoogleIcon />
          {t("auth.signInGoogle")}
        </button>

        {signInWithTestAuth && (
          <button
            onClick={signInWithTestAuth}
            data-testid="sign-in-test-auth-button"
            className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-(--primary-light)"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Use test auth
          </button>
        )}

        {signInWithTestAuthB && (
          <button
            onClick={signInWithTestAuthB}
            data-testid="sign-in-test-auth-button-b"
            className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-(--primary-light)"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Use test auth (B)
          </button>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
