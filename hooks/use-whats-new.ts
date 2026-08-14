import { startTransition, useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/version";

const STORAGE_KEY = "carmen.whatsNew.lastSeen";

function readLastSeen(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // localStorage unavailable (private mode) — ignore
  }
}

/**
 * จัดการ logic "What's New" auto-popup
 *
 * อ่าน version ที่ผู้ใช้เห็นล่าสุดจาก localStorage ใน `useEffect` (กัน
 * hydration mismatch) แล้วเทียบกับ `APP_VERSION` (ฉีดตอน build จาก
 * `package.json` — เท่ากับฟิลด์ `current` ของ `changelog.json` เสมอ เพราะ
 * `bun run build:bump` เขียนทั้งคู่พร้อมกันในสคริปต์เดียว จึงใช้แทนกันได้โดยไม่
 * ต้อง import `lib/changelog.ts`) โหลดครั้งแรกสุด (ยังไม่มีค่าเดิม) จะตั้ง
 * baseline เงียบๆ โดยไม่เด้ง dialog · version เดิม (ผู้ใช้เห็นแล้ว) ก็ไม่เด้ง
 * เช่นกัน — สองเคสนี้จบแบบ sync ไม่แตะ `changelog.json` เลย
 *
 * เฉพาะตอน version เปลี่ยนจริง ๆ เท่านั้นที่ dynamic-import `lib/changelog.ts`
 * เพื่อเช็คว่า release ล่าสุดมีรายการให้โชว์จริงไหม — ต้องเป็น dynamic import
 * (ไม่ใช่ static) เพราะ `changelog.json` โตขึ้นเรื่อย ๆ ทุก release (~57
 * รายการ/รอบ) static import ตรงนี้จะลาก payload นั้นเข้า shared chunk ที่ทุก
 * หน้าโหลด (เช่นเดียวกับที่ `WhatsNewDialog` เป็น `lazy()` แล้วในตัว
 * `status-bar.tsx` ด้วยเหตุผลเดียวกัน) ถ้าดึง chunk ไม่สำเร็จให้เงียบไว้ —
 * ไม่เด้ง dialog และไม่ปล่อย rejection ลอย
 *
 * @returns `{ shouldAutoOpen, markSeen }` — flag สั่งเปิด dialog อัตโนมัติ
 *   และฟังก์ชันบันทึกว่าผู้ใช้เห็น version ปัจจุบันแล้ว
 * @example
 * ```tsx
 * const { shouldAutoOpen, markSeen } = useWhatsNew();
 * useEffect(() => { if (shouldAutoOpen) setOpen(true); }, [shouldAutoOpen]);
 * ```
 */
export function useWhatsNew() {
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false);

  useEffect(() => {
    const lastSeen = readLastSeen();
    if (lastSeen === null) {
      writeLastSeen(APP_VERSION);
      return;
    }
    if (lastSeen === APP_VERSION) return;

    let cancelled = false;
    import("@/lib/changelog")
      .then(({ LATEST }) => {
        if (cancelled) return;
        const c = LATEST?.changes;
        const hasChanges =
          !!c && c.added.length + c.fixed.length + c.changed.length > 0;
        if (hasChanges) startTransition(() => setShouldAutoOpen(true));
      })
      .catch(() => {
        // ดึง chunk ไม่สำเร็จ (เน็ตหลุด / deploy ใหม่ทับ hash เดิม) — What's New
        // เป็นของไม่จำเป็น ปล่อยผ่านเงียบ ๆ ไม่เด้ง dialog และห้าม throw
        // เพราะ promise ที่ reject ลอย ๆ จะกลายเป็น unhandled rejection
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markSeen = () => {
    writeLastSeen(APP_VERSION);
    setShouldAutoOpen(false);
  };

  return { shouldAutoOpen, markSeen };
}
