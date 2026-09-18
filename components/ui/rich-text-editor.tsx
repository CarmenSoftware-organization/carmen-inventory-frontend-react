import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { RichTextEditorProps } from "./rich-text-editor-inner";

// TipTap + ProseMirror หนักกว่าทุกอย่างในหน้าที่ใช้มันรวมกัน และมีแค่สองที่ที่เรียก
// (หน้าตั้งค่าข้อความอีเมล กับ dialog ส่งเอกสาร) จึงแยก chunk ให้โหลดตอนเปิดจริง
const RichTextEditorInner = lazy(() =>
  import("./rich-text-editor-inner").then((mod) => ({
    default: mod.RichTextEditorInner,
  })),
);

export function RichTextEditor(props: RichTextEditorProps) {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full rounded-md" />}>
      <RichTextEditorInner {...props} />
    </Suspense>
  );
}

export type { RichTextEditorProps };
