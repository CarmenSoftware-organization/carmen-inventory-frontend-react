
import { memo } from "react";
import { useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import type { ProductFormInstance } from "@/types/product";

type ArrayName =
  | "info"
  | "locations"
  | "order_units"
  | "ingredient_units";

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
  if (count === 0) return null;
  return (
    <Badge
      variant="secondary"
      size="xs"
      className="ml-1.5 h-4 min-w-4 px-1 text-[0.625rem]"
    >
      {count}
    </Badge>
  );
}

export default memo(TabArrayCount);
