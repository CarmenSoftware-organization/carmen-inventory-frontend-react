import { useState } from "react";
import {
  buildXlsxFileName,
  downloadXlsx,
  type XlsxColumn,
} from "@/lib/xlsx-utils";

export type { XlsxColumn };

interface ExportArgs<T> {
  /** Async function returning rows to export. Caller handles endpoint + unwrap. */
  fetch: () => Promise<T[]>;
  /** Column definitions: header (already translated) + value extractor */
  columns: XlsxColumn<T>[];
  /** Sheet tab name inside the workbook */
  sheetName: string;
  /** File name prefix; the helper appends `_YYYY-MM-DD.xlsx` */
  fileNamePrefix: string;
}

/**
 * Generic xlsx export hook with shared `isExporting` state.
 * Each module wraps this to bind buCode/endpoint/unwrap, then exposes a thin
 * module-specific hook (e.g. `useExportPurchaseRequest`).
 * Returns 0 if no rows; caller decides toast behavior.
 */
export function useXlsxExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToXlsx = async <T,>(args: ExportArgs<T>): Promise<number> => {
    setIsExporting(true);
    try {
      const rows = await args.fetch();
      if (rows.length === 0) return 0;
      await downloadXlsx({
        rows,
        columns: args.columns,
        sheetName: args.sheetName,
        fileName: buildXlsxFileName(args.fileNamePrefix),
      });
      return rows.length;
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToXlsx, isExporting };
}
