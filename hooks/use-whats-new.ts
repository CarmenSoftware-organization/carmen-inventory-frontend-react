
import { startTransition, useEffect, useState } from "react";
import { CURRENT_VERSION, LATEST } from "@/lib/changelog";

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

function latestHasChanges(): boolean {
  const c = LATEST?.changes;
  if (!c) return false;
  return c.added.length + c.fixed.length + c.changed.length > 0;
}

/**
 * จัดการ logic "What's New" auto-popup
 *
 * อ่าน version ที่ผู้ใช้เห็นล่าสุดจาก localStorage ใน `useEffect` (กัน
 * hydration mismatch) แล้วเทียบกับ `CURRENT_VERSION` โหลดครั้งแรกสุด
 * (ยังไม่มีค่าเดิม) จะตั้ง baseline เงียบๆ โดยไม่เด้ง dialog และเด้งเฉพาะ
 * ตอน version เปลี่ยนและมีรายการให้แสดงจริง
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
      writeLastSeen(CURRENT_VERSION);
      return;
    }
    if (lastSeen !== CURRENT_VERSION && latestHasChanges()) {
      startTransition(() => setShouldAutoOpen(true));
    }
  }, []);

  const markSeen = () => {
    writeLastSeen(CURRENT_VERSION);
    setShouldAutoOpen(false);
  };

  return { shouldAutoOpen, markSeen };
}
