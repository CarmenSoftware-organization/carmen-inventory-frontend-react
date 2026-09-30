import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { useBuCode } from "@/hooks/use-bu-code";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import type { AccountGroupMaster } from "@/types/accounting-master";

export const glAccountGroupsKey = (buCode: string | undefined) =>
  ["accounting-master", "account-groups", buCode] as const;

export function useGlAccountGroups() {
  const buCode = useBuCode();
  return useQuery({
    queryKey: glAccountGroupsKey(buCode),
    enabled: !!buCode,
    queryFn: async (): Promise<AccountGroupMaster[]> => {
      const res = await httpClient.get(API_ENDPOINTS.GL_ACCOUNT_GROUPS(buCode!));
      if (!res.ok) throw await ApiError.from(res, "Unable to load account groups");
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data ?? []);
    },
  });
}
