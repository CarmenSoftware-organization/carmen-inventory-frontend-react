import { useBackendVersion } from "@/hooks/use-backend-version";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
  APP_BUILD_TIME,
  APP_COMMIT,
  APP_VERSION,
  BUILD_TIME_FORMAT,
} from "@/lib/version";

/**
 * บรรทัดเวอร์ชันสำหรับหน้าที่ไม่มี footer status bar (หน้า auth ทุกหน้าผ่าน
 * `AuthSplitShell`) รูปแบบเดียวกับ status bar:
 *
 * `App v<app>  <commit>  ·  API v<backend version เต็ม>`
 *
 * ไว้ให้ผู้ใช้อ่านบอกตอนแจ้งปัญหาทั้งที่ยังเข้าระบบไม่ได้ — `GET /version` ของ
 * gateway เป็น public จึงเรียกได้ก่อน login ถ้า backend ตอบไม่ได้ ส่วน API
 * หายไปเงียบ ๆ (fail-soft เหมือน footer) เวลา build อยู่ใน `title`
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
  return <VersionLine apiVersion={backend?.version} className={className} />;
}

/**
 * ตัวแสดงผลล้วนของ `AppVersionLabel` (ไม่เรียก hook) — ใช้ตรง ๆ ในที่ที่ไม่มี
 * `QueryClientProvider` เช่น `RootErrorBoundary` ซึ่ง render แทน `AppRoot` ทั้งก้อน
 * ไม่ส่ง `apiVersion` = แสดงแค่ส่วน App
 *
 * @param apiVersion - เวอร์ชันเต็มจาก `GET /version` ของ gateway
 * @param className - class เพิ่มเติมของ `<p>`
 * @returns JSX element
 */
export function VersionLine({
  apiVersion,
  className,
}: {
  apiVersion?: string;
  className?: string;
}) {
  return (
    <p
      title={`Built ${formatDate(APP_BUILD_TIME, BUILD_TIME_FORMAT)}`}
      className={cn(
        "text-muted-foreground/70 text-micro-legal flex flex-wrap items-center justify-center gap-x-2 font-mono tabular-nums",
        className,
      )}
    >
      <span>
        <span className="opacity-70">App</span> v{APP_VERSION}
        <span className="ml-2">{APP_COMMIT}</span>
      </span>
      {apiVersion && (
        <>
          <span aria-hidden="true" className="opacity-50">
            ·
          </span>
          <span className="break-all">
            <span className="opacity-70">API</span> v{apiVersion}
          </span>
        </>
      )}
    </p>
  );
}
