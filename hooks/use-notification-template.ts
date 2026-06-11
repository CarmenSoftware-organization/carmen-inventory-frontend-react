import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  NotificationTemplate,
  CreateNotificationTemplateDto,
} from "@/types/noti-tmpl";

const crud = createConfigCrud<
  NotificationTemplate,
  CreateNotificationTemplateDto
>({
  queryKey: QUERY_KEYS.NOTIFICATION_TEMPLATES,
  endpoint: API_ENDPOINTS.NOTIFICATION_TEMPLATES,
  label: "notification template",
});

/**
 * Hook ดึงรายการ notification template แบบแบ่งหน้า
 *
 * Re-export จาก `createConfigCrud` factory — endpoint อิง config ของ BU ปัจจุบัน
 * (`/api/config/{bu}/notification-templates`). CRUD ส่วนที่เหลือ(create/update/delete)
 * ค่อย re-export เมื่อมีฟอร์มจัดการ
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @returns UseQueryResult ของ PaginatedResponse<NotificationTemplate>
 * @example
 * ```ts
 * const { data, isLoading } = useNotificationTemplates({ page: 1, perpage: 10 });
 * ```
 */
export const useNotificationTemplates = crud.useList;

/**
 * Hook ดึง notification template รายตัวตาม id
 *
 * @param id - id ของ template (undefined = ปิด query)
 * @returns UseQueryResult ของ NotificationTemplate
 * @example
 * ```ts
 * const { data } = useNotificationTemplateById(id);
 * ```
 */
export const useNotificationTemplateById = crud.useById;

/** Hook สร้าง notification template ใหม่ */
export const useCreateNotificationTemplate = crud.useCreate;

/** Hook แก้ไข notification template (ส่ง `{ id, ...payload }`) */
export const useUpdateNotificationTemplate = crud.useUpdate;

/** Hook ลบ notification template ตาม id */
export const useDeleteNotificationTemplate = crud.useDelete;
