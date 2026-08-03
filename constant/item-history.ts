import { STATUS_DOT_CHIP } from "./status-config";
import type { StatusConfigEntry } from "./status-config";

/**
 * Badge className + label สำหรับ status ในประวัติ workflow ระดับรายการ (per-item).
 *
 * ใช้ร่วมกันทุกโมดูลที่มีประวัติรายบรรทัด (PR/PO) — เป็นคำกริยาของ workflow engine
 * ตัวเดียวกัน ไม่ใช่สถานะเฉพาะของเอกสารชนิดใดชนิดหนึ่ง
 * API ส่ง status เป็นรูปกริยา (submit/approve/reject/review/sendback) ต่างจาก
 * document-level ที่เป็นรูป past-tense จึงต้อง map แยก. className เขียนเต็มเพื่อให้
 * Tailwind detect ได้ตอน build.
 */
export const ITEM_HISTORY_STATUS_CONFIG: Record<string, StatusConfigEntry> = {
  submit: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-submitted)]`,
    label: "Submit",
  },
  submitted: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-submitted)]`,
    label: "Submitted",
  },
  approve: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-approved)]`,
    label: "Approve",
  },
  approved: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-approved)]`,
    label: "Approved",
  },
  reject: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-rejected)]`,
    label: "Reject",
  },
  rejected: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-rejected)]`,
    label: "Rejected",
  },
  review: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-review)]`,
    label: "Review",
  },
  sendback: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-review)]`,
    label: "Send Back",
  },
  send_back: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-review)]`,
    label: "Send Back",
  },
};
