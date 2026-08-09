
import { Clock, Tag, User } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useServerTime } from "@/hooks/use-server-time";
import { useWhatsNew } from "@/hooks/use-whats-new";
import { formatDate } from "@/lib/date-utils";
import { APP_VERSION } from "@/lib/version";

// Lazy: changelog.json (ยาวขึ้นเรื่อย ๆ ~57 รายการ/release) ต้องไม่ค้างอยู่ใน
// shared chunk ที่ทุกหน้าโหลด — loader ตัวนี้จะถูกเรียกก็ต่อเมื่อ dialog เปิด
// จริงเท่านั้น (ดู `shouldMount` ด้านล่าง) การ `lazy()` เฉย ๆ ไม่พอ เพราะถ้า
// render ตัว component ทุกครั้ง React จะเรียก loader ตั้งแต่ render แรก
const WhatsNewDialog = lazy(() =>
  import("./whats-new-dialog").then((m) => ({ default: m.WhatsNewDialog })),
);

/**
 * Footer status bar
 *
 * Render `<footer role="contentinfo">` สูง h-6 แสดงชื่อผู้ใช้ + buCode
 * ด้านซ้าย และเวลา server ปัจจุบัน (`useServerTime`) + ปุ่มเวอร์ชันแอป
 * ด้านขวา เวอร์ชัน (`APP_VERSION`) ฉีดตอน build จาก `package.json` คลิกที่ปุ่ม
 * เพื่อเปิด What's New dialog และ dialog จะเด้งอัตโนมัติครั้งเดียวเมื่อมี
 * version ใหม่ (`useWhatsNew`) ใช้ `formatDate` ตาม `dateTimeFormat` จาก
 * profile ใส่ `suppressHydrationWarning` บน `<time>` รองรับ SSR/CSR mismatch
 *
 * `WhatsNewDialog` ถูก `lazy()` **และ** render เฉพาะตอนเปิดจริงเท่านั้น
 * (`shouldMount`) — `changelog.json` (ที่มันดึงมาแสดง) จึงอยู่ใน chunk แยก
 * (`changelog-*.js` ~27.7 kB gzip) ที่ browser ไม่ดึงเลยถ้าผู้ใช้ไม่เปิด dialog
 * ไม่ใช่แค่ย้ายออกจาก shared chunk แล้วโดน preload ตามมาทุกหน้าอยู่ดี
 *
 * ที่ต้องเป็น "เปิดครั้งแรกแล้วค้างไว้" (`everOpened` ไม่ใช่ `{open && …}`
 * เปล่า ๆ) เพราะ `DialogContent` มี exit animation
 * (`data-[state=closed]:animate-out`) ที่ Radix เล่นตอน `open` เป็น false —
 * ถ้า unmount พร้อมกันตอนปิด animation จะหายไป
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
  // เคยเปิดไปแล้วอย่างน้อยหนึ่งครั้ง → คง dialog ไว้ใน tree ต่อ ไม่ unmount
  // ตอนปิด (chunk โหลดมาแล้ว + ต้องให้ exit animation ของ Radix เล่นจนจบ)
  const [everOpened, setEverOpened] = useState(false);

  const whatsNewOpen = manualOpen || shouldAutoOpen;
  const shouldMount = whatsNewOpen || everOpened;

  const fullName = profile?.user_info
    ? `${profile.user_info.firstname ?? ""} ${profile.user_info.lastname ?? ""}`.trim()
    : "";
  const displayName = fullName || aliasName || "—";
  const formattedTime = now ? formatDate(now.toISOString(), dateTimeFormat) : "";

  const handleOpenChange = (next: boolean) => {
    setManualOpen(next);
    setEverOpened(true);
    if (!next) markSeen();
  };

  return (
    <>
      <footer
        role="contentinfo"
        data-slot="status-bar"
        className="bg-muted/40 text-muted-foreground flex h-6 shrink-0 items-center justify-between border-t px-3 text-micro"
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
            <span>v{APP_VERSION}</span>
          </button>
        </div>
      </footer>
      {shouldMount && (
        <Suspense fallback={null}>
          <WhatsNewDialog open={whatsNewOpen} onOpenChange={handleOpenChange} />
        </Suspense>
      )}
    </>
  );
}
