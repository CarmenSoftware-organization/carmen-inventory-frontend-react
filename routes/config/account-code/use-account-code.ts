import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { AccountCode, CreateAccountCodeDto } from "@/types/account-code";

/**
 * ผังบัญชีของ BU — `GET/POST/PATCH/DELETE /api/config/{bu}/chart-of-accounts`
 *
 * คนละของกับ account-code **mapping** ฝั่ง micro-business ซึ่งเป็น sub-resource
 * ของสินค้า/หมวดสินค้า (เขียนผ่าน `accountCodes: {add/update/remove}` ของ endpoint
 * นั้น ๆ) — ตัวนี้คือทะเบียนรหัสบัญชีที่ mapping ฝั่งโน้นเอาไปอ้าง
 */
const crud = createConfigCrud<AccountCode, CreateAccountCodeDto>({
  queryKey: QUERY_KEYS.ACCOUNT_CODES,
  endpoint: API_ENDPOINTS.CHART_OF_ACCOUNTS,
  label: "account code",
  updateMethod: "PATCH",
});

/** รายการผังบัญชีแบบแบ่งหน้า */
export const useAccountCode = crud.useList;

/** ผังบัญชีรายตัวตาม id */
export const useAccountCodeById = crud.useById;

/** สร้างผังบัญชีใหม่ */
export const useCreateAccountCode = crud.useCreate;

/** แก้ไขผังบัญชี */
export const useUpdateAccountCode = crud.useUpdate;

/** ลบผังบัญชี */
export const useDeleteAccountCode = crud.useDelete;
