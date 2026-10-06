import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useBuCode } from "@/hooks/use-bu-code";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { httpClient } from "@/lib/http-client";
import type {
  BuDashboardWidgetListResponse,
  CreateBuDashboardWidgetDto,
  DashboardDatasetDetail,
  UpdateMyDashboardWidgetDto,
} from "@/types/dashboard-widget";

// BU widget อยู่ใน tenant schema ของ BU — ทุกคนใน BU เห็นชุดเดียวกัน
// query error ไม่เด้ง toast (มีแต่ mutation ที่ toast กลาง) และ retry: false —
// ถ้า backend ยังไม่ deploy (404/500) ผู้เรียกซ่อนส่วน BU เงียบ ๆ ได้จาก `isError`

/** module: "main" = หน้า /dashboard หลัก หรือชื่อ module dashboard */
export function useBuDashboardWidgets(module: string) {
  const buCode = useBuCode();
  return useQuery<BuDashboardWidgetListResponse, ApiError>({
    queryKey: [QUERY_KEYS.BU_DASHBOARD_WIDGETS, buCode, module],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.DASHBOARD_BU_WIDGETS(buCode!, module),
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch BU dashboard widgets");
      const json = await res.json();
      return json.data as BuDashboardWidgetListResponse;
    },
    enabled: !!buCode,
    retry: false,
    ...CACHE_DYNAMIC,
  });
}

export function buDashboardWidgetDataQueryOptions(
  buCode: string | undefined,
  widgetId: string,
  enabled = true,
) {
  return {
    queryKey: [QUERY_KEYS.BU_DASHBOARD_WIDGET_DATA, buCode, widgetId] as const,
    queryFn: async (): Promise<DashboardDatasetDetail> => {
      const res = await httpClient.get(
        API_ENDPOINTS.DASHBOARD_LAB_BU_WIDGET_DATA(buCode!, widgetId),
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch BU widget data");
      const json = await res.json();
      return json.data as DashboardDatasetDetail;
    },
    enabled: !!buCode && enabled,
    ...CACHE_DYNAMIC,
  };
}

function useInvalidateBuWidgets() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.BU_DASHBOARD_WIDGETS],
    });
}

export function useCreateBuDashboardWidget() {
  const buCode = useBuCode();
  const invalidate = useInvalidateBuWidgets();
  return useMutation<{ id: string }, ApiError, CreateBuDashboardWidgetDto>({
    mutationFn: async (dto) => {
      const res = await httpClient.post(
        API_ENDPOINTS.DASHBOARD_BU_WIDGETS(buCode!),
        dto,
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to create BU widget");
      return (await res.json()).data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateBuDashboardWidget() {
  const buCode = useBuCode();
  const invalidate = useInvalidateBuWidgets();
  return useMutation<unknown, ApiError, UpdateMyDashboardWidgetDto & { id: string }>({
    mutationFn: async ({ id, ...dto }) => {
      const res = await httpClient.patch(
        API_ENDPOINTS.DASHBOARD_BU_WIDGET_BY_ID(buCode!, id),
        dto,
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to update BU widget");
      return (await res.json()).data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteBuDashboardWidget() {
  const buCode = useBuCode();
  const invalidate = useInvalidateBuWidgets();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      const res = await httpClient.delete(
        API_ENDPOINTS.DASHBOARD_BU_WIDGET_BY_ID(buCode!, id),
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to delete BU widget");
    },
    onSuccess: invalidate,
  });
}

export function useReorderBuDashboardWidgets() {
  const buCode = useBuCode();
  const invalidate = useInvalidateBuWidgets();
  return useMutation<
    unknown,
    ApiError,
    { items: { id: string; order_index: number }[] }
  >({
    mutationFn: async (body) => {
      const res = await httpClient.patch(
        API_ENDPOINTS.DASHBOARD_BU_WIDGET_REORDER(buCode!),
        body,
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to reorder BU widgets");
      return (await res.json()).data;
    },
    onSuccess: invalidate,
  });
}
