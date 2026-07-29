import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useBuCode } from "@/hooks/use-bu-code";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { httpClient } from "@/lib/http-client";
import type {
  CreateMyDashboardWidgetDto,
  DashboardDatasetDetail,
  MyDashboardWidget,
  MyDashboardWidgetListResponse,
  UpdateMyDashboardWidgetDto,
} from "@/types/dashboard-widget";

// Personal widgets live in the selected BU's tenant schema, so every call is
// scoped by bu_code (resolved from the active business unit) in addition to the
// authenticated user.

export function useMyDashboardWidgets() {
  const buCode = useBuCode();
  return useQuery<MyDashboardWidgetListResponse>({
    queryKey: [QUERY_KEYS.MY_DASHBOARD_WIDGETS, buCode],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.MY_DASHBOARD_WIDGETS(buCode!),
      );
      if (!res.ok)
        throw await ApiError.from(
          res,
          "Failed to fetch personal dashboard widgets",
        );
      const json = await res.json();
      return json.data as MyDashboardWidgetListResponse;
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Query options ของ widget ที่ save แล้ว — แยกออกมาให้ `useQueries` ที่ dashboard
 * เรียกทีเดียวหลาย widget ได้ (parent ต้องรู้ว่าตัวไหนพัง เช่น dataset ไม่มีใน BU
 * นี้ ก่อนจะตัดสินใจ layout)
 *
 * ยิงตาม widget id ไม่ใช่ dataset id เพราะ backend อ่าน `params` ที่เก็บไว้บน
 * widget แล้ว execute ให้ จึงไม่ต้องส่ง params ซ้ำจากฝั่ง client
 *
 * ใช้ CACHE_DYNAMIC (1 นาที) เพราะค่าจริงเปลี่ยนได้ตามเวลา
 * คืน `{ meta, data }` พร้อม render ตาม `meta.shape`
 * @param buCode - รหัส business unit ปัจจุบัน
 * @param widgetId - ID ของ personal widget
 * @returns useQuery options ของ widget นั้น
 */
export function myDashboardWidgetDataQueryOptions(
  buCode: string | undefined,
  widgetId: string | undefined,
) {
  return {
    queryKey: [QUERY_KEYS.MY_DASHBOARD_WIDGET_DATA, buCode, widgetId],
    queryFn: async (): Promise<DashboardDatasetDetail> => {
      const res = await httpClient.get(
        API_ENDPOINTS.DASHBOARD_LAB_WIDGET_DATA(buCode!, widgetId!),
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch widget data");
      const json = await res.json();
      return json.data as DashboardDatasetDetail;
    },
    enabled: !!buCode && !!widgetId,
    ...CACHE_DYNAMIC,
  };
}

/**
 * Resolved data ของ widget เดี่ยว — สำหรับ caller ที่ไม่ต้องรวมหลายตัว
 * @param widgetId - ID ของ personal widget
 * @returns UseQueryResult ของ DashboardDatasetDetail
 */
export function useMyDashboardWidgetData(widgetId: string | undefined) {
  const buCode = useBuCode();
  return useQuery(myDashboardWidgetDataQueryOptions(buCode, widgetId));
}

export function useCreateMyDashboardWidget() {
  const queryClient = useQueryClient();
  const buCode = useBuCode();
  return useMutation<MyDashboardWidget, ApiError, CreateMyDashboardWidgetDto>({
    mutationFn: async (dto) => {
      const res = await httpClient.post(
        API_ENDPOINTS.MY_DASHBOARD_WIDGETS(buCode!),
        dto,
      );
      if (!res.ok)
        throw await ApiError.from(
          res,
          "Failed to create personal dashboard widget",
        );
      const json = await res.json();
      return json.data as MyDashboardWidget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MY_DASHBOARD_WIDGETS],
      });
    },
  });
}

export function useUpdateMyDashboardWidget() {
  const queryClient = useQueryClient();
  const buCode = useBuCode();
  return useMutation<
    MyDashboardWidget,
    ApiError,
    UpdateMyDashboardWidgetDto & { id: string }
  >({
    mutationFn: async ({ id, ...dto }) => {
      const res = await httpClient.patch(
        API_ENDPOINTS.MY_DASHBOARD_WIDGET_BY_ID(buCode!, id),
        dto,
      );
      if (!res.ok)
        throw await ApiError.from(
          res,
          "Failed to update personal dashboard widget",
        );
      const json = await res.json();
      return json.data as MyDashboardWidget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MY_DASHBOARD_WIDGETS],
      });
    },
  });
}

export function useDeleteMyDashboardWidget() {
  const queryClient = useQueryClient();
  const buCode = useBuCode();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      const res = await httpClient.delete(
        API_ENDPOINTS.MY_DASHBOARD_WIDGET_BY_ID(buCode!, id),
      );
      if (!res.ok)
        throw await ApiError.from(
          res,
          "Failed to delete personal dashboard widget",
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MY_DASHBOARD_WIDGETS],
      });
    },
  });
}
