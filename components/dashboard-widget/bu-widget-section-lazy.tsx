import { lazy, Suspense, type ComponentProps } from "react";

// BuWidgetSection ดึง recharts ผ่าน widget card — แยก chunk เหมือน grid lazy
// เพื่อไม่ให้ recharts กลับเข้า route chunk ของ module dashboard
const BuWidgetSectionInner = lazy(() =>
  import("./bu-widget-section").then((m) => ({ default: m.BuWidgetSection })),
);

/** Lazy wrapper ของ `BuWidgetSection` — fallback เป็น null เพื่อไม่เว้นช่องว่างระหว่างโหลด */
export function BuWidgetSection(
  props: ComponentProps<typeof BuWidgetSectionInner>,
) {
  return (
    <Suspense fallback={null}>
      <BuWidgetSectionInner {...props} />
    </Suspense>
  );
}
