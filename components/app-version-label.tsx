import { useBackendVersion } from "@/hooks/use-backend-version";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { APP_BUILD_TIME, APP_COMMIT, APP_VERSION } from "@/lib/version";

/**
 * บรรทัดเวอร์ชันตัวเล็กสำหรับหน้าที่ไม่มี footer status bar (เช่น `/login`)
 *
 * แสดง `v<app> · <commit> · <เวลา build> · api <backend>` ไว้ให้ผู้ใช้อ่านบอกตอนแจ้งปัญหา
 * ทั้งที่ยังเข้าระบบไม่ได้ — `GET /version` ของ gateway เป็น public จึงเรียกได้
 * ก่อน login ถ้า backend ตอบไม่ได้ ส่วน api หายไปเงียบ ๆ (fail-soft เหมือน footer)
 * เวลา build แสดงเป็น `YYYY-MM-DD HH:mm` (เวลาเครื่องผู้ใช้) เพราะยังไม่มี profile
 * ให้อ่านรูปแบบวันที่ ค่า ISO เต็มอยู่ใน `title`
 *
 * ไม่ผ่าน i18n — เป็นตัวเลขกับ hash ล้วน
 *
 * @param className - class เพิ่มเติมของ `<p>`
 * @returns JSX element
 * @example
 * ```tsx
 * <AppVersionLabel className="mt-6" />
 * ```
 */
export function AppVersionLabel({ className }: { className?: string }) {
  const { data: backend } = useBackendVersion();
  const parts = [
    `v${APP_VERSION}`,
    APP_COMMIT,
    formatDate(APP_BUILD_TIME, "YYYY-MM-DD HH:mm"),
  ];
  if (backend) parts.push(`api ${backend.version.split("-")[0]}`);

  return (
    <p
      title={`Built ${APP_BUILD_TIME}`}
      className={cn(
        "text-muted-foreground/60 text-micro-legal text-center tabular-nums",
        className,
      )}
    >
      {parts.join(" · ")}
    </p>
  );
}
