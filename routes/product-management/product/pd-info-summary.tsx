
import { useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  FileText,
  AlignLeft,
  Settings2,
  PackageCheck,
  Barcode,
  Hash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import type { ProductFormInstance, ProductDetail } from "@/types/product";

interface InfoSummaryProps {
  readonly form: ProductFormInstance;
  readonly product?: ProductDetail;
  readonly inventoryUnitName: string;
  readonly defaultOrderUnitName: string;
  readonly isDisabled: boolean;
}

/**
 * Section สรุปข้อมูลสินค้าที่ไม่อยู่ใน tab
 *
 * View mode: grid key-value อ่านอย่างเดียว ไม่มีกรอบ เพื่อประหยัดพื้นที่
 * Edit mode: ให้กรอก local_name, barcode, sku, description + แสดง
 * inventory_unit / default_order_unit เป็น read-only ที่แยก visual ชัดเจน
 */
export function ProductInfoSummary({
  form,
  inventoryUnitName,
  defaultOrderUnitName,
  isDisabled,
}: InfoSummaryProps) {
  const tfl = useTranslations("field");
  const t = useTranslations("productManagement.product");

  const description = useWatch({ control: form.control, name: "description" }) ?? "";
  const localName = useWatch({ control: form.control, name: "local_name" }) ?? "";
  const barcode = useWatch({ control: form.control, name: "barcode" }) ?? "";
  const sku = useWatch({ control: form.control, name: "sku" }) ?? "";

  if (!isDisabled) {
    return (
      <section className="space-y-3">
        <Field data-invalid={!!form.formState.errors.local_name}>
          <FieldLabel className="text-xs" required>
            {tfl("localName")}
          </FieldLabel>
          <Input
            className="h-8"
            placeholder={t("localNamePlaceholder")}
            maxLength={100}
            {...form.register("local_name")}
          />
        </Field>

        <Field>
          <FieldLabel className="text-xs">{tfl("description")}</FieldLabel>
          <Input
            className="h-8"
            placeholder={tfl("description")}
            maxLength={256}
            {...form.register("description")}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel className="text-xs">{tfl("barcode")}</FieldLabel>
            <Input
              className="h-8"
              placeholder={t("barcodePlaceholder")}
              {...form.register("barcode")}
            />
          </Field>
          <Field>
            <FieldLabel className="text-xs">{tfl("sku")}</FieldLabel>
            <Input
              className="h-8"
              placeholder={t("skuPlaceholder")}
              {...form.register("sku")}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadOnlyField
            icon={<Settings2 className="size-3" aria-hidden="true" />}
            label={tfl("inventoryUnit")}
            value={inventoryUnitName}
          />
          <ReadOnlyField
            icon={<PackageCheck className="size-3" aria-hidden="true" />}
            label={tfl("defaultOrderUnit")}
            value={defaultOrderUnitName}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      <ViewItem
        icon={<AlignLeft className="size-3" aria-hidden="true" />}
        label={tfl("localName")}
        value={localName}
      />
      <ViewItem
        icon={<Barcode className="size-3" aria-hidden="true" />}
        label={tfl("barcode")}
        value={barcode}
      />
      <ViewItem
        icon={<Settings2 className="size-3" aria-hidden="true" />}
        label={tfl("inventoryUnit")}
        value={inventoryUnitName}
      />
      <ViewItem
        icon={<FileText className="size-3" aria-hidden="true" />}
        label={tfl("description")}
        value={description}
      />
      <ViewItem
        icon={<Hash className="size-3" aria-hidden="true" />}
        label={tfl("sku")}
        value={sku}
      />
      <ViewItem
        icon={<PackageCheck className="size-3" aria-hidden="true" />}
        label={tfl("defaultOrderUnit")}
        value={defaultOrderUnitName}
      />
    </section>
  );
}

function ViewItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="truncate text-sm font-semibold text-foreground" title={value || undefined}>
        {value || "—"}
      </p>
    </div>
  );
}

function ReadOnlyField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <div
        className="flex h-8 items-center rounded-md bg-muted/50 px-3 text-sm text-muted-foreground"
        title={value || undefined}
      >
        {value || "—"}
      </div>
    </div>
  );
}
