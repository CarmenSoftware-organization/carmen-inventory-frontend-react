import { useMemo } from "react";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { CN_STATUS_OPTIONS, CN_TYPE_OPTIONS } from "@/constant/credit-note";
import { useVendor } from "@/hooks/use-vendor";
import type { FilterFieldDef } from "@/types/list-filter";
import { useCreditNote } from "./use-credit-note";

/**
 * ตัวกรองของหน้ารายการใบลดหนี้ — ดึง vendor กับเลข invoice มาเองเพราะไม่มีใคร
 * นอกตัวกรองใช้ทั้งสองชุด
 * @returns FilterFieldDef ที่ส่งเข้าได้ทั้ง `useListFilters` และ `<ListFilter>`
 */
export function useCnFilterFields(): FilterFieldDef[] {
  const { data: vendorData } = useVendor({ perpage: -1 });
  // ชื่อ vendor เป็น literal string จริง (ไม่ใช่ i18n key) — memo กันไม่ให้ array
  // reference เปลี่ยนทุก render จน memo ของ field ข้างล่างไม่เคย hit
  const vendorOptions = useMemo(
    () =>
      (vendorData?.data ?? [])
        .filter((v) => v.is_active)
        .map((v) => ({
          label: v.name,
          value: `vendor_id|string:${v.id}`,
        })),
    [vendorData],
  );

  // ตัวเลือกเลข invoice จากใบ CN ที่มีจริง (distinct, ตัดค่าว่าง) — แบบเดียวกับ GRN
  const { data: allCnData } = useCreditNote({ perpage: -1 });
  const invoiceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const c of allCnData?.data ?? []) {
      const no = c.invoice_no?.trim();
      if (no) seen.add(no);
    }
    return [...seen]
      .sort()
      .map((no) => ({ label: no, value: `invoice_no|string:${no}` }));
  }, [allCnData]);

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
        key: "invoice_no",
        control: "custom",
        labelKey: "field.invoiceNo",
        section: "listView.sectionDocument",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={invoiceOptions}
            searchable
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
        control: "custom",
        labelKey: "field.vendor",
        section: "listView.sectionPeople",
        // chip โชว์ชื่อ vendor จริงแทนจำนวน — mapping อยู่ในมือ hook นี้อยู่แล้ว
        valueText: (raw) => {
          const ids = raw
            .split(",")
            .map((p) => p.slice(p.lastIndexOf(":") + 1))
            .filter(Boolean);
          const names = ids
            .map(
              (id) => (vendorData?.data ?? []).find((v) => v.id === id)?.name,
            )
            .filter((n): n is string => !!n);
          if (names.length === 0) return `${ids.length}`;
          return names[0] + (names.length > 1 ? ` +${names.length - 1}` : "");
        },
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={vendorOptions}
            searchable
            className="w-full"
          />
        ),
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
    [vendorOptions, vendorData, invoiceOptions],
  );
}
