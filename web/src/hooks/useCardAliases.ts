import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { components } from "@/lib/api-types";

export type CardAlias = components["schemas"]["CardAliasResponse"];

export const cardAliasKeys = {
  all: ["card-aliases"] as const,
  list: (includeArchived: boolean) => [...cardAliasKeys.all, includeArchived] as const,
};

/**
 * The user's card aliases (`/card-aliases`) — user-named cards used to reconcile
 * statement lines (REQ-09). gastify stores only the alias name — never the card
 * number, CVV, or expiry. Powers Settings · Mis tarjetas.
 */
export function useCardAliases(includeArchived = false) {
  return useQuery({
    queryKey: cardAliasKeys.list(includeArchived),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/card-aliases", {
        params: { query: { include_archived: includeArchived } },
      });
      if (error || !data) {
        throw new Error("Failed to fetch card aliases");
      }
      return data;
    },
    staleTime: 60 * 1000,
  });
}
