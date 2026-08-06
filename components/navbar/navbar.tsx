import { SidebarTrigger } from "@/components/ui/sidebar";
import { useProfile } from "@/hooks/use-profile";
import { UserProfile } from "./user-profile";
import PathBreadcrumb from "./path-breadcrumb";
import BuSwitcher from "./bu-switcher";
import ModuleApp from "./module-app";
import Notification from "./notification";

export function Navbar() {
  // โหลดโปรไฟล์ไม่ผ่าน (500/503) — ทุกอย่างบนแถบนี้อ่านค่าจากโปรไฟล์: สลับกิจการ
  // ต้องมีรายการ BU, ตัวเปิดโมดูลต้องรู้สิทธิ์, แจ้งเตือนต้องมี userId, เบรดครัมบ์
  // ชี้ไปหน้าที่เข้าไม่ได้อยู่ดี ปล่อยไว้ก็เป็นปุ่มที่กดแล้วว่างเปล่า · ซ่อนหมด
  // เหลือเมนูโปรไฟล์ที่เดียว เพราะเป็นทางเดียวที่จะออกจากระบบไปล้าง session ได้
  const { isError } = useProfile();

  return (
    <header
      data-slot="navbar"
      className="bg-background space-navbar-gradient sticky top-0 z-50 flex h-16 shrink-0 items-center gap-1.5 border-b pt-[env(safe-area-inset-top)] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:h-14"
    >
      <div className="flex w-full items-center gap-1.5 px-2">
        <SidebarTrigger />
        <div className="min-w-0 flex-1 truncate">
          {!isError && <PathBreadcrumb />}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {!isError && (
            <>
              <div className="flex items-center gap-1">
                <BuSwitcher />
                <ModuleApp />
              </div>

              <Notification />
            </>
          )}
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
