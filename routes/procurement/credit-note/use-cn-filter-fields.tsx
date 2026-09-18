import { useMemo } from "react";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { CN_STATUS_OPTIONS, CN_TYPE_OPTIONS } from "@/constant/credit-note";
import type { FilterFieldDef } from "@/types/list-filter";

/**
 * นิยาม field ของ filter หน้า credit-note
 *
 * hook นี้**ไม่ fetch อะไรเลยโดยตั้งใจ** — ทะเบียน vendor ใหญ่หลักร้อย KB
 * (T02: 858 แถว ≈ 435 KB) การดึงมาทำ option ตอน mount คือจ่ายค่านั้นทุกครั้งที่
 * เข้าหน้า ทั้งที่ dropdown อาจไม่ถูกเปิดเลย control `vendor` ยิงเองตอนเปิด popover
 * (ดู FilterVendor) ส่วนชื่อบน chip มาจาก useListFilters ที่ยิงเฉพาะเมื่อมีค่าค้างจริง
 */
export function useCnFilterFields(): FilterFieldDef[] {
  return useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "cn_type",
        control: "custom",
        labelKey: "procurement.creditNote.type",
        section: "listView.sectionDocument",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={CN_TYPE_OPTIONS}
            className="w-full"
          />
        ),
      },
      {
        key: "cn_status",
        control: "custom",
        labelKey: "common.status",
        section: "listView.sectionDocument",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={CN_STATUS_OPTIONS}
            className="w-full"
          />
        ),
      },
      {
        // ช่วงจำนวนเงินรวม — UI ฝั่ง frontend ก่อน เหมือน PR/PO/GRN: toClause คืน
        // ค่าว่างไว้ไม่ให้ clause หลุดไป backend (QueryParams ยังไม่รู้จัก num_range)
        key: "amount",
        control: "amount-range",
        labelKey: "field.totalAmount",
        fieldKey: "total_amount",
        section: "listView.sectionDocument",
        toClause: () => "",
      },
      {
        key: "vendor",
        control: "vendor",
        labelKey: "field.vendor",
        section: "listView.sectionPeople",
      },
      {
        // ผู้สร้าง = คนเปิดใบลดหนี้ (คอลัมน์ Created By ใน list) — กรองที่ created_by_id
        key: "created_by",
        control: "requester",
        labelKey: "field.createdBy",
        fieldKey: "created_by_id",
        section: "listView.sectionPeople",
      },
      {
        key: "cn_date",
        control: "date-range",
        labelKey: "field.docDate",
        fieldKey: "cn_date",
        section: "listView.sectionDate",
      },
    ],
    [],
  );
}
