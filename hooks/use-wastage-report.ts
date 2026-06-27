import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  WastageReport,
  CreateWastageReportDto,
} from "@/types/wastage-reporting";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { wrMockData } from "@/routes/store-operation/wastage-reporting/wr-mock-data";
import { useMutation } from "@tanstack/react-query";

// ── TODO: เปลี่ยนเป็น API จริงเมื่อ backend พร้อม ──

/**
 * Hook ดึงรายการ wastage report แบบแบ่งหน้า (ปัจจุบันใช้ mock data)
 * จำลอง delay 300ms รองรับ search และ status filter ฝั่ง client
 * ทำ pagination ฝั่ง client เตรียมสลับเป็น API จริงเมื่อ backend พร้อม
 * @param params - พารามิเตอร์ค้นหา/กรอง/แบ่งหน้า
 * @returns ผลลัพธ์ useQuery ของ PaginatedResponse<WastageReport>
 * @example
 * const { data } = useWastageReport({ page: 1, search: "WR-001" });
 */
export function useWastageReport(params?: ParamsDto) {
  return useQuery<PaginatedResponse<WastageReport>>({
    queryKey: [QUERY_KEYS.WASTAGE_REPORTS, params],
    queryFn: async () => {
      // Mock: simulate API delay
      await new Promise((r) => setTimeout(r, 300));

      let filtered = [...wrMockData];

      // Search filter
      if (params?.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.wr_no.toLowerCase().includes(s) ||
            item.location_name.toLowerCase().includes(s) ||
            item.reason.toLowerCase().includes(s) ||
            item.reportor_name.toLowerCase().includes(s),
        );
      }

      // Status filter
      if (params?.filter) {
        const statusMatch = params.filter.match(/status\|string:(\w+)/);
        if (statusMatch) {
          filtered = filtered.filter(
            (item) => item.status === statusMatch[1],
          );
        }
      }

      const total = filtered.length;
      const page = Number(params?.page) || 1;
      const perpage = Number(params?.perpage) || 10;
      const start = (page - 1) * perpage;
      const paged = filtered.slice(start, start + perpage);

      return {
        data: paged,
        paginate: {
          total,
          page,
          perpage,
          pages: Math.ceil(total / perpage),
        },
      };
    },
  });
}

/**
 * Hook ดึงข้อมูล wastage report ตามรหัส (ปัจจุบันใช้ mock data)
 * จำลอง delay 200ms และ throw error หากไม่พบใน mock
 * จะไม่ fetch จนกว่าจะมี id
 * @param id - รหัส wastage report
 * @returns ผลลัพธ์ useQuery ของ WastageReport
 * @example
 * const { data } = useWastageReportById(params.id);
 */
export function useWastageReportById(id: string | undefined) {
  return useQuery<WastageReport>({
    queryKey: [QUERY_KEYS.WASTAGE_REPORTS, id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      const found = wrMockData.find((item) => item.id === id);
      if (!found) throw new Error("Wastage report not found");
      return found;
    },
    enabled: !!id,
  });
}

/**
 * Hook สร้าง wastage report ใหม่ (mock)
 * จำลอง delay 500ms และ invalidate WASTAGE_REPORTS cache เมื่อสำเร็จ
 * @returns mutation สำหรับสร้าง wastage report
 * @example
 * const create = useCreateWastageReport();
 * create.mutate(payload);
 */
export function useCreateWastageReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_data: CreateWastageReportDto) => {
      await new Promise((r) => setTimeout(r, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WASTAGE_REPORTS],
      });
    },
  });
}

/**
 * Hook แก้ไข wastage report (mock)
 * จำลอง delay 500ms และ invalidate cache เมื่อสำเร็จ
 * @returns mutation สำหรับอัพเดต wastage report
 * @example
 * const update = useUpdateWastageReport();
 * update.mutate({ id, ...values });
 */
export function useUpdateWastageReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_data: CreateWastageReportDto & { id: string }) => {
      await new Promise((r) => setTimeout(r, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WASTAGE_REPORTS],
      });
    },
  });
}

/**
 * Hook ลบ wastage report (mock)
 * จำลอง delay 500ms และ invalidate cache เมื่อสำเร็จ
 * @returns mutation สำหรับลบ wastage report
 * @example
 * const del = useDeleteWastageReport();
 * del.mutate(id);
 */
export function useDeleteWastageReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_id: string) => {
      await new Promise((r) => setTimeout(r, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WASTAGE_REPORTS],
      });
    },
  });
}
