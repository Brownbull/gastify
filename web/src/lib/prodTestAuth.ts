/**
 * Production-allowed email/password test login.
 *
 * Unlike `e2eAuth` (which is compiled OUT of production builds via
 * `!import.meta.env.PROD`), this path is INTENTIONALLY available in production so
 * a disposable test account can smoke-test the live deployment after the staging
 * environments are dropped. See docs/runbooks/PRODUCTION-TEST-USER.md.
 *
 * Default OFF: the email/password form only appears when
 * `VITE_PROD_TEST_AUTH_ENABLED === "true"`. No credentials are bundled — the
 * tester types the email + password into the form, so nothing secret ships in
 * the web bundle.
 */
export const prodTestAuthConfig = {
  enabled: import.meta.env.VITE_PROD_TEST_AUTH_ENABLED === "true",
} as const;
