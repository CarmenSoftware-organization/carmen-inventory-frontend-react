import RunningCodeComponent from "./_components/running-code-component";

/**
 * หน้ารายการ Running Code ในโมดูล System Admin
 * @returns React element ของหน้า Running Code
 * @example
 * // ใช้เป็น Next.js route: /system-admin/running-code
 * <RunningCodePage />
 */
export default function RunningCodePage() {
  return <RunningCodeComponent />;
}

export const Component = RunningCodePage;
