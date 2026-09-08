import * as React from "react";
import { CheckIcon, MinusIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Checkbox component ห่อ Radix Checkbox — ติ๊กครบเป็นเครื่องหมายถูก ติ๊กบางส่วน
 * (indeterminate) เป็นขีด
 * @param props - props ของ Radix Checkbox Root
 * @returns React element checkbox
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // indeterminate ต้องทึบเท่า checked — Radix render Indicator ตอน indeterminate
        // ด้วย ถ้าไม่ทาพื้นจะได้เครื่องหมายสี primary-foreground (เกือบขาวใน light)
        // บนกล่องพื้นใส = มองไม่เห็นอะไรเลย ส่วนที่แยกสองสถานะคือไอคอน (ขีด/ถูก)
        "peer border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:bg-input/30 dark:data-[state=unchecked]:border-muted-foreground/60 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary dark:data-[state=indeterminate]:bg-primary size-4 shrink-0 rounded-[4px] border transition-shadow outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* สลับไอคอนด้วย data-state ของ Indicator ไม่ใช่เช็ค prop `checked` —
          uncontrolled (defaultChecked) ก็ยังถูก */}
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="group grid place-content-center transition-none"
      >
        <CheckIcon
          className="text-primary-foreground col-start-1 row-start-1 size-3.5 group-data-[state=indeterminate]:hidden"
          strokeWidth={3}
        />
        <MinusIcon
          className="text-primary-foreground col-start-1 row-start-1 size-3.5 group-data-[state=checked]:hidden"
          strokeWidth={3}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
