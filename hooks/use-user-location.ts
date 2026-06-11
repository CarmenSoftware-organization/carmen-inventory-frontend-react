import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { CACHE_STATIC } from "@/lib/cache-config";
import type { Location } from "@/types/location";
import type { ParamsDto, PaginatedResponse } from "@/types/params";

export function useUserLocation(params?: ParamsDto) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<Location>>({
    queryKey: [QUERY_KEYS.USER_LOCATIONS, buCode, params],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.USER_LOCATIONS(buCode!), {
        perpage: params?.perpage ?? 30,
        page: params?.page,
        search: params?.search,
        filter: params?.filter,
      });
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch user locations");
      return res.json();
    },
    enabled: !!buCode,
    ...CACHE_STATIC,
  });
}
