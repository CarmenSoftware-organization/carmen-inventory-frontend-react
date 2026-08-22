import { useMemo, useSyncExternalStore } from "react";

/**
 * ทะเบียน "เอกสารที่เพิ่งเปิด" สำหรับกลุ่ม Recent ใน command palette (⌘K)
 *
 * เก็บใน localStorage ล้วน ๆ ไม่ยิง backend — DocFormHeader เป็นคนบันทึกตอน
 * หน้า detail ถูกเปิด (จุดเดียวครอบทุกโมดูลเอกสาร) แล้ว palette อ่านผ่าน
 * useSyncExternalStore เพื่อให้รายการสดเสมอแม้บันทึกจาก tab อื่น (storage event)
 *
 * แยกตาม BU — path ของเอกสารไม่ได้ encode BU ไว้ เปิดข้าม BU คือ 404/สิทธิ์เด้ง
 * จึงกรองให้เห็นเฉพาะของ BU ที่กำลังใช้งาน
 */

const STORAGE_KEY = "carmen.recent-documents";
const CHANGE_EVENT = "recent-documents:change";
/** เก็บ (และโชว์) ต่อ BU ไม่เกินนี้ — ตัดภายใน BU ของตัวเองเท่านั้น: วันที่ทำงาน
 * หนักใน BU เดียวจะไม่ดันรายการของ BU อื่นหลุด (จำนวน BU ต่อ user มีไม่กี่ตัว
 * localStorage ไม่มีทางโตเกิน BU × 3 จึงไม่ต้องมี cap รวม) */
const MAX_PER_BU = 3;

export interface RecentDocument {
  readonly path: string;
  readonly label: string;
  readonly bu: string;
  readonly at: number;
}

function readAll(): RecentDocument[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? (parsed as RecentDocument[]) : [];
  } catch {
    return [];
  }
}

/**
 * บันทึกเอกสารลงหัวรายการ (path ซ้ำ = ขยับขึ้นหัว + อัปเดต label) —
 * label ตอนกำลังโหลดอาจเป็นชื่อ entity ชั่วคราว แล้วถูกเขียนทับด้วยเลขที่จริง
 * เมื่อข้อมูลมาถึง เพราะ key คือ path เดิม
 */
export function recordRecentDocument(entry: {
  path: string;
  label: string;
  bu: string;
}) {
  if (!entry.path || !entry.label || !entry.bu) return;
  const merged = [
    { ...entry, at: Date.now() },
    ...readAll().filter((d) => d.path !== entry.path),
  ];
  // ตัดต่อ BU — ไล่จากหัว (ใหม่สุดก่อน) เก็บ BU ละไม่เกิน MAX_PER_BU
  const counts = new Map<string, number>();
  const next = merged.filter((d) => {
    const n = (counts.get(d.bu) ?? 0) + 1;
    counts.set(d.bu, n);
    return n <= MAX_PER_BU;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage เต็ม/ถูกปิด — recent เป็นของเสริม พังเงียบ ๆ ได้
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  // storage event ยิงเฉพาะ tab อื่น — ครอบเคสเปิดสอง tab แล้วสลับกันดูเอกสาร
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "[]";
}

/** เอกสารที่เพิ่งเปิดของ BU ที่ระบุ ใหม่สุดก่อน (ไม่รู้ BU = ว่างไว้ก่อน) */
export function useRecentDocuments(bu: string | undefined): RecentDocument[] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  return useMemo(() => {
    if (!bu) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return (parsed as RecentDocument[])
        .filter((d) => d.bu === bu)
        .slice(0, MAX_PER_BU);
    } catch {
      return [];
    }
  }, [raw, bu]);
}
