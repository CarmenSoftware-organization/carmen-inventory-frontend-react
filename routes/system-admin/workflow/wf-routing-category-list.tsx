import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import type { Product } from "@/types/workflows";
import type { WorkflowCreateModel } from "./wf-form-schema";

interface CategoryCheckboxListProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly ruleIndex: number;
  readonly isDisabled: boolean;
  readonly allProducts: Product[];
}

export function CategoryCheckboxList({
  form,
  ruleIndex,
  isDisabled,
  allProducts,
}: CategoryCheckboxListProps) {
  const t = useTranslations("systemAdmin.workflow");
  const products = useWatch({ control: form.control, name: "data.products" });

  // form เก็บ product แค่ id — ชื่อ category ต้อง join จาก master (สินค้าที่หาย
  // จาก master แล้ว fallback ไป snapshot เก่าถ้า row นั้นยังมีติดมา)
  const masterById = new Map(allProducts.map((p) => [p.id, p]));
  const catMap = new Map<string, string>();
  for (const p of products ?? []) {
    const cat = masterById.get(p.id)?.product_category ?? p.product_category;
    if (cat?.id && cat?.name) {
      catMap.set(cat.id, cat.name);
    }
  }
  const categories = Array.from(catMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  const value =
    useWatch({
      control: form.control,
      name: `data.routing_rules.${ruleIndex}.condition.value`,
    }) ?? [];
  const valueSet = new Set(value);

  const toggle = (catName: string) => {
    if (valueSet.has(catName)) {
      form.setValue(
        `data.routing_rules.${ruleIndex}.condition.value`,
        value.filter((v) => v !== catName),
      );
    } else {
      form.setValue(`data.routing_rules.${ruleIndex}.condition.value`, [
        ...value,
        catName,
      ]);
    }
  };

  return (
    <Field>
      <FieldLabel>{t("categories")}</FieldLabel>
      <div className="max-h-32 space-y-1 overflow-y-auto rounded border p-1.5">
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("noCategoriesAddProducts")}
          </p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5">
              <Checkbox
                checked={valueSet.has(cat.name)}
                onCheckedChange={() => toggle(cat.name)}
                disabled={isDisabled}
              />
              <span className="text-xs">{cat.name}</span>
            </div>
          ))
        )}
      </div>
    </Field>
  );
}
