import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  ChartOfAccount,
  CreateChartOfAccountDto,
} from "@/types/chart-of-account";

/**
 * ผังบัญชีของ BU — `GET/POST/PATCH/DELETE /api/config/{bu}/chart-of-accounts`
 *
 * คนละของกับ account-code **mapping** ฝั่ง micro-business ซึ่งเป็น sub-resource
 * ของสินค้า/หมวดสินค้า (เขียนผ่าน `accountCodes: {add/update/remove}` ของ endpoint
 * นั้น ๆ) — ตัวนี้คือทะเบียนรหัสบัญชีที่ mapping ฝั่งโน้นเอาไปอ้าง
 */
const crud = createConfigCrud<ChartOfAccount, CreateChartOfAccountDto>({
  queryKey: QUERY_KEYS.CHART_OF_ACCOUNTS,
  endpoint: API_ENDPOINTS.CHART_OF_ACCOUNTS,
  label: "account code",
  updateMethod: "PATCH",
});

/** รายการผังบัญชีแบบแบ่งหน้า */
export const useChartOfAccount = crud.useList;

/** ผังบัญชีรายตัวตาม id */
export const useChartOfAccountById = crud.useById;

/** สร้างผังบัญชีใหม่ */
export const useCreateChartOfAccount = crud.useCreate;

/** แก้ไขผังบัญชี */
export const useUpdateChartOfAccount = crud.useUpdate;

/** ลบผังบัญชี */
export const useDeleteChartOfAccount = crud.useDelete;
