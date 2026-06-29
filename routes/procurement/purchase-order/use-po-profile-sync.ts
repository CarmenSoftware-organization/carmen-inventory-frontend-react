
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { UserProfile } from "@/types/profile";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { PoFormValues } from "./po-form-schema";

interface UsePoProfileSyncOptions {
  form: UseFormReturn<PoFormValues>;
  profileData: UserProfile | undefined;
  purchaseOrder: PurchaseOrder | undefined;
}

/**
 * Hook sync ข้อมูล buyer จาก profile ของผู้ใช้ลงในฟอร์ม PO
 * ทำงานเฉพาะโหมดสร้างใหม่ (purchaseOrder = undefined)
 * ตั้งค่า buyer_id, buyer_name, email ถ้ายังว่างอยู่
 *
 * @param options - ตัวเลือกของ hook
 * @param options.form - UseFormReturn ของ PoFormValues
 * @param options.profileData - UserProfile จาก useProfile
 * @param options.purchaseOrder - PO ปัจจุบัน (ถ้ามีจะข้าม sync)
 * @returns void
 * @example
 * usePoProfileSync({ form, profileData: profile, purchaseOrder });
 */
export function usePoProfileSync({
  form,
  profileData,
  purchaseOrder,
}: UsePoProfileSyncOptions) {
  useEffect(() => {
    if (!purchaseOrder && profileData) {
      const name = [
        profileData.user_info?.firstname,
        profileData.user_info?.lastname,
      ]
        .filter(Boolean)
        .join(" ");
      if (profileData.id && !form.getValues("buyer_id")) {
        form.setValue("buyer_id", profileData.id);
      }
      if (name && !form.getValues("buyer_name")) {
        form.setValue("buyer_name", name);
      }
      if (profileData.email && !form.getValues("email")) {
        form.setValue("email", profileData.email);
      }
    }
  }, [purchaseOrder, profileData, form]);
}
