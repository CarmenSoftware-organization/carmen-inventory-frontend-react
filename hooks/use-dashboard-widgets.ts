import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useBuCode } from "@/hooks/use-bu-code";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { httpClient } from "@/lib/http-client";
import type { DashboardWidgetListResponse } from "@/types/dashboard-widget";

function useDashboardWidgets(module: string) {
  const buCode = useBuCode();
  return useQuery<DashboardWidgetListResponse>({
    queryKey: [QUERY_KEYS.DASHBOARD_WIDGETS, buCode, module],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.DASHBOARD_WIDGETS(buCode!, module),
      );
      if (!res.ok)
        throw ApiError.fromResponse(
          res,
          `Failed to fetch ${module} dashboard widgets`,
        );
      const json = await res.json();
      return json.data as DashboardWidgetListResponse;
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

export function useProcurementWidgets() {
  return useDashboardWidgets("procurement");
}

export function useInventoryWidgets() {
  return useDashboardWidgets("inventory");
}

export function useProductWidgets() {
  return useDashboardWidgets("product");
}

export function useConfigWidgets() {
  return useDashboardWidgets("config");
}

export function useVendorWidgets() {
  return useDashboardWidgets("vendor-management");
}

export function useOperationPlanWidgets() {
  return useDashboardWidgets("operation-plan");
}
