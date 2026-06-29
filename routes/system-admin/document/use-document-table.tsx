import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  FileSpreadsheet,
  FileText,
  FileImage,
  File,
  FileArchive,
  FileCode,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import {
  selectColumn,
  indexColumn,
  actionColumn,
} from "@/components/ui/data-grid/columns";
import type { DocumentFile } from "@/types/document";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";

interface UseDocumentTableOptions {
  documents: DocumentFile[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onDelete: (doc: DocumentFile) => void;
}

/**
 * แปลงจำนวน bytes เป็นข้อความขนาดไฟล์ (B, KB, MB)
 * @param bytes - ขนาดไฟล์เป็น bytes
 * @returns ข้อความแสดงขนาดไฟล์ในหน่วยที่เหมาะสม
 * @example
 * formatFileSize(1048576); // "1.0 MB"
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * คืนค่าข้อมูลประเภทไฟล์ (icon, label key, className) ตาม content type
 * @param contentType - MIME type ของไฟล์ (เช่น "application/pdf")
 * @returns ออบเจกต์ที่มี icon component, labelKey และ className สำหรับสี
 * @example
 * getFileTypeInfo("application/pdf"); // { icon: FileText, labelKey: "pdf", className: "text-red-500" }
 */
const getFileTypeInfo = (contentType: string) => {
  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    contentType.includes("csv")
  )
    return {
      icon: FileSpreadsheet,
      labelKey: "xls" as const,
      className: "text-green-600",
    };
  if (contentType.includes("pdf"))
    return { icon: FileText, labelKey: "pdf" as const, className: "text-red-500" };
  if (contentType.includes("image"))
    return { icon: FileImage, labelKey: "image" as const, className: "text-blue-500" };
  if (
    contentType.includes("zip") ||
    contentType.includes("rar") ||
    contentType.includes("compressed")
  )
    return {
      icon: FileArchive,
      labelKey: "archive" as const,
      className: "text-amber-500",
    };
  if (contentType.includes("text/plain"))
    return { icon: FileText, labelKey: "txt" as const, className: "text-gray-500" };
  if (contentType.includes("word") || contentType.includes("document"))
    return {
      icon: FileText,
      labelKey: "doc" as const,
      className: "text-blue-600",
    };
  if (
    contentType.includes("json") ||
    contentType.includes("xml") ||
    contentType.includes("html")
  )
    return { icon: FileCode, labelKey: "code" as const, className: "text-purple-500" };
  return { icon: File, labelKey: "file" as const, className: "text-muted-foreground" };
};

/**
 * Hook กำหนดคอลัมน์และ config ของตารางเอกสาร (Document) พร้อมไอคอนประเภทไฟล์
 * @param options - อาร์เรย์ documents, totalRecords, params, tableConfig และ callback onDelete
 * @returns TanStack Table instance สำหรับ Document
 * @example
 * const table = useDocumentTable({ documents, totalRecords, params, tableConfig, onDelete });
 */
export function useDocumentTable({
  documents,
  totalRecords,
  params,
  tableConfig,
  onDelete,
}: UseDocumentTableOptions) {
  "use no memo";

  const { dateFormat } = useProfile();
  const t = useTranslations("systemAdmin.document");
  const tfl = useTranslations("field");

  const columns: ColumnDef<DocumentFile>[] = [
    selectColumn<DocumentFile>(),
    indexColumn<DocumentFile>(params),
    {
      accessorKey: "originalName",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("fileName")} />
      ),
      cell: ({ row }) => (
        <span
          className="font-semibold text-xs block truncate max-w-100"
          title={row.getValue("originalName")}
        >
          {row.getValue("originalName")}
        </span>
      ),
      size: 300,
    },
    {
      accessorKey: "contentType",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("type")} />
      ),
      cell: ({ row }) => {
        const contentType: string = row.getValue("contentType");
        const { icon: Icon, labelKey, className } = getFileTypeInfo(contentType);
        return (
          <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${className}`} />
            <span className="text-xs">{t(labelKey)}</span>
          </div>
        );
      },
      size: 110,
    },
    {
      accessorKey: "size",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("size")} />
      ),
      cell: ({ row }) => formatFileSize(row.getValue("size")),
      size: 100,
    },
    {
      accessorKey: "lastModified",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("lastModified")} />
      ),
      cell: ({ row }) => formatDate(row.getValue("lastModified"), dateFormat),
      size: 120,
    },
    actionColumn<DocumentFile>(onDelete),
  ];

  return useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (params.perpage as number)),
  });
}
