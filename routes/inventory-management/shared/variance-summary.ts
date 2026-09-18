/**
 * สรุปผลการนับของหน้า review — ใช้ร่วมกันระหว่างนับสต๊อก (physical count)
 * กับตรวจนับสุ่ม (spot check) ซึ่งเดิมนับเองคนละที่ด้วยลูปที่เกือบเหมือนกัน
 *
 * นิยามที่ทั้งสองหน้าต้องตรงกัน:
 * - **ตรง** (`matches`) = นับแล้วได้เท่าระบบ (ผลต่าง 0)
 * - **ไม่ตรง** (`variances`) = นับแล้วไม่เท่าระบบ แยกเป็นเกิน/ขาด
 * - **เกิน** (`overages`) = ผลต่างเป็นบวก · **ขาด** (`shortages`) = ผลต่างเป็นลบ
 */
export interface VarianceSummary<T> {
  matches: number;
  variances: number;
  overages: number;
  shortages: number;
  varianceItems: T[];
}

interface VarianceOptions<T> {
  getDiff: (row: T) => number;
  isCounted?: (row: T) => boolean;
}

export function summarizeVariance<T>(
  rows: readonly T[] | undefined,
  { getDiff, isCounted }: VarianceOptions<T>,
): VarianceSummary<T> {
  let matches = 0;
  let overages = 0;
  let shortages = 0;
  const varianceItems: T[] = [];

  for (const row of rows ?? []) {
    if (isCounted && !isCounted(row)) continue;
    const diff = getDiff(row);
    if (diff === 0) {
      matches += 1;
      continue;
    }
    varianceItems.push(row);
    if (diff > 0) overages += 1;
    else shortages += 1;
  }

  return {
    matches,
    variances: varianceItems.length,
    overages,
    shortages,
    varianceItems,
  };
}
