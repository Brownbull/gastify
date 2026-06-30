import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const consentKeys = {
  all: ["consent"] as const,
  list: () => [...consentKeys.all, "list"] as const,
  register: () => [...consentKeys.all, "register"] as const,
  audit: () => [...consentKeys.all, "audit"] as const,
};

/** The signed-in user's per-purpose consent records (granted / revoked). */
export function useConsents() {
  return useQuery({
    queryKey: consentKeys.list(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/consent");
      if (error || !data) {
        throw new Error("Failed to fetch consents");
      }
      return data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * The active processing-purpose register (Ley 21.719 / GDPR Art 30) — drives the
 * consent toggles: one row per active purpose, with its legal description.
 */
export function useProcessingRegister() {
  return useQuery({
    queryKey: consentKeys.register(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/consent/processing-register");
      if (error || !data) {
        throw new Error("Failed to fetch processing register");
      }
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

/** Consent audit trail (grant/revoke history). Fetched lazily when opened. */
export function useConsentAudit(enabled: boolean) {
  return useQuery({
    queryKey: consentKeys.audit(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/consent/audit");
      if (error || !data) {
        throw new Error("Failed to fetch consent audit");
      }
      return data;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
