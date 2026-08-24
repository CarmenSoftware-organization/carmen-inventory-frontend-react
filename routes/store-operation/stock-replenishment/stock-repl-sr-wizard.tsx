import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { ArrowRight, Trash2 } from "lucide-react";
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
import { LookupLocation } from "@/components/lookup/lookup-location";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { SrPrefillDraft } from "@/routes/store-operation/store-requisition/sr-form-helpers";
import type { Location, ProductLocation } from "@/types/stock-replenishment";

interface StockReplSrWizardProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /**
   * คลังที่ของขาด = คลังปลายทางของใบเบิก — SR ผูกคลังทั้งใบ ไม่ใช่รายแถว
   * หน้าแม่จึงกันไว้แล้วว่าติ๊กข้ามคลังเปิด wizard นี้ไม่ได้
   */
  readonly location?: Location;
  readonly products: readonly ProductLocation[];
}

/**
 * Wizard สร้างใบเบิกของจากรายการที่ติ๊กในหน้า Stock Replenishment
 *
 * เลือกสายอนุมัติ + คลังต้นทาง แล้วทบทวนรายการในตารางเดียวกัน (แก้จำนวน ตัดแถวออก)
 * แล้วส่งต่อไปหน้า SR form พร้อมของที่เติมไว้ **โดยยังไม่สร้างใบ** ผู้ใช้กด Save
 * ในฟอร์มเองอีกที — เหตุผลเดียวกับฝั่ง PR: endpoint
 * `POST /stock-replenishments/sr` serialize response เป็นซองเปล่า เลยไม่รู้เลขใบ
 * ที่เพิ่งสร้างเพื่อพาผู้ใช้ไปต่อ
 *
 * ไม่มีคอลัมน์หน่วยเหมือนฝั่ง PR โดยตั้งใจ — ใบเบิกย้ายของที่เก็บเป็นหน่วยคลังของ
 * สินค้าอยู่แล้ว จึงไม่มีหน่วยให้เลือก (ตรงกับ DTO ฝั่ง backend ที่ SR ไม่มี
 * `request_unit_id`)
 *
 * @param props - คุณสมบัติของ wizard
 * @param props.open - เปิดอยู่หรือไม่
 * @param props.onOpenChange - callback เปลี่ยนสถานะเปิด/ปิด
 * @param props.location - คลังปลายทาง (คลังที่ของขาด)
 * @param props.products - รายการที่ติ๊กไว้
 * @returns React element ของ wizard
 */
export function StockReplSrWizard({
  open,
  onOpenChange,
  location,
  products,
}: StockReplSrWizardProps) {
  const t = useTranslations("storeOperation.stockReplenishment");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const navigate = useNavigate();

  const [workflowId, setWorkflowId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [qtys, setQtys] = useState<Map<string, number>>(new Map());
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  // ตั้งค่าตั้งต้นใหม่ทุกครั้งที่เปิด — ของที่ติ๊กไว้เปลี่ยนได้ระหว่างที่ dialog ปิดอยู่
  useEffect(() => {
    if (!open) return;
    setWorkflowId("");
    setFromLocationId("");
    setRemoved(new Set());
    setQtys(new Map(products.map((p) => [p.id, p.reorder_qty])));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ตั้งค่าตอนเปิดเท่านั้น
  }, [open]);

  const activeProducts = products.filter((p) => !removed.has(p.id));
  const qtyOf = (product: ProductLocation) =>
    qtys.get(product.id) ?? product.reorder_qty;

  const setQty = (product: ProductLocation, qty: number) => {
    setQtys((prev) => new Map(prev).set(product.id, qty));
  };

  const handleRemove = (product: ProductLocation) => {
    setRemoved((prev) => new Set(prev).add(product.id));
  };

  // แถวที่จำนวนเป็น 0/ติดลบ ส่งไปแล้วฟอร์มก็บันทึกไม่ผ่าน
  const canContinue =
    !!workflowId &&
    !!fromLocationId &&
    !!location &&
    activeProducts.length > 0 &&
    activeProducts.every((p) => qtyOf(p) > 0);

  const handleGoToForm = () => {
    const draft: SrPrefillDraft = {
      workflow_id: workflowId,
      from_location_id: fromLocationId,
      to_location_id: location?.location_id,
      items: activeProducts.map((product) => ({
        product_id: product.id,
        product_name: product.name,
        product_local_name: product.local_name ?? "",
        requested_qty: qtyOf(product),
      })),
    };
    onOpenChange(false);
    navigate("/store-operation/store-requisition/new", {
      state: { srPrefill: draft },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("createSrTitle")}</DialogTitle>
          <DialogDescription>{t("createSrDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel required>{tfl("workflow")}</FieldLabel>
            <LookupWorkflow
              value={workflowId}
              onValueChange={setWorkflowId}
              workflowType={WORKFLOW_TYPE.SR}
              creatableOnly
              className="text-xs"
            />
          </Field>
          <Field>
            <FieldLabel required>{tfl("fromLocation")}</FieldLabel>
            {/* เบิกจากคลังตัวเองไม่ได้ — ตัดปลายทางออกจากตัวเลือกไปเลย */}
            <LookupLocation
              value={fromLocationId}
              onValueChange={setFromLocationId}
              excludeIds={location ? [location.location_id] : undefined}
              className="text-xs"
              modal
            />
          </Field>
          {/* ปลายทางคือคลังที่ของขาด — ใช้ lookup ตัวเดียวกับต้นทางเพื่อให้สองช่อง
              หน้าตาเหมือนกัน แต่ปิดไว้ ค่ามาจากแถวที่ติ๊กเสมอ เลือกเองไม่ได้ */}
          <Field>
            <FieldLabel>{tfl("toLocation")}</FieldLabel>
            <LookupLocation
              value={location?.location_id ?? ""}
              onValueChange={() => {}}
              disabled
              className="text-xs"
              modal
            />
          </Field>
        </div>

        <div className="max-h-[24rem] overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0">
              {/* ไม่ใส่ text-left รวมที่ tr — arbitrary variant `[&>th]:text-left`
                  specificity สูงกว่า `text-right` รายตัว หัวคอลัมน์ตัวเลขเลยไม่ยอมชิดขวา */}
              <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:font-semibold">
                <th className="w-10 text-center">#</th>
                <th className="text-left">{tfl("product")}</th>
                <th className="text-right">{t("requestQty")}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {activeProducts.map((product, index) => (
                <tr
                  key={product.id}
                  className="border-t [&>td]:px-2 [&>td]:py-1.5"
                >
                  <td className="text-muted-foreground text-center tabular-nums">
                    {index + 1}
                  </td>
                  <td className="min-w-0">
                    <p className="truncate" title={product.name}>
                      {product.name}
                    </p>
                    <p className="text-muted-foreground text-micro">
                      {product.code}
                    </p>
                  </td>
                  <td className="text-right">
                    <InputQty
                      value={qtyOf(product)}
                      onChange={(e) =>
                        setQty(product, e.currentTarget.valueAsNumber || 0)
                      }
                      className="ms-auto h-7 w-24 text-right text-xs"
                    />
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemove(product)}
                      aria-label={tc("delete")}
                    >
                      <Trash2 className="text-destructive size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleGoToForm}
            disabled={!canContinue}
          >
            {t("goToSrForm")}
            <ArrowRight />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
