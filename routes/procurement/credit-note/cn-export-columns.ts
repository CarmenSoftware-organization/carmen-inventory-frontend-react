import type { XlsxColumn } from "@/hooks/use-xlsx-export";
import type { CreditNote } from "@/types/credit-note";

type TFn = (key: string) => string;

/**
 * คอลัมน์ไฟล์ xlsx ของหน้ารายการใบลดหนี้ — ลำดับกับความกว้างตามที่ใช้จริงในไฟล์ที่ส่งออก
 * @param tfl - translator ของ namespace "field"
 * @returns column def พร้อม header ที่แปลแล้ว ส่งเข้า `exportCreditNote` ได้ตรง ๆ
 */
export function buildCnExportColumns(tfl: TFn): XlsxColumn<CreditNote>[] {
  return [
    { header: tfl("cnNo"), value: (r) => r.cn_no, width: 22 },
    {
      header: tfl("vendor"),
      value: (r) => r.vendor_name ?? "",
      width: 26,
    },
    {
      header: tfl("type"),
      value: (r) => r.credit_note_type,
      width: 16,
    },
    { header: tfl("docDate"), value: (r) => r.cn_date, width: 12 },
    { header: tfl("status"), value: (r) => r.doc_status, width: 14 },
    {
      header: tfl("netAmount"),
      value: (r) => r.base_total_amount ?? 0,
      width: 16,
    },
    {
      header: tfl("totalAmount"),
      value: (r) => r.total_amount ?? 0,
      width: 16,
    },
    {
      header: tfl("currency"),
      value: (r) => r.currency_code ?? "",
      width: 10,
    },
    {
      header: tfl("createdBy"),
      value: (r) => r.audit?.created?.name ?? "",
      width: 22,
    },
    {
      header: tfl("description"),
      value: (r) => r.description ?? "",
      width: 40,
    },
  ];
}
