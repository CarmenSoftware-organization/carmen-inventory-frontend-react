import { useEffect, useMemo } from "react";
import { useLocation } from "react-router";

/**
 * ลำดับเอกสารของหน้า list ล่าสุด — ให้หน้า detail รู้ว่าตัวเองเป็นใบที่เท่าไร
 * และใบ ก่อนหน้า/ถัดไป คือใคร (ปุ่ม ↑↓ + "3/12" ใน DocSequenceNav)
 *
 * เก็บใน sessionStorage: per-tab โดยธรรมชาติ (สอง tab เปิดคนละ list ไม่ตีกัน)
 * และหายเองเมื่อปิด tab — เก็บชุดเดียว "list ล่าสุดที่ผู้ใช้เห็น" พอ เพราะ
 * เส้นทางจริงคือ list → detail → กลับ list; เปิด list อื่นเมื่อไรลำดับเก่า
 * ก็หมดความหมายแล้ว (detail ของโมดูลอื่นเทียบ base ไม่ตรงจะไม่โชว์ nav เอง)
 */

const STORAGE_KEY = "carmen.doc-sequence";

interface DocSequence {
  /** path ของหน้า list (= path ของ detail ตัดท้าย id ทิ้ง) */
  readonly base: string;
  readonly ids: readonly string[];
}

function readSequence(): DocSequence | null {
  try {
    const parsed: unknown = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? "null",
    );
    if (!parsed || typeof parsed !== "object") return null;
    const seq = parsed as DocSequence;
    return typeof seq.base === "string" && Array.isArray(seq.ids) ? seq : null;
  } catch {
    return null;
  }
}

/**
 * ให้หน้า list ประกาศลำดับแถวที่กำลังโชว์ — เรียกจาก component ของ list
 * ด้วย id ตามลำดับบนจอ (เขียนซ้ำทุกครั้งที่ลำดับเปลี่ยน: เปลี่ยนหน้า/กรอง/เรียง)
 */
export function useRecordDocSequence(ids: readonly string[]) {
  const { pathname } = useLocation();
  // dep เป็น string เดียว — ids เป็น array ใหม่ทุก render เทียบ reference ไม่ได้
  const key = ids.join(",");
  useEffect(() => {
    if (ids.length === 0) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ base: pathname, ids } satisfies DocSequence),
      );
    } catch {
      // sessionStorage เต็ม/ถูกปิด — nav เป็นของเสริม พังเงียบ ๆ ได้
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids เทียบผ่าน key
  }, [key, pathname]);
}

/** แยก path หน้า detail เป็น base (path ของ list) + id — ไม่เข้ารูปคืน null */
function splitDocPath(pathname: string): { base: string; id: string } | null {
  const cut = pathname.lastIndexOf("/");
  if (cut <= 0) return null;
  return { base: pathname.slice(0, cut), id: pathname.slice(cut + 1) };
}

/**
 * ตัดเอกสารออกจากลำดับ — เรียกหลัง action ที่ทำให้ใบหลุดจาก list ต้นทาง
 * (submit/approve/reject/send back แล้วใบหายจาก my-pending) เลข n/N ของใบ
 * ถัดไปจะได้ตรงกับจำนวนที่เหลือใน list จริง ไม่นับใบที่จบไปแล้ว
 */
export function removeFromDocSequence(pathname: string) {
  const parts = splitDocPath(pathname);
  if (!parts) return;
  const seq = readSequence();
  if (!seq || seq.base !== parts.base) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        base: seq.base,
        ids: seq.ids.filter((id) => id !== parts.id),
      } satisfies DocSequence),
    );
  } catch {
    // sessionStorage พัง — nav เป็นของเสริม พังเงียบ ๆ ได้
  }
}

export interface DocSequencePosition {
  readonly index: number;
  readonly total: number;
  readonly prevPath: string | null;
  readonly nextPath: string | null;
}

/**
 * ตำแหน่งของ detail ปัจจุบันในลำดับที่ list ประกาศไว้ — null เมื่อไม่อยู่ในลำดับ
 * (เข้าตรงจาก deep link/⌘K Recent, ลำดับเป็นของ list อื่น, ฯลฯ)
 */
export function useDocSequence(pathname: string): DocSequencePosition | null {
  return useMemo(() => {
    const parts = splitDocPath(pathname);
    if (!parts) return null;
    const { base, id } = parts;

    const seq = readSequence();
    if (!seq || seq.base !== base) return null;
    const index = seq.ids.indexOf(id);
    if (index === -1) return null;

    const prevId = index > 0 ? seq.ids[index - 1] : null;
    const nextId = index < seq.ids.length - 1 ? seq.ids[index + 1] : null;
    return {
      index,
      total: seq.ids.length,
      prevPath: prevId ? `${base}/${prevId}` : null,
      nextPath: nextId ? `${base}/${nextId}` : null,
    };
  }, [pathname]);
}
