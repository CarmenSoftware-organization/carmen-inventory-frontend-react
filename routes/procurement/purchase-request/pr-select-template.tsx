import { useTranslations } from "use-intl";
import { ChevronRight, LayoutTemplate, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PurchaseRequestTemplate } from "@/types/purchase-request";

interface Props {
  readonly template: PurchaseRequestTemplate;
  readonly onSelect: (id: string) => void;
}

const PREVIEW_LIMIT = 3;

/**
 * การ์ดเทมเพลตใบขอซื้อให้เลือก — premium ERP design
 *
 * แสดง icon tile, ชื่อเทมเพลต, workflow, จำนวนรายการ, และตัวอย่างรายการ
 * สินค้า 3 รายการแรกพร้อมจำนวนที่ขอ หากมีมากกว่านั้นจะแสดง "and N more"
 * มี hover effect (border + shadow + translate) และ chevron ไอคอนด้านขวา
 *
 * @param props - ข้อมูลเทมเพลต PR (template) และ callback เมื่อผู้ใช้คลิกเลือก
 * @returns React element ของการ์ดเทมเพลต PR เป็นปุ่มที่กดได้
 * @example
 * <PrSelectTemplate template={template} onSelect={(id) => loadTemplate(id)} />
 */
export default function PrSelectTemplate({ template, onSelect }: Props) {
  const t = useTranslations("procurement.purchaseRequest");
  const items = template.purchase_request_template_detail;
  const previewItems = items.slice(0, PREVIEW_LIMIT);
  const remaining = items.length - PREVIEW_LIMIT;

  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className="group bg-card hover:border-primary/40 focus-visible:ring-primary/40 relative flex w-full min-w-0 items-start gap-3 overflow-hidden rounded-xl border p-3 text-left transition-colors duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
    >
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
        <LayoutTemplate className="size-4" />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{template.name}</h3>
            {template.workflow_name && (
              <p className="text-muted-foreground mt-0.5 truncate text-[0.6875rem]">
                {template.workflow_name}
              </p>
            )}
          </div>
          <Badge
            variant="secondary"
            size="xs"
            className="shrink-0 tabular-nums"
          >
            {t("nItems", { count: items.length })}
          </Badge>
        </div>

        {items.length > 0 && (
          <div className="bg-muted/40 space-y-1 rounded-md border p-2">
            {previewItems.map((item) => (
              <div
                key={item.id}
                className="flex min-w-0 items-center gap-1.5 text-[0.6875rem]"
              >
                <Package
                  aria-hidden="true"
                  className="text-muted-foreground size-3 shrink-0"
                />
                <Badge
                  variant="outline"
                  size="xs"
                  className="shrink-0 text-[0.625rem]"
                >
                  {item.product_code}
                </Badge>
                <span className="text-foreground min-w-0 flex-1 truncate">
                  {item.product_name}
                </span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {item.requested_qty} {item.requested_unit_name}
                </span>
              </div>
            ))}
            {remaining > 0 && (
              <p className="text-muted-foreground/70 pl-4.5 text-[0.625rem]">
                {t("nMore", { count: remaining })}
              </p>
            )}
          </div>
        )}
      </div>

      <ChevronRight
        className="text-muted-foreground group-hover:text-primary mt-2 size-4 shrink-0 transition-all group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  );
}
