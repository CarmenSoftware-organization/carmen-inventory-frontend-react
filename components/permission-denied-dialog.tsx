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
import { DeniedReasonIcon } from "@/components/permission-denied-icon";
import type { Permission } from "@/constant/permissions";

export const PERMISSION_DENIED_EVENT = "permission-denied";

/**
 * ทำไมถึงเข้าไม่ได้ — สี่เหตุผลนี้ผู้ใช้แก้คนละวิธี จึงต้องบอกให้ตรง
 * - "permission": ไม่มีสิทธิ์ RBAC — ติดต่อผู้ดูแลขอสิทธิ์
 * - "license": feature ไม่อยู่ในสัญญาของ BU — ไม่ใช่เรื่องสิทธิ์ แก้ด้วยการซื้อ/เปิดสัญญา
 * - "expired": สัญญาหมดอายุ/ถูกระงับ — อ่านได้ เขียนไม่ได้ (บล็อกเฉพาะปุ่มเขียน)
 * - "seat": cluster มีผู้ใช้เกินจำนวนที่นั่งที่ซื้อไว้ (SEAT_LIMIT_EXCEEDED, Task 5.3) —
 *   อ่านได้ เขียนไม่ได้เหมือน "expired" แต่ทางแก้มีสองทาง (ปิดผู้ใช้ที่ไม่ใช้งาน หรือซื้อ
 *   ที่นั่งเพิ่ม) ต่างจาก "license"/"expired" ที่มีทางแก้เดียว — คำอธิบายจึงบอกทั้งสองทาง
 */
export type DeniedReason = "permission" | "license" | "expired" | "seat";

interface PermissionDeniedDetail {
  permission?: Permission;
  message?: string;
  reason?: DeniedReason;
}

export function dispatchPermissionDenied(
  permission?: Permission,
  message?: string,
  reason: DeniedReason = "permission",
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PERMISSION_DENIED_EVENT, {
      detail: { permission, message, reason },
    }),
  );
}

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

  const reason = detail?.reason ?? "permission";
  const title =
    reason === "license"
      ? t("licenseTitle")
      : reason === "expired"
        ? t("expiredTitle")
        : reason === "seat"
          ? t("seatTitle")
          : t("title");
  const description =
    detail?.message ??
    (reason === "license"
      ? t("licenseDescription")
      : reason === "expired"
        ? t("expiredDescription")
        : reason === "seat"
          ? t("seatDescription")
          : t("description"));

  return (
    <AlertDialog
      open={!!detail}
      onOpenChange={(open) => !open && setDetail(null)}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            {reason === "permission" ? (
              <ShieldOff className="text-destructive" aria-hidden />
            ) : (
              <DeniedReasonIcon reason={reason} />
            )}
          </AlertDialogMedia>

          <AlertDialogTitle>{title}</AlertDialogTitle>

          <AlertDialogDescription>{description}</AlertDialogDescription>

          {/* "ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์" เป็นทางแก้ของ reason "permission" เท่านั้น —
              "license" บอกให้ติดต่อฝ่ายขาย "expired" บอกให้ต่ออายุสัญญา และ "seat" บอกทั้ง
              สองทาง (ปิดผู้ใช้ที่ไม่ใช้งาน/ซื้อที่นั่งเพิ่ม) อยู่ในคำอธิบายด้านบนแล้วทุกกรณี
              การแปะบรรทัดนี้ทุก reason จึงขัดกันเอง */}
          {reason === "permission" && (
            <p className="text-muted-foreground/80 text-xs leading-relaxed">
              {t("contactAdmin")}
            </p>
          )}
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
