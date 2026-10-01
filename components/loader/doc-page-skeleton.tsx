import { FormPageShell } from "@/components/share/form-page-shell";
import { FormPageHeaderSkeleton } from "@/components/loader/form-page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * loading state ของหน้าเอกสาร (PO/PR/GRN/CN/SR) — หัว + แถวช่องข้อมูลหัวใบ +
 * ตารางรายการ ในโครง FormPageShell แบบ wide เหมือนหน้าจริง (spec
 * 2026-10-02-form-page-shell-documents-design.md §2.3)
 */
export function DocPageSkeleton() {
  return (
    <FormPageShell width="wide" header={<FormPageHeaderSkeleton />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="space-y-2 rounded-lg border p-3">
          <Skeleton className="h-6 w-full" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </FormPageShell>
  );
}
