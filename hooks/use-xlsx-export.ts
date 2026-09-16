import { useState } from "react";
import {
  buildXlsxFileName,
  downloadXlsx,
  type XlsxColumn,
} from "@/lib/xlsx-utils";

export type { XlsxColumn };

interface ExportArgs<T> {
  fetch: () => Promise<T[]>;
  columns: XlsxColumn<T>[];
  sheetName: string;
  fileNamePrefix: string;
}

export function useXlsxExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToXlsx = async <T>(args: ExportArgs<T>): Promise<number> => {
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
