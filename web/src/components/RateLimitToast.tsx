import { useEffect, useState } from "react";
import { RATE_LIMIT_EVENT, type RateLimitDetail } from "@/lib/api";
import { useI18n } from "@/hooks/useI18n";

/**
 * Global "you're going too fast" toast — surfaces any 429 (RATE-LIMIT-PLAN row 10).
 * Minimal functional markup with a stable testid; the visual overhaul re-skins.
 * Mounted once at the app root; listens for the RATE_LIMIT_EVENT the API client
 * fires on a 429 and auto-dismisses.
 */
export function RateLimitToast() {
  const { t } = useI18n();
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  useEffect(() => {
    function onRateLimited(event: Event) {
      const detail = (event as CustomEvent<RateLimitDetail>).detail;
      setRetryAfter(detail?.retryAfterSeconds ?? 0);
    }
    window.addEventListener(RATE_LIMIT_EVENT, onRateLimited);
    return () => window.removeEventListener(RATE_LIMIT_EVENT, onRateLimited);
  }, []);

  useEffect(() => {
    if (retryAfter === null) return;
    const timer = setTimeout(() => setRetryAfter(null), 5000);
    return () => clearTimeout(timer);
  }, [retryAfter]);

  if (retryAfter === null) return null;

  const message =
    retryAfter > 0
      ? t("rateLimit.retryAfter").replace("{seconds}", String(retryAfter))
      : t("rateLimit.generic");

  return (
    <div
      role="alert"
      data-testid="rate-limit-toast"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-lg"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
        color: "var(--text)",
      }}
    >
      {message}
      <button
        type="button"
        data-testid="rate-limit-toast-dismiss"
        onClick={() => setRetryAfter(null)}
        className="ml-3 font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("rateLimit.dismiss")}
      </button>
    </div>
  );
}
