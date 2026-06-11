export interface XlsxColumn<T> {
  /** Sheet column header text (already translated) */
  header: string;
  /** Cell value extractor — return primitive that Excel can store */
  value: (row: T, index: number) => string | number | boolean | null | undefined;
  /** Column width in characters (xlsx `wch`). Default 16 */
  width?: number;
}

interface DownloadXlsxOptions<T> {
  rows: T[];
  columns: XlsxColumn<T>[];
  sheetName: string;
  fileName: string;
}

/**
 * Build an xlsx workbook from rows + column definitions and trigger browser download.
 * XLSX is loaded lazily — only pulled into the bundle when this function is called.
 * @returns Promise<void> (file is downloaded via XLSX.writeFile)
 */
export async function downloadXlsx<T>({
  rows,
  columns,
  sheetName,
  fileName,
}: DownloadXlsxOptions<T>): Promise<void> {
  const XLSX = await import("xlsx");

  const headerOrder = columns.map((c) => c.header);
  const sheetData = rows.map((row, i) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      obj[col.header] = col.value(row, i) ?? "";
    }
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(sheetData, { header: headerOrder });
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 16 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const finalName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

/**
 * Build a date-suffixed file name like `purchase-request_2026-04-30`
 */
export function buildXlsxFileName(prefix: string, date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10);
  return `${prefix}_${dateStr}`;
}
