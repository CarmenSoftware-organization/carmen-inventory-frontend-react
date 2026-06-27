import type { Stage, SlaUnit } from "@/types/workflows";

const UNIT_TO_MINUTES: Record<SlaUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 60 * 24,
};

/**
 * รวม SLA ของทุก stage (ยกเว้น stage สุดท้ายที่เป็น Completed) เป็นนาที
 * @param stages - array ของ Stage
 * @returns จำนวนนาทีรวม
 */
export function totalSlaMinutes(stages: Stage[]): number {
  if (!stages || stages.length === 0) return 0;
  const middle = stages.slice(0, -1);
  return middle.reduce((sum, stage) => {
    const value = Number(stage.sla);
    if (!Number.isFinite(value) || value <= 0) return sum;
    const unit = (stage.sla_unit as SlaUnit) ?? "hours";
    return sum + value * (UNIT_TO_MINUTES[unit] ?? 60);
  }, 0);
}

/**
 * แปลงจำนวนนาทีเป็นข้อความสรุป cycle time แบบกระชับ เช่น "3d 8h" หรือ "45m"
 * @param minutes - จำนวนนาทีรวม
 * @returns ข้อความสรุป (สูงสุด 2 หน่วย) หรือ empty string ถ้า <= 0
 */
export function formatCycleTime(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0 && mins > 0) parts.push(`${mins}m`);
  return parts.slice(0, 2).join(" ") || "0m";
}
