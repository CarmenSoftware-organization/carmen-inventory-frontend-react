import { useDepartment } from "@/hooks/use-department";
import { useUser } from "@/hooks/use-user";
import { useVendor } from "@/hooks/use-vendor";
import { getUserFullName } from "@/components/lookup/lookup-user";
import type { Department } from "@/types/department";
import type { Vendor } from "@/types/vendor";
import type { User } from "@/types/workflows";
import { defineEntitySource } from "./entity-filter-source";

/** ผู้ขาย — clause `vendor_id|string:id1,id2` */
export const VENDOR_ENTITY = defineEntitySource<Vendor>({
  fieldKey: "vendor_id",
  useListHook: useVendor,
  getLabel: (v) => v.name,
});

/** แผนก — clause `department_id|string:id1,id2` */
export const DEPARTMENT_ENTITY = defineEntitySource<Department>({
  fieldKey: "department_id",
  useListHook: useDepartment,
  getLabel: (d) => d.name,
});

/**
 * ผู้ใช้ — default `requestor_id` (สะกดตาม schema ฝั่ง backend) · PO/CN/GRN กรอง
 * คนเปิดใบที่ `created_by_id` · ทะเบียนผู้ใช้ไม่มี `id` ต้องดึงตาม `user_id`
 * และห้ามส่ง `is_active` (users ได้ 0 แถว)
 */
export function requesterEntity(fieldKey = "requestor_id") {
  return defineEntitySource<User>({
    fieldKey,
    useListHook: useUser,
    getId: (u) => u.user_id,
    getLabel: getUserFullName,
    idFilterKey: "user_id",
    serverFilter: null,
  });
}
