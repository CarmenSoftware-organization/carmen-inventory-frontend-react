
import { memo } from "react";
import { useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductFormInstance } from "@/types/product";

interface Props {
  readonly form: ProductFormInstance;
}

function RequiredChecklist({ form }: Props) {
  const t = useTranslations("productManagement.product");

  const [name, localName, itemGroup, inventoryUnit, price, orderUnits, barcode] =
    useWatch({
      control: form.control,
      name: [
        "name",
        "local_name",
        "product_item_group_id",
        "inventory_unit_id",
        "price",
        "order_units",
        "barcode",
      ],
    });

  const items = [
    { k: "name", label: t("reqName"), done: !!name },
    { k: "local_name", label: t("reqLocalName"), done: !!localName },
    { k: "item_group", label: t("reqItemGroup"), done: !!itemGroup },
    { k: "unit", label: t("reqInventoryUnit"), done: !!inventoryUnit },
    { k: "price", label: t("reqPrice"), done: price != null },
    {
      k: "order_units",
      label: t("reqOrderUnit"),
      done: (orderUnits?.length ?? 0) > 0,
    },
    { k: "barcode", label: t("reqBarcode"), done: !!barcode },
  ];

  const doneCount = items.filter((it) => it.done).length;
  const total = items.length;
  const complete = doneCount === total;

  return (
    <div className="border-primary/30 bg-primary/5 rounded-md border px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-primary text-xs font-semibold">
          {t("requiredToSave")}{" "}
          <span className={complete ? "text-success" : undefined}>
            · {t("requiredComplete", { done: doneCount, total })}
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {items.map((it) => (
            <span
              key={it.k}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem]",
                it.done
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-primary/30 bg-background text-muted-foreground",
              )}
            >
              {it.done ? (
                <Check className="size-2.5" aria-hidden="true" />
              ) : (
                <span
                  aria-hidden="true"
                  className="border-muted-foreground/50 inline-block size-2 rounded-full border"
                />
              )}
              {it.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(RequiredChecklist);
