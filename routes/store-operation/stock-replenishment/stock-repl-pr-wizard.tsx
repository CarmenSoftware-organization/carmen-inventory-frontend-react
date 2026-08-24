import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputQty } from "@/components/ui/input/input-qty";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { useCreateStockReplPr } from "@/hooks/use-stock-replenishment";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { Location, ProductLocation } from "@/types/stock-replenishment";

/** แถวที่ผู้ใช้ติ๊กไว้ พร้อมคลังต้นสังกัด — ProductLocation เองไม่ได้พกคลังมาด้วย */
export interface StockReplPrRow {
  readonly location: Location;
  readonly product: ProductLocation;
}

interface StockReplPrWizardProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly rows: readonly StockReplPrRow[];
  /** สร้างสำเร็จ — หน้าแม่ใช้ล้าง selection */
  readonly onCreated?: () => void;
}

/** สินค้าตัวเดียวกันโผล่ได้หลายคลัง — คีย์จึงต้องมีคลังด้วย */
const rowKey = (row: StockReplPrRow) =>
  `${row.location.location_id}:${row.product.id}`;

interface RowDraft {
  qty: number;
  unitId: string;
}

/**
 * Wizard สร้างใบขอซื้อจากรายการที่ติ๊กในหน้า Stock Replenishment
 *
 * หน้าเดียวจบ: เลือก workflow แล้วทบทวนรายการในตารางเดียวกัน (แก้จำนวน เลือกหน่วย
 * ตัดแถวออก) แล้วยิง `POST /stock-replenishments/pr` — ต้องผ่าน endpoint นี้เท่านั้น
 * ไม่ใช่ประกอบใบเองแล้วส่งเข้า endpoint สร้าง PR ปกติ เพราะ `verify()` ฝั่งหลังบ้าน
 * ตรวจให้ด้วยว่า workflow/สินค้า/คลัง เข้ากันไหม และผู้ใช้มีสิทธิ์ในคลังนั้นจริงไหม
 *
 * ใบหนึ่งผูกคลังเดียว (`location_id` ตัวเดียวถูกประทับลงทุกบรรทัด) หน้าแม่จึงกันไว้แล้ว
 * ว่าติ๊กข้ามคลังเปิด wizard นี้ไม่ได้
 *
 * จำนวนตั้งต้นคือ `reorder_qty` (ส่วนที่ขาดจากเกณฑ์ par) ส่วนหน่วยปล่อยให้
 * `LookupProductUnit` auto-select หน่วยแรกของสินค้าให้เอง
 *
 * @param props - คุณสมบัติของ wizard
 * @param props.open - เปิดอยู่หรือไม่
 * @param props.onOpenChange - callback เปลี่ยนสถานะเปิด/ปิด
 * @param props.rows - รายการที่ติ๊กไว้พร้อมคลังของแต่ละแถว
 * @param props.onCreated - เรียกเมื่อสร้างสำเร็จ
 * @returns React element ของ wizard
 */
export function StockReplPrWizard({
  open,
  onOpenChange,
  rows,
  onCreated,
}: StockReplPrWizardProps) {
  const t = useTranslations("storeOperation.stockReplenishment");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const tfl = useTranslations("field");
  const createPr = useCreateStockReplPr();

  const [workflowId, setWorkflowId] = useState("");
  const [drafts, setDrafts] = useState<Map<string, RowDraft>>(new Map());
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  // ตั้งค่าตั้งต้นใหม่ทุกครั้งที่เปิด — ของที่ติ๊กไว้เปลี่ยนได้ระหว่างที่ dialog ปิดอยู่
  useEffect(() => {
    if (!open) return;
    setWorkflowId("");
    setRemoved(new Set());
    setDrafts(
      new Map(
        rows.map((row) => [
          rowKey(row),
          { qty: row.product.reorder_qty, unitId: "" },
        ]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ตั้งค่าตอนเปิดเท่านั้น
  }, [open]);

  const activeRows = rows.filter((row) => !removed.has(rowKey(row)));
  const draftOf = (row: StockReplPrRow): RowDraft =>
    drafts.get(rowKey(row)) ?? { qty: row.product.reorder_qty, unitId: "" };

  const patchDraft = (row: StockReplPrRow, patch: Partial<RowDraft>) => {
    const key = rowKey(row);
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(key, { ...draftOf(row), ...patch });
      return next;
    });
  };

  const handleRemove = (row: StockReplPrRow) => {
    setRemoved((prev) => new Set(prev).add(rowKey(row)));
  };

  // แถวที่จำนวนเป็น 0/ติดลบ หรือยังไม่มีหน่วย backend ปฏิเสธที่ DTO อยู่แล้ว
  const canContinue =
    !!workflowId &&
    activeRows.length > 0 &&
    activeRows.every((row) => {
      const draft = draftOf(row);
      return draft.qty > 0 && !!draft.unitId;
    });

  const handleSubmit = () => {
    const locationId = activeRows[0]?.location.location_id;
    if (!locationId) return;
    createPr.mutate(
      {
        workflow_id: workflowId,
        location_id: locationId,
        products: activeRows.map((row) => ({
          id: row.product.id,
          request_unit_id: draftOf(row).unitId,
          request_qty: draftOf(row).qty,
        })),
      },
      {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: "PR" }));
          onOpenChange(false);
          onCreated?.();
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !createPr.isPending && onOpenChange(next)}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("createPrTitle")}</DialogTitle>
          <DialogDescription>{t("createPrDesc")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <Field className="w-full sm:max-w-xs">
            <FieldLabel required>{tfl("workflow")}</FieldLabel>
            <LookupWorkflow
              value={workflowId}
              onValueChange={setWorkflowId}
              workflowType={WORKFLOW_TYPE.PR}
              creatableOnly
              className="text-xs"
            />
          </Field>
          <p className="text-muted-foreground pb-1.5 text-xs">
            {t("nItems", { count: activeRows.length })}
          </p>
        </div>

        <div className="max-h-[24rem] overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0">
              {/* ไม่ใส่ text-left รวมที่ tr — arbitrary variant `[&>th]:text-left`
                    specificity สูงกว่า `text-right` รายตัว หัวคอลัมน์ตัวเลขเลยไม่ยอมชิดขวา */}
              <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:font-semibold">
                <th className="w-10 text-center">#</th>
                <th className="text-left">{tfl("location")}</th>
                <th className="text-left">{tfl("product")}</th>
                <th className="text-right">{t("requestQty")}</th>
                <th className="text-left">{tfl("unit")}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row, index) => {
                const draft = draftOf(row);
                return (
                  <tr
                    key={rowKey(row)}
                    className="border-t [&>td]:px-2 [&>td]:py-1.5"
                  >
                    <td className="text-muted-foreground text-center tabular-nums">
                      {index + 1}
                    </td>
                    <td className="text-muted-foreground">
                      {row.location.location_name}
                    </td>
                    <td className="min-w-0">
                      <p className="truncate" title={row.product.name}>
                        {row.product.name}
                      </p>
                      <p className="text-muted-foreground text-micro">
                        {row.product.code}
                      </p>
                    </td>
                    <td className="text-right">
                      <InputQty
                        value={draft.qty}
                        onChange={(e) =>
                          patchDraft(row, {
                            qty: e.currentTarget.valueAsNumber || 0,
                          })
                        }
                        className="ms-auto h-7 w-24 text-right text-xs"
                      />
                    </td>
                    <td>
                      <LookupProductUnit
                        productId={row.product.id}
                        value={draft.unitId}
                        onValueChange={(unitId) => patchDraft(row, { unitId })}
                      />
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemove(row)}
                        aria-label={tc("delete")}
                      >
                        <Trash2 className="text-destructive size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createPr.isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canContinue || createPr.isPending}
          >
            {createPr.isPending && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            {tc("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
