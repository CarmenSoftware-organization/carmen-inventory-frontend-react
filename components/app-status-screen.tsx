import { Ban, RotateCw, Wrench } from "lucide-react";
import { useLocale, useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { EyeBrow } from "@/components/ui/eye-brow";
import { useLogout } from "@/hooks/use-logout";
import {
  formatAppStatusTime,
  type AppStatusSnapshot,
} from "@/lib/app-status-store";
import { cn } from "@/lib/utils";

/**
 * หน้าเต็มจอแทนทั้งแอปเมื่อแอปปิดปรับปรุง (ผู้ใช้ไม่ได้รับยกเว้น) หรือถูกปิดใช้งาน
 *
 * root-layout เรนเดอร์ตัวนี้ **แทน** shell — sidebar/หน้าเพจไม่ถูก mount query ของหน้าจึงไม่ยิง
 * ใส่ 503 ซ้ำ ๆ · maintenance ไม่ logout: เมื่อ `useAppStatus` เจอ running หน้านี้หายไปเอง
 * ทั้งสองโหมดมีปุ่มออกจากระบบ (maintenance เป็นปุ่ม ghost รอง, disabled เป็นปุ่มหลัก)
 */
export function AppStatusScreen({
  snapshot,
  onRetry,
  isChecking,
}: {
  readonly snapshot: AppStatusSnapshot;
  readonly onRetry: () => void;
  readonly isChecking: boolean;
}) {
  const t = useTranslations("appStatus");
  const locale = useLocale();
  const logoutMutation = useLogout();
  const disabled = snapshot.status === "disabled";
  const Icon = disabled ? Ban : Wrench;

  return (
    <div
      className="bg-background flex min-h-dvh items-center justify-center px-6 py-16"
      role="alert"
    >
      <div className="bg-card flex w-full max-w-sm flex-col items-center rounded-xl border p-6 text-center">
        <div
          className={cn(
            "bg-muted mb-4 flex size-12 items-center justify-center rounded-xl",
            disabled ? "text-destructive" : "text-warning-ink",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>

        <EyeBrow>
          {t(disabled ? "disabledEyebrow" : "maintenanceEyebrow")}
        </EyeBrow>

        <h1 className="text-foreground mt-3 text-base font-semibold tracking-tight">
          {t(disabled ? "disabledTitle" : "maintenanceTitle")}
        </h1>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          {t(disabled ? "disabledDesc" : "maintenanceDesc")}
        </p>

        {/* ข้อความของแอดมิน — ไม่ผ่านระบบแปล แสดงตามที่พิมพ์ */}
        {snapshot.message && (
          <p className="text-foreground mt-3 text-xs leading-relaxed break-words whitespace-pre-line">
            {snapshot.message}
          </p>
        )}

        {!disabled && snapshot.until && (
          <p className="text-muted-foreground mt-3 text-xs">
            {t("untilLine", {
              time: formatAppStatusTime(snapshot.until, locale),
            })}
          </p>
        )}

        <div className="mt-5 flex w-full flex-col gap-2">
          {!disabled && (
            <Button
              type="button"
              size="sm"
              onClick={onRetry}
              disabled={isChecking}
            >
              <RotateCw />
              {t("checkNow")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant={disabled ? "default" : "ghost"}
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            {t("signOut")}
          </Button>
        </div>
      </div>
    </div>
  );
}
