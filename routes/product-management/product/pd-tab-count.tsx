import { memo } from "react";
import { useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { useProductEcoLabels } from "@/hooks/use-product-eco-label";
import type { ProductFormInstance } from "@/types/product";

/** ป้ายตัวเลขบนแท็บ — ซ่อนเมื่อยังไม่มีอะไร ไม่โชว์เลข 0 */
function CountBadge({ count }: { readonly count: number }) {
  if (count === 0) return null;
  return (
    <Badge
      variant="secondary"
      size="xs"
      className="text-micro-legal ml-1.5 h-4 min-w-4 px-1"
    >
      {count}
    </Badge>
  );
}

/**
 * ตัวนับของแท็บ Eco Labels
 *
 * แยกจาก `TabArrayCount` เพราะ eco label ไม่ได้อยู่ในฟอร์ม — เป็น CRUD อิสระที่
 * ยิง API ของตัวเอง จึงต้องอ่านจำนวนจาก query ไม่ใช่จาก field array
 */
export const TabEcoLabelCount = memo(function TabEcoLabelCount({
  productId,
}: {
  readonly productId?: string;
}) {
  const { data } = useProductEcoLabels(productId);
  return <CountBadge count={data?.data?.length ?? 0} />;
});

type ArrayName = "info" | "locations" | "order_units" | "ingredient_units";

interface Props {
  readonly form: ProductFormInstance;
  // Single name or multiple names whose counts are summed (used for the
  // merged "Unit" tab covering order_units + ingredient_units).
  readonly name: ArrayName | ArrayName[];
}

function TabArrayCount({ form, name }: Props) {
  const names = Array.isArray(name) ? name : [name];
  const values = useWatch({ control: form.control, name: names }) as
    | (unknown[] | undefined)[]
    | undefined;
  const count = (values ?? []).reduce(
    (sum, arr) => sum + (arr?.length ?? 0),
    0,
  );
  return <CountBadge count={count} />;
}

export default memo(TabArrayCount);
