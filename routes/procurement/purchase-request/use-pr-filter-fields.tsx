import { useMemo } from "react";
import { useTranslations } from "use-intl";
import { FieldLabel } from "@/components/ui/field";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ViewModeToggle } from "@/components/share/view-mode-toggle";
import { PURCHASE_REQUEST_STATUS_OPTIONS } from "@/constant/purchase-request";
import { SENDBACK_FILTER_CLAUSE } from "@/constant/last-action";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { FilterFieldDef } from "@/types/list-filter";
import { usePurchaseRequestWorkflowStages } from "./use-purchase-request";

interface PrFilterFieldsArgs {
  viewMode: "my-pending" | "all-document";
  onViewModeChange: (next: string) => void;
}

/**
 * ตัวกรองของหน้ารายการ PR — ดึงรายชื่อขั้นตอน workflow มาเองเพราะไม่มีใครนอกตัวกรองใช้
 * @returns FilterFieldDef ที่ส่งเข้าได้ทั้ง `useListFilters` และ `<ListFilter>`
 */
export function usePrFilterFields({
  viewMode,
  onViewModeChange,
}: PrFilterFieldsArgs): FilterFieldDef[] {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const { data: stages } = usePurchaseRequestWorkflowStages();

  // field แรกเป็น custom control ล้วน ๆ — ไม่ใช่ filter จริง แค่ยืม slot ใน
  // ListFilter เพื่อวาง toggle my-pending/all-document (มือถือเท่านั้น
  // เหมือนที่เคยอยู่ใน PrFilterSheet เดิม) ไม่มี value จริงจึงไม่ถูกนับใน
  // filterParam/activeFilters — key ตั้งไม่ให้ชนกับ "view" (ของ tab บน URL จริง)
  return useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "view_mode_toggle",
        control: "custom",
        // labelKey ว่างเจตนา — ListFilter จะไม่ render <FieldLabel> ลอย ๆ ให้
        // (control นี้ sm:hidden อยู่แล้ว มี label "View" ของตัวเองอยู่ข้างในสำหรับ
        // มือถือเท่านั้น ไม่งั้น desktop จะเห็น label ค้างแต่ไม่มี control ข้างใต้)
        labelKey: "",
        // field นี้ไม่มี value จริง (ปุ่ม toggle ไม่ผ่าน setValue) จึงไม่ควรมี clause
        // ลง filterParam — ถ้าไม่ประกาศ toClause ค่า default คือ pass-through ตรง
        // ซึ่งจะไม่มีวันเกิดขึ้นเพราะ values[key] ว่างเสมออยู่แล้ว แต่ประกาศไว้ชัดเจน
        // ให้ตรงกับ pattern ของ field หลอกตัวอื่น (เช่น transaction's dateRange)
        toClause: () => "",
        render: () => (
          <div className="space-y-1.5 sm:hidden">
            <FieldLabel className="text-xs">{tc("view")}</FieldLabel>
            <ViewModeToggle
              value={viewMode}
              onChange={onViewModeChange}
              myPendingLabel={t("myPending")}
              allDocumentsLabel={t("allDocuments")}
              className="grid grid-cols-2 gap-2"
            />
          </div>
        ),
      },
      {
        // ค่า option เป็น clause เต็มต่อตัว (pr_status|string:draft) — เลือกหลายตัว
        // MultiSelectFilter join เป็น clause ซ้ำ prefix ซึ่ง gateway parse รวมเป็น
        // IN query ให้เอง (parseFilterString รองรับทั้งสอง format โดยตั้งใจ)
        key: "filter",
        control: "custom",
        labelKey: "common.status",
        section: "listView.sectionDocument",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={PURCHASE_REQUEST_STATUS_OPTIONS}
            className="w-full"
          />
        ),
      },
      {
        key: "workflow_current_stage",
        control: "stage",
        labelKey: "procurement.purchaseRequest.stage",
        section: "listView.sectionDocument",
        stages: stages ?? [],
      },
      {
        key: "workflow",
        control: "workflow",
        labelKey: "field.workflow",
        section: "listView.sectionDocument",
        workflowType: WORKFLOW_TYPE.PR,
      },
      {
        // ตัวกรอง "ใบที่ถูกตีกลับ" — dropdown สองตัวเลือก (ทั้งหมด / ส่งกลับ)
        // ค่าที่เก็บคือ clause เต็มอยู่แล้ว จึงไม่ต้องประกาศ toClause
        key: "sendback",
        control: "status",
        labelKey: "common.sendBack",
        section: "listView.sectionDocument",
        options: [
          { labelKey: "common.sendBack", value: SENDBACK_FILTER_CLAUSE },
        ],
      },
      {
        // ช่วงจำนวนเงินรวม — UI ฝั่ง frontend ก่อน: toClause คืนค่าว่างไว้ไม่ให้
        // clause หลุดไป backend (QueryParams ยังไม่รู้จัก num_range เดี๋ยว 500)
        // ค่า "จริง" ใน URL/saved views ปกติ — backend รองรับเมื่อไรค่อยถอด toClause
        key: "amount",
        control: "amount-range",
        labelKey: "field.totalAmount",
        fieldKey: "base_total_amount",
        section: "listView.sectionDocument",
        toClause: () => "",
      },
      {
        key: "department",
        control: "department",
        labelKey: "field.department",
        section: "listView.sectionPeople",
      },
      {
        key: "user_id",
        control: "requester",
        labelKey: "common.requester",
        section: "listView.sectionPeople",
      },
      {
        key: "pr_date",
        control: "date-range",
        labelKey: "field.prDate",
        fieldKey: "pr_date",
        section: "listView.sectionDate",
      },
    ],
    [stages, tc, viewMode, onViewModeChange, t],
  );
}
