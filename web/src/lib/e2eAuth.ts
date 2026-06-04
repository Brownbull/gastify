/**
 * E2E-only email/password test auth (mirrors the mobile gated pattern). Lets a
 * Playwright run sign in a disposable test user without the Google OAuth popup.
 *
 * HARD-GATED: never active in a production build. `import.meta.env.PROD` is true for
 * `vite build` output, so even if VITE_E2E_AUTH_ENABLED leaked into a prod env the
 * bypass stays off. E2E runs against `vite dev` (PROD=false) with the flag set.
 */
export const e2eAuthConfig = {
  enabled:
    !import.meta.env.PROD && import.meta.env.VITE_E2E_AUTH_ENABLED === "true",
  email: (import.meta.env.VITE_E2E_AUTH_EMAIL as string | undefined) ?? "",
  password: (import.meta.env.VITE_E2E_AUTH_PASSWORD as string | undefined) ?? "",
  // Second disposable test user (B), for multi-user group/share e2e. The same B
  // account is used on web + mobile (no platform-exclusive accounts). Empty when
  // not configured — the "Use test auth (B)" button only appears when B is set.
  emailB: (import.meta.env.VITE_E2E_AUTH_EMAIL_B as string | undefined) ?? "",
  passwordB: (import.meta.env.VITE_E2E_AUTH_PASSWORD_B as string | undefined) ?? "",
} as const;
