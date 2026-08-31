import { createContext } from "react";

/**
 * true เมื่อ control กำลัง render อยู่ใน submenu ของ ListFilterMenu (desktop) —
 * control ที่ปกติเป็นปุ่ม trigger + popover (MultiSelectFilter, StatusFilter,
 * FilterStage/Workflow/Department/Requester, DateRangePicker) ให้ render ไส้
 * (รายการ/ปฏิทิน) ตรง ๆ แทน ผู้ใช้ hover แถวแล้วเลือกได้เลย ไม่ต้องกดเปิดซ้อนอีกชั้น
 *
 * provider อยู่ที่ panel ของ ListFilterMenu จุดเดียว — ไหลผ่าน custom render
 * ของทุกหน้าเองโดยไม่ต้องแก้ field def รายหน้า ที่อื่นทั้งแอป (มือถือ sheet,
 * form, toolbar) ไม่มี provider = false = พฤติกรรมเดิมเป๊ะ
 */
export const FilterInlineContext = createContext(false);
