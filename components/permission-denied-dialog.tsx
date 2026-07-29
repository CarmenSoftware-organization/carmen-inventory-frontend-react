import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { ShieldOff } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Permission } from "@/constant/permissions";

export const PERMISSION_DENIED_EVENT = "permission-denied";

interface PermissionDeniedDetail {
  permission?: Permission;
  message?: string;
}

/**
 * Dispatch event ให้ `PermissionDeniedDialog` แสดง — ใช้กับ click handler
 * ของ menu/link ที่ไม่มีสิทธิ์ หรือ guard ใน useCan
 */
export function dispatchPermissionDenied(
  permission?: Permission,
  message?: string,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PERMISSION_DENIED_EVENT, {
      detail: { permission, message },
    }),
  );
}

/**
 * Dialog แจ้งเตือนเมื่อผู้ใช้พยายามทำ action ที่ไม่มีสิทธิ์
 *
 * สัญญาณสีแดงมีจุดเดียวคือตัวไอคอน — กล่องรอบไอคอนเป็น `bg-muted` กลางๆ ตาม
 * default ของ `AlertDialogMedia` (ดู docs/DESIGN.md: "error state = red icon
 * only; neutral box, muted label, neutral border") โครงเดียวกับ `DeleteDialog`
 *
 * รับฟัง CustomEvent `"permission-denied"` จาก `dispatchPermissionDenied`
 */
export function PermissionDeniedDialog() {
  const [detail, setDetail] = useState<PermissionDeniedDetail | null>(null);
  const t = useTranslations("permissionDenied");

  useEffect(() => {
    const handler = (e: CustomEvent<PermissionDeniedDetail>) => {
      setDetail(e.detail ?? {});
    };
    globalThis.window.addEventListener(
      PERMISSION_DENIED_EVENT,
      handler as EventListener,
    );
    return () => {
      globalThis.window.removeEventListener(
        PERMISSION_DENIED_EVENT,
        handler as EventListener,
      );
    };
  }, []);

  return (
    <AlertDialog
      open={!!detail}
      onOpenChange={(open) => !open && setDetail(null)}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <ShieldOff className="text-destructive" aria-hidden />
          </AlertDialogMedia>

          <AlertDialogTitle>{t("title")}</AlertDialogTitle>

          <AlertDialogDescription>
            {detail?.message ?? t("description")}
          </AlertDialogDescription>

          <p className="text-muted-foreground/80 text-xs leading-relaxed">
            {t("contactAdmin")}
          </p>
        </AlertDialogHeader>

        {/* footer ของ size=sm เป็น grid-cols-2 — ปุ่มเดียวต้องบังคับให้อยู่กลาง */}
        <AlertDialogFooter className="flex! justify-center">
          <AlertDialogAction
            size="sm"
            variant="outline"
            onClick={() => setDetail(null)}
          >
            {t("close")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
