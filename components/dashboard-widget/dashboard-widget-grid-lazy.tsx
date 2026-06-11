import { lazy, Suspense, type ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

/** Fallback ระหว่างโหลด chunk ของ grid (recharts) — ไม่ดึง recharts มาด้วย */
function DashboardWidgetGridSkeleton() {
  return (
    <div className="space-y-4 p-3" aria-busy="true">
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// next/dynamic → React.lazy + Suspense (Vite code-splits the dynamic import into
// its own chunk, so recharts ~100-150KB gzipped stays out of first-load JS).
// ssr:false จาก Next ไม่จำเป็นแล้วเพราะ SPA render ฝั่ง client อยู่แล้ว
const DashboardWidgetGridInner = lazy(() =>
  import("./dashboard-widget-grid").then((m) => ({
    default: m.DashboardWidgetGrid,
  })),
);

/**
 * Lazy wrapper ของ `DashboardWidgetGrid`
 *
 * grid ดึง `recharts` (~100-150KB gzipped) แบบ static — ถ้า import ตรง จะติด
 * first-load JS ของทุก module landing ที่ใช้ wrapper นี้แทนทำให้ recharts ถูก
 * code-split ออกไปเป็น chunk แยก โหลดหลัง landing แสดงผล
 */
export function DashboardWidgetGrid(
  props: ComponentProps<typeof DashboardWidgetGridInner>,
) {
  return (
    <Suspense fallback={<DashboardWidgetGridSkeleton />}>
      <DashboardWidgetGridInner {...props} />
    </Suspense>
  );
}
