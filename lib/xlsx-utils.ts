export interface XlsxColumn<T> {
  header: string;
  value: (
    row: T,
    index: number,
  ) => string | number | boolean | null | undefined;
  width?: number;
}

interface DownloadXlsxOptions<T> {
  rows: T[];
  columns: XlsxColumn<T>[];
  sheetName: string;
  fileName: string;
}

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

export function buildXlsxFileName(prefix: string, date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10);
  return `${prefix}_${dateStr}`;
}

export async function readXlsxFirstSheet(
  file: File,
): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[first], {
    defval: "",
  });
}
