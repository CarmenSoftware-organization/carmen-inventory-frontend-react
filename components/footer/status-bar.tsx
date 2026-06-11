
import { Clock, Tag, User } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useServerTime } from "@/hooks/use-server-time";
import { useWhatsNew } from "@/hooks/use-whats-new";
import { formatDate } from "@/lib/date-utils";
import { APP_VERSION } from "@/lib/version";
import { WhatsNewDialog } from "./whats-new-dialog";

/**
 * Footer status bar
 *
 * Render `<footer role="contentinfo">` สูง h-6 แสดงชื่อผู้ใช้ + buCode
 * ด้านซ้าย และเวลา server ปัจจุบัน (`useServerTime`) + ปุ่มเวอร์ชันแอป
 * ด้านขวา เวอร์ชันอ่านจาก `lib/version.ts` (`APP_VERSION`) คลิกที่ปุ่ม
 * เพื่อเปิด What's New dialog และ dialog จะเด้งอัตโนมัติครั้งเดียวเมื่อมี
 * version ใหม่ (`useWhatsNew`) ใช้ `formatDate` ตาม `dateTimeFormat` จาก
 * profile ใส่ `suppressHydrationWarning` บน `<time>` รองรับ SSR/CSR mismatch
 *
 * @returns JSX element ของ status bar
 * @example
 * ```tsx
 * // ใส่ใน root layout ใต้ main
 * <StatusBar />
 * ```
 */
export function StatusBar() {
  const { data: profile, aliasName, buCode, dateTimeFormat } = useProfile();
  const now = useServerTime();
  const { shouldAutoOpen, markSeen } = useWhatsNew();
  const [manualOpen, setManualOpen] = useState(false);

  const whatsNewOpen = manualOpen || shouldAutoOpen;

  const fullName = profile?.user_info
    ? `${profile.user_info.firstname ?? ""} ${profile.user_info.lastname ?? ""}`.trim()
    : "";
  const displayName = fullName || aliasName || "—";
  const version = APP_VERSION.split("-")[0];
  const formattedTime = now ? formatDate(now.toISOString(), dateTimeFormat) : "";

  const handleOpenChange = (next: boolean) => {
    setManualOpen(next);
    if (!next) markSeen();
  };

  return (
    <>
      <footer
        role="contentinfo"
        data-slot="status-bar"
        className="bg-muted/40 text-muted-foreground flex h-6 shrink-0 items-center justify-between border-t px-3 text-[0.6875rem]"
      >
        <div className="flex items-center gap-1.5 truncate">
          <User aria-hidden="true" className="h-3 w-3" />
          <span className="truncate">{displayName}</span>
          {buCode && (
            <>
              <span aria-hidden="true" className="opacity-50">
                ·
              </span>
              <span className="truncate">{buCode}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Clock aria-hidden="true" className="h-3 w-3" />
            <time
              dateTime={now ? now.toISOString() : undefined}
              aria-live="off"
              suppressHydrationWarning
            >
              {formattedTime}
            </time>
          </div>
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            aria-label="What's new"
            className="hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Tag aria-hidden="true" className="h-3 w-3" />
            <span>v{version}</span>
          </button>
        </div>
      </footer>
      <WhatsNewDialog open={whatsNewOpen} onOpenChange={handleOpenChange} />
    </>
  );
}
