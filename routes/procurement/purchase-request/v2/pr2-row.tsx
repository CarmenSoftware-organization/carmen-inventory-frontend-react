import { memo, useState } from "react";
import { useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PrFormValues } from "../pr-form-schema";
import { Pr2StatusPill } from "./pr2-status-pill";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import { usePr2AmountSync } from "./pr2-amount-sync";
import {
  Pr2DiscountCell,
  Pr2ExchangeRateCell,
  Pr2TaxCell,
  Pr2UnitPriceCell,
  Pr2VendorCell,
} from "./pr2-edit-cells";
import { ProductCell } from "../pr-item-cells/product-cell";
import { LocationCell } from "../pr-item-cells/location-cell";
import { RequestedCell } from "../pr-item-cells/requested-cell";
import { ApprovedCell } from "../pr-item-cells/approved-cell";
import { FocCell } from "../pr-item-cells/foc-cell";
import { AmountCell } from "../pr-item-cells/amount-cell";
import { CurrencyCell } from "../pr-item-cells/currency-cell";
import { DeliveryPointCell } from "../pr-item-cells/delivery-point-cell";
import { DeliveryDateCell } from "../pr-item-cells/delivery-date-cell";
import { useIsRowLocked } from "../pr-item-cells/helpers";
import { PrPricelistCompare } from "../pr-pricelist-compare";
import { PrItemHistorySheet } from "../workflow/pr-item-history";
import { PrOnHandDialog } from "../pr-on-hand-dialog";
import { PrOnOrderDialog } from "../pr-on-order-dialog";
import {
  pr2FrozenCount,
  pr2FrozenOffsets,
  pr2Columns,
  type Pr2Column,
} from "./pr2-columns";
import type { Pr2Permissions } from "./pr2-permissions";
import { Pr2AmountBreakdown } from "./pr2-amount-breakdown";

/** ค่าว่างใช้ตัวเดียวกันหมดทั้งหน้า ไม่ใช่ 0.00 บ้าง — บ้าง แบบหน้าเดิม */
export const EMPTY = "—";

interface Pr2RowProps {
  readonly control: Control<PrFormValues>;
  readonly form: UseFormReturn<PrFormValues>;
  readonly index: number;
  readonly perms: Pr2Permissions;
  readonly showAction: boolean;
  readonly buCode?: string;
  readonly baseCurrencyCode?: string;
  readonly today: Date;
  readonly role?: string;
  readonly onRemove?: (index: number) => void;
  /** ref ของ virtualizer สำหรับวัดความสูงจริงของแถว (undefined = ไม่ virtualize) */
  readonly rowRef?: (node: Element | null) => void;
  /** ลำดับในลิสต์แบน — virtualizer ใช้จับคู่แถวกับตำแหน่งที่วัดไว้ */
  readonly vIndex?: number;
  readonly selected: boolean;
  readonly onSelect: (index: number, checked: boolean) => void;
  readonly dateFormat: string;
  readonly zebra: boolean;
}

/**
 * หนึ่งแถวของตาราง — memo + subscribe เฉพาะ item ของตัวเอง
 *
 * ใบนึงมีได้ถึง 100 รายการ ถ้า subscribe ทั้ง items แถวเดียวเปลี่ยนจะ re-render
 * ครบ 100 แถว การผูกที่ `items.${index}` ทำให้แก้แถวไหน re-render แค่แถวนั้น
 */
export const Pr2Row = memo(function Pr2Row({
  control,
  form,
  index,
  selected,
  onSelect,
  dateFormat,
  zebra,
  perms,
  showAction,
  buCode,
  baseCurrencyCode,
  today,
  role,
  onRemove,
  rowRef,
  vIndex,
}: Pr2RowProps) {
  "use no memo";
  const t = useTranslations("procurement.purchaseRequest");
  const tfl = useTranslations("field");
  // dialog รายละเอียดสต็อก — เปิดจาก label ใน tooltip ของ ProductCell
  // ต้องอยู่ระดับแถว ไม่ใช่ใน tooltip: dialog ชิง focus ทำให้ tooltip ปิด
  // แล้ว dialog ที่อยู่ข้างในก็จะถูก unmount ตามไปด้วย (เจอมาแล้วตอนใช้ popover)
  const [onHandOpen, setOnHandOpen] = useState(false);
  const [onOrderOpen, setOnOrderOpen] = useState(false);

  const item = useWatch({ control, name: `items.${index}` });
  const isRowLocked = useIsRowLocked(control, index);
  const columns = pr2Columns(perms.isCreatorView, showAction, perms.showSelectColumn);

  // แถวที่ถูกอนุมัติ/ปฏิเสธมาจาก server แล้ว แก้ไม่ได้ (กติกาเดียวกับหน้าเดิม)
  const rowLocked = perms.formLocked || isRowLocked;
  // ส่งเฉพาะ "สิทธิ์ตามโหมด/role" ให้ cell — ส่วน "แถวนี้ถูกตัดสินไปแล้วหรือยัง"
  // cell เช็คเองด้วย useIsRowLocked เหมือนหน้าเดิม จะได้ไม่ตัดสินซ้ำสองที่
  const lockRequest = perms.formLocked || !perms.canEditRequestFields;
  const lockPricing = perms.formLocked || !perms.canEditPricing;

  // คำนวณยอดของแถวให้ตรงกับที่กรอกเสมอ — ทำเฉพาะตอนแก้ได้ ไม่งั้น view mode
  // จะไป setValue ทับค่าที่โหลดมาจาก server แล้วฟอร์มกลายเป็น dirty เอง
  usePr2AmountSync(form, index, !rowLocked);

  if (!item) return null;

  /**
   * ไม่ branch เลือก component ตามโหมดในนี้ — ส่ง flag ให้ cell ตัดสินเอง
   * แบบเดียวกับหน้าเดิม (pr-item-table ส่ง isDisabled แล้ว cell แต่ละตัวเลือกว่า
   * จะเป็นช่องกรอกหรือข้อความ และเรียก useIsRowLocked เองด้วย)
   *
   * ของเดิมในไฟล์นี้เขียนเป็น `if (!lock) return <Cell/>; return <plain/>` ซึ่ง
   * ทำให้ tree สลับ component ทุกครั้งที่สลับโหมด (unmount/mount แทนที่จะเปลี่ยน
   * prop) และตรรกะ "โหมดไหนแสดงอะไร" ถูกเขียนซ้ำสองที่ มีวันหลุดจากกัน
   */
  const cellContent = (col: Pr2Column) => {
    switch (col.key) {
      case "select":
        if (!perms.canSelectRows) return null;
        return (
          <Checkbox
            checked={selected}
            onCheckedChange={(c) => onSelect(index, c === true)}
            aria-label={`${t("selected")} ${index + 1}`}
          />
        );
      case "total":
        // ยอดรวม + สกุลเงิน — คอลัมน์ `amount` ของหน้าเดิม (AmountCell + CurrencyCell)
        // ยอดคำนวณเองอยู่แล้ว เลือกได้แค่สกุลเงิน จึงผูกกับ formLocked ตรงๆ
        return (
          <div className="flex items-start justify-end gap-1">
            <Pr2AmountBreakdown
              control={control}
              index={index}
              baseCurrencyCode={baseCurrencyCode}
            />
            {/* กล่องยอดยืดเต็มที่ว่าง — flex-1 อยู่ที่ตัวห่อ ไม่ใช่ที่ InputSuffix */}
            <div className="min-w-0 flex-1">
              <AmountCell
                control={control}
                index={index}
                baseCurrencyCode={baseCurrencyCode}
                isDisabled={perms.formLocked}
                currencySlot={
                  <CurrencyCell
                    control={control}
                    form={form}
                    index={index}
                    isDisabled={perms.formLocked}
                  />
                }
              />
            </div>
          </div>
        );
      case "action":
        // ท้ายแถว = ประวัติรายการ + ปุ่มลบ เหมือนคอลัมน์ action ของหน้าเดิม
        return (
          <div className="flex items-center justify-center gap-0.5">
            {(item.history?.length ?? 0) > 0 && (
              <PrItemHistorySheet
                history={item.history ?? []}
                productName={item.product_name}
              />
            )}
            {onRemove && !rowLocked && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(index)}
                aria-label={t("removeItem")}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        );
      case "seq":
        return (
          <span className="text-muted-foreground tabular-nums">
            {index + 1}
          </span>
        );
      case "status":
        return (
          <Pr2StatusPill
            status={item.current_stage_status || "pending"}
            initialStatus={item._initial_stage_status}
            canEdit={perms.canSelectRows && !perms.formLocked}
            onReset={() => {
              form.setValue(
                `items.${index}.stage_status`,
                PR_ITEM_STAGE_STATUS.PENDING,
                { shouldDirty: true },
              );
              form.setValue(
                `items.${index}.current_stage_status`,
                PR_ITEM_STAGE_STATUS.PENDING,
                { shouldDirty: true },
              );
            }}
          />
        );
      case "product":
        return (
          <ProductCell
            control={control}
            form={form}
            index={index}
            isDisabled={lockRequest}
            buCode={buCode}
            inventoryActions={{
              onOnHand: () => setOnHandOpen(true),
              onOnOrder: () => setOnOrderOpen(true),
            }}
          />
        );
      case "location":
        return (
          <LocationCell
            control={control}
            form={form}
            index={index}
            isDisabled={lockRequest}
          />
        );
      case "requested":
        return (
          <RequestedCell
            control={control}
            form={form}
            index={index}
            isDisabled={lockRequest}
          />
        );
      case "approved":
        return (
          <ApprovedCell
            control={control}
            form={form}
            index={index}
            isQtyDisabled={perms.formLocked}
            isUnitDisabled={lockRequest}
          />
        );
      case "foc":
        return (
          <FocCell
            control={control}
            form={form}
            index={index}
            isQtyDisabled={perms.formLocked}
            isUnitDisabled={lockRequest}
          />
        );
      case "vendor":
        return (
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0 flex-1">
              <Pr2VendorCell
                form={form}
                index={index}
                isDisabled={lockPricing}
              />
            </div>
            <PrPricelistCompare
              control={control}
              form={form}
              index={index}
              role={role}
              isDisabled={perms.formLocked}
              className="shrink-0"
            />
          </div>
        );
      case "unitPrice":
        return (
          <Pr2UnitPriceCell
            form={form}
            index={index}
            isDisabled={lockPricing}
            buCode={buCode}
          />
        );
      case "exchangeRate":
        return (
          <Pr2ExchangeRateCell
            form={form}
            index={index}
            isDisabled={lockPricing}
            baseCurrencyCode={baseCurrencyCode}
          />
        );
      case "discount":
        return (
          <Pr2DiscountCell form={form} index={index} isDisabled={lockPricing} />
        );
      case "tax":
        return <Pr2TaxCell form={form} index={index} isDisabled={lockPricing} />;
      case "deliveryPoint":
        return (
          <DeliveryPointCell
            control={control}
            form={form}
            index={index}
            isDisabled={perms.formLocked}
          />
        );
      case "deliveryDate":
        return (
          <DeliveryDateCell
            control={control}
            index={index}
            isDisabled={perms.formLocked}
            today={today}
            dateFormat={dateFormat}
          />
        );
      case "comment":
        // หน้าเดิมให้กรอกได้ผ่านแถบใต้ตาราง (comment-footer-row) v2 ไม่มีแถบนั้น
        // จึงต้องกรอกในเซลล์ได้เอง — เงื่อนไขล็อกเดียวกับของเดิม (isDisabled ||
        // แถวถูกตัดสินแล้ว) ไม่ผูกกับ role เพราะทุก stage คอมเมนต์ได้
        if (rowLocked) {
          if (!item.comment) {
            return <span className="text-muted-foreground text-xs">{EMPTY}</span>;
          }
          // ตัดท้ายในเซลล์ ไม่ดันความกว้างคอลัมน์ — อยากอ่านเต็มก็ hover
          return (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground block truncate text-xs">
                    {item.comment}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-popover text-popover-foreground [&>svg]:fill-popover [&>svg]:text-border max-w-[24rem] rounded-lg border px-3 py-2 shadow-md"
                >
                  <p className="text-xs wrap-break-word whitespace-pre-wrap">
                    {item.comment}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return (
          <Input
            maxLength={256}
            placeholder={tfl("comment")}
            className="h-8 w-full text-xs"
            {...form.register(`items.${index}.comment`)}
          />
        );
      default:
        return EMPTY;
    }
  };

  // พื้นหลังของช่องที่ตรึงต้องทึบ ไม่งั้นแถวที่เลื่อนผ่านจะทะลุขึ้นมาให้เห็น
  const frozenBg = selected
    ? "bg-primary/10"
    : zebra
      ? "bg-muted"
      : "bg-background";

  return (
    <tr
      ref={rowRef}
      data-index={vIndex}
      className={cn(
        "border-border/60 hover:bg-accent/40 border-b transition-colors",
        zebra && "bg-muted/30",
        selected && "bg-primary/5",
      )}
    >
      {columns.map((col, i) => {
        const frozen = i < pr2FrozenCount(perms.isCreatorView, perms.showSelectColumn);
        return (
          <td
            key={col.key}
            className={cn(
              "border-border/40 border-r px-2 py-2 align-middle last:border-r-0",
              col.align === "right" && "text-right",
              col.align === "center" && "text-center",
              frozen && cn("sticky z-10", frozenBg),
            )}
            style={frozen ? { left: pr2FrozenOffsets(perms.isCreatorView, perms.showSelectColumn)[i] } : undefined}
          >
            {cellContent(col)}
            {i === 0 && item.product_id && (
              <>
                <PrOnHandDialog
                  open={onHandOpen}
                  onOpenChange={setOnHandOpen}
                  productId={item.product_id}
                />
                <PrOnOrderDialog
                  open={onOrderOpen}
                  onOpenChange={setOnOrderOpen}
                  productId={item.product_id}
                />
              </>
            )}
          </td>
        );
      })}
    </tr>
  );
});
