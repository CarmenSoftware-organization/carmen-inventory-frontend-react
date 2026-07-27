import { useState } from "react";
import { Ban, Check, Eye, Scissors } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { STAGE_ROLE } from "@/types/stage-role";
import {
  PrActionDialog,
  type ActionDialogItem,
  type StageOption,
} from "../workflow/pr-action-dialog";

interface Pr2BulkBarProps {
  readonly count: number;
  readonly role?: string;
  readonly isPending: boolean;
  readonly items: ActionDialogItem[];
  readonly previousStages?: StageOption[];
  readonly stagesLoading?: boolean;
  readonly onClear: () => void;
  readonly onApprove: () => void;
  readonly onReject: (messages: Record<number, string>) => void;
  readonly onReview: (messages: Record<number, string>, desStage: string) => void;
  readonly onSplit?: () => void;
}

/**
 * แถบที่โผล่เมื่อเลือกแถว — ใบนึงมีได้ถึง 100 รายการ ไม่มีใครกดทีละแถว 100 ครั้ง
 * flow จริงคือเลือกทั้งหมดแล้วอนุมัติรวด เหลือเฉพาะตัวที่มีปัญหาค่อยจัดการทีละตัว
 *
 * ปุ่มที่โผล่อิง role เดียวกับ footer — approve/purchase เท่านั้นที่ตัดสินรายแถวได้
 */
export function Pr2BulkBar({
  count,
  role,
  isPending,
  items,
  previousStages,
  stagesLoading,
  onClear,
  onApprove,
  onReject,
  onReview,
  onSplit,
}: Pr2BulkBarProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const tv2 = useTranslations("procurement.purchaseRequest.v2");
  const [dialog, setDialog] = useState<"reject" | "review" | null>(null);

  const canDecide =
    role === STAGE_ROLE.APPROVE || role === STAGE_ROLE.PURCHASE;
  if (count === 0 || !canDecide) return null;

  return (
    <>
      {/* ไม่มีกล่อง/พื้นหลัง — แถบนี้โผล่มาเฉพาะตอนเลือกแถว การโผล่มาเองก็บอกอยู่
          แล้วว่ามีของที่เลือกไว้ ใส่กรอบสีทับเข้าไปอีกกลายเป็นแย่งความสนใจกับ
          แถวที่ถูกเลือกในตาราง ซึ่งเป็นของจริงที่ต้องมอง */}
      <div className="flex flex-wrap items-center gap-2">
        {/* ปุ่มตัดสิน (อนุมัติ/ปฏิเสธ/ส่งกลับ) ชิดซ้ายสุดเหมือนหน้าเดิม แล้วค่อย
            บอกว่ากดแล้วจะมีผลกับกี่รายการ — มือไปหาปุ่มก่อนอยู่แล้ว ตัวเลขคือสิ่งที่
            ต้องยืนยันก่อนกด ไม่ใช่สิ่งที่ต้องหา
            สีของปุ่มตรงกับหน้าเดิม: อนุมัติ = success, ปฏิเสธ = destructive,
            ส่งกลับ = warning · สามการกระทำนี้ให้ผลคนละทางกันสิ้นเชิง ใช้สีเดียวกับ
            ที่คนใช้ชินอยู่แล้วดีกว่าให้ต้องอ่านตัวหนังสือทุกครั้ง */}
        <Button
          type="button"
          size="sm"
          variant="success"
          disabled={isPending}
          onClick={onApprove}
        >
          <Check />
          {tc("approve")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => setDialog("reject")}
        >
          <Ban />
          {tc("reject")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="warning"
          disabled={isPending}
          onClick={() => setDialog("review")}
        >
          <Eye />
          {tc("sendBack")}
        </Button>
        <span className="text-sm font-medium">
          {tv2("nSelected", { count })}
        </span>

        {/* ขวาสุด = เครื่องมือจัดการสิ่งที่เลือก ไม่ได้ตัดสินอะไรกับรายการ
            outline เท่ากับปุ่มตัดสินฝั่งซ้าย เพราะพอถอดกรอบของแถบออกแล้ว ghost
            จางจนดูเหมือนข้อความ ไม่เหมือนปุ่ม */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onSplit && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={onSplit}
            >
              <Scissors />
              {t("split")}
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={onClear}>
            {tv2("clearSelection")}
          </Button>
        </div>
      </div>

      <PrActionDialog
        open={dialog === "reject"}
        onOpenChange={(o) => {
          if (!o) setDialog(null);
        }}
        title={t("rejectItemsTitle")}
        description={t("rejectItemsDesc")}
        confirmLabel={tc("reject")}
        confirmVariant="destructive"
        isPending={isPending}
        items={items}
        onConfirm={(messages) => {
          onReject(messages);
          setDialog(null);
        }}
      />

      <PrActionDialog
        open={dialog === "review"}
        onOpenChange={(o) => {
          if (!o) setDialog(null);
        }}
        title={t("reviewItemsTitle")}
        description={t("reviewItemsDesc")}
        confirmLabel={tc("sendBack")}
        confirmVariant="warning"
        isPending={isPending}
        stages={previousStages}
        stagesLoading={stagesLoading}
        items={items}
        onConfirm={(messages, desStage) => {
          onReview(messages, desStage ?? "");
          setDialog(null);
        }}
      />
    </>
  );
}
