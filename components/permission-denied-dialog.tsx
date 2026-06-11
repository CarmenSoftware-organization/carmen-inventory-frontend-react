
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
 * Premium ERP style — destructive lock tile + eyebrow badge + refined typography
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
      <AlertDialogContent
        size="sm"
        className="border-destructive/25 overflow-hidden"
      >
        <style>{`
          @keyframes pd-tile-glow { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--destructive), transparent 70%); } 50% { box-shadow: 0 0 0 0.5rem color-mix(in oklch, var(--destructive), transparent 92%); } }
        `}</style>

        {/* Corner accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--destructive), transparent 78%) 0%, transparent 70%)",
          }}
        />

        <AlertDialogHeader>
          <AlertDialogMedia
            className="relative size-14 rounded-2xl bg-transparent"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklch, var(--destructive), transparent 78%) 0%, color-mix(in oklch, var(--destructive), transparent 90%) 100%)",
              animation: "pd-tile-glow 2.4s ease-in-out infinite",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)",
              }}
            />
            <ShieldOff
              className="text-destructive relative size-6"
              aria-hidden
            />
          </AlertDialogMedia>

          {/* Eyebrow badge */}
          <span className="bg-destructive/10 text-destructive border-destructive/20 relative inline-flex items-center gap-1 self-center rounded-full border px-2 py-0.5 text-[0.5625rem] font-bold tracking-[0.18em] uppercase">
            <span
              aria-hidden
              className="bg-destructive size-1 rounded-full"
              style={{ animation: "pd-tile-glow 2.4s ease-in-out infinite" }}
            />
            {t("eyebrow")}
          </span>

          <AlertDialogTitle className="text-sm">{t("title")}</AlertDialogTitle>

          <AlertDialogDescription className="text-xs leading-relaxed">
            {detail?.message ?? t("description")}
          </AlertDialogDescription>

          <p className="text-muted-foreground/80 mt-1 text-[0.6875rem] leading-relaxed">
            {t("contactAdmin")}
          </p>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex! justify-center">
          <AlertDialogAction
            size="sm"
            variant="outline"
            onClick={() => setDetail(null)}
            className="border-border/70"
          >
            {t("close")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
