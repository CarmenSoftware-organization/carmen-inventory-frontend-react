
import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

const TABLET_MIN = 768;
const TABLET_MAX = 1024;

/**
 * Wrapper ของ SidebarProvider ที่จัดการสถานะเปิด/ปิดอัตโนมัติตาม viewport
 *
 * ใช้ matchMedia ฟัง breakpoint 768-1023px (tablet) เพื่อ auto-collapse sidebar
 * พร้อมเก็บค่าที่ผู้ใช้เลือกเอง (userOpen) แยกจาก state ที่บังคับปิดโดย viewport
 * เพื่อให้เมื่อกลับมาเป็น desktop จะคืนสถานะเดิมของผู้ใช้ SSR-safe โดย default
 * เป็น open=true ก่อน mount แล้วปรับหลังจาก useEffect
 *
 * @param props - children ที่จะ render ภายใต้ SidebarProvider
 * @returns JSX element ของ SidebarProvider ที่ครอบ children
 * @example
 * ```tsx
 * // app/(root)/layout.tsx
 * <SidebarShell>
 *   <AppSidebar />
 *   <SidebarInset>{children}</SidebarInset>
 * </SidebarShell>
 * ```
 */
export function SidebarShell({ children }: { children: React.ReactNode }) {
  // Default open on first render (SSR-safe). Tablet detection runs after mount.
  const [open, setOpen] = useState(true);
  const [userOpen, setUserOpen] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${TABLET_MIN}px) and (max-width: ${TABLET_MAX - 1}px)`,
    );
    const apply = () => {
      if (mql.matches) {
        setOpen(false);
      } else {
        setOpen(userOpen);
      }
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [userOpen]);

  return (
    <SidebarProvider
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setUserOpen(next);
      }}
    >
      {children}
    </SidebarProvider>
  );
}
