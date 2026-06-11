import { File } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DocumentFile } from "@/types/document";

/**
 * แปลงจำนวน bytes เป็นข้อความขนาดไฟล์ (B, KB, MB) สำหรับแสดงในการ์ด
 * @param bytes - ขนาดไฟล์เป็น bytes
 * @returns ข้อความแสดงขนาดไฟล์ในหน่วยที่เหมาะสม
 * @example
 * formatSize(2048); // "2.0 KB"
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface DocumentCardProps {
  readonly item: DocumentFile;
  readonly index?: number;
  readonly onClick?: (item: DocumentFile) => void;
}

/**
 * การ์ดแสดงข้อมูลเอกสาร (Document) สำหรับ mobile view
 * @param props - ข้อมูล item เอกสาร, ลำดับ index และ callback onClick
 * @returns React element ของการ์ดเอกสาร
 * @example
 * <DocumentCard item={doc} index={0} onClick={handleOpen} />
 */
export default function DocumentCard({ item, index, onClick }: DocumentCardProps) {
  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(item)}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(item);
        }
      }}
      className="gap-0 py-0 transition-all hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center gap-2 truncate text-sm">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <File
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">{item.originalName}</span>
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="flex items-center justify-between px-4 py-3 text-xs">
        <span className="text-muted-foreground">{formatSize(item.size)}</span>
        <span className="text-muted-foreground">
          {new Date(item.lastModified).toLocaleDateString()}
        </span>
      </CardContent>
    </Card>
  );
}
