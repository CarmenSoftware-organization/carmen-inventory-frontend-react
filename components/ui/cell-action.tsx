import { cn } from "@/lib/utils";

interface CellActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: React.ReactNode;
}

/**
 * ปุ่มลิงก์แบบข้อความสำหรับเซลล์ในตาราง DataGrid
 *
 * render เป็น <button type="button"> สีน้ำเงิน underline เมื่อ hover
 * ใช้เป็นตัวเปิด edit dialog/page จากคอลัมน์ code/name ใน list page
 * รองรับ focus ring และ props ของ button element ทั้งหมด
 *
 * @param props - รับ children, className และ props ของ HTMLButtonElement
 * @returns JSX element ของปุ่ม
 * @example
 * ```tsx
 * <CellAction onClick={() => onEdit(row.original)}>
 *   {row.getValue("name")}
 * </CellAction>
 * ```
 */
export function CellAction({ className, children, ...props }: CellActionProps) {
  return (
    <button
      type="button"
      className={cn(
        "focus-visible:ring-ring/50 text-primary cursor-pointer text-left font-semibold tracking-wide hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
