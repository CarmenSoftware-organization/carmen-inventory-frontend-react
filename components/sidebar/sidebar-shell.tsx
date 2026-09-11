import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

const TABLET_MIN = 768;
const TABLET_MAX = 1024;

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
      // แคบกว่า default ของ shadcn (16rem) — เมนูยาวสุดในแอปยังพอดีแถว และ
      // คืนที่ให้เนื้อหาซึ่งเป็นตารางกว้าง ๆ แทบทุกหน้า · ทับที่นี่จุดเดียว
      // ไม่ไปแก้ค่าใน components/ui
      style={{ "--sidebar-width": "14rem" } as React.CSSProperties}
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
