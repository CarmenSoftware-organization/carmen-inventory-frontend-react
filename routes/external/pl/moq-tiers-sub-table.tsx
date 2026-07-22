import { useWatch, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field";
import type {
  MoqTierDto,
  PricelistExternalDto,
} from "@/types/price-list-external";

interface MoqTiersEditorProps {
  form: UseFormReturn<PricelistExternalDto>;
  /** index ของ item ใน tb_pricelist_detail ที่ tier พวกนี้สังกัด */
  index: number;
}

const NUMBER_CLASS =
  "border-border/60 h-8 w-full rounded-md text-right text-xs tabular-nums";

/**
 * Inline editor ของ MOQ pricing tiers (ขั้นต่ำ → ราคา → lead time) ต่อ item
 *
 * ออกแบบตาม DESIGN.md: ไม่มี grid chrome/edit-toggle — vendor อยู่ใน edit mode
 * อยู่แล้ว จึงแก้ได้ตรง ๆ ทุกช่อง · เพิ่ม/ลบ tier ทีเดียวจบ · สีเดียว (ปุ่มเพิ่ม =
 * primary, ลบ = muted จนกว่าจะ hover)
 *
 * State อยู่ที่ form ล้วน (`useWatch` + `setValue`) ไม่มี local state — input เป็น
 * uncontrolled (`defaultValue`) และ row key ด้วย tier.id ที่นิ่ง จึงพิมพ์ได้โดย
 * focus ไม่หลุด แม้ค่าจะ re-render (setValue บน path nested ไม่ทำให้ fields ของ
 * useFieldArray แม่ churn → sub-row ไม่ remount)
 */
export default function MoqTiersEditor({ form, index }: MoqTiersEditorProps) {
  const path = `tb_pricelist_detail.${index}.moq_tiers` as const;
  const tiers =
    (useWatch({ control: form.control, name: path }) as
      | MoqTierDto[]
      | undefined) ?? [];

  const setTiers = (next: MoqTierDto[]) =>
    form.setValue(path, next, { shouldDirty: true });

  const setField = (i: number, field: keyof MoqTierDto, value: number) =>
    setTiers(tiers.map((t, j) => (j === i ? { ...t, [field]: value } : t)));

  const removeTier = (i: number) =>
    setTiers(tiers.filter((_, j) => j !== i));

  const addTier = () =>
    setTiers([
      ...tiers,
      {
        id: `tier-new-${Date.now()}`,
        minimum_quantity: 0,
        price: 0,
        lead_time_days: 0,
      },
    ]);

  return (
    <div className="bg-muted/30 px-6 py-4">
      <div className="max-w-2xl space-y-1.5">
        <div className="text-muted-foreground grid grid-cols-[1fr_1fr_1fr_2rem] gap-3 px-0.5 text-[0.625rem] font-semibold tracking-wider uppercase">
          <span>Min Qty</span>
          <span>Price</span>
          <span>Lead Time</span>
          <span />
        </div>

        {tiers.length === 0 ? (
          <p className="text-muted-foreground py-1 text-xs">
            No pricing tiers yet.
          </p>
        ) : (
          tiers.map((tier, i) => (
            <div
              key={tier.id}
              className="grid grid-cols-[1fr_1fr_1fr_2rem] items-center gap-3"
            >
              <FieldInput
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                defaultValue={tier.minimum_quantity}
                className={NUMBER_CLASS}
                onChange={(e) =>
                  setField(i, "minimum_quantity", Number(e.target.value))
                }
              />
              <FieldInput
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0.00"
                defaultValue={tier.price}
                className={NUMBER_CLASS}
                onChange={(e) => setField(i, "price", Number(e.target.value))}
              />
              <FieldInput
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
                defaultValue={tier.lead_time_days ?? 0}
                className={NUMBER_CLASS}
                onChange={(e) =>
                  setField(i, "lead_time_days", Number(e.target.value))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove tier"
                onClick={() => removeTier(i)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addTier}
          className="text-primary hover:text-primary hover:bg-primary/5 -ml-1 mt-1 gap-1"
        >
          <Plus className="size-3.5" />
          Add tier
        </Button>
      </div>
    </div>
  );
}
