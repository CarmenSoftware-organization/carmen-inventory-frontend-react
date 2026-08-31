import { Outlet } from "react-router";
import { AnalyticsBridge } from "@/components/analytics-bridge";
import { CommandPalette } from "@/components/command-palette";
import { StatusBar } from "@/components/footer/status-bar";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { LicenseExpiredBanner } from "@/components/license-expired-banner";
import { MissingDepartmentDialog } from "@/components/missing-department-dialog";
import { Navbar } from "@/components/navbar/navbar";
import { RouteGuard } from "@/components/route-guard";
import { SeatQuotaBannerHost } from "@/components/seat-quota-banner";
import { ActivitySheetHost } from "@/components/share/activity-sheet-host";
import { OfflineBanner } from "@/components/share/offline-banner";
import { ProfileGate } from "@/components/share/profile-gate";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarShell } from "@/components/sidebar/sidebar-shell";
import { SidebarInset } from "@/components/ui/sidebar";

export default function RootLayout() {
  return (
    <SidebarShell>
      <AnalyticsBridge />
      <AppSidebar />
      <SidebarInset className="space-main-gradient relative h-dvh overflow-hidden">
        <Navbar />
        <OfflineBanner />
        {/* mount ครั้งเดียวที่นี่เหมือน ActivitySheetHost — อ่าน useLicense() เอง
            ไม่ต้อง render ซ้ำในหน้าไหน */}
        <LicenseExpiredBanner />
        {/* แดงเห็นทุกคน (ไม่ใช่แค่แอดมิน) เพราะคนที่บันทึกไม่ได้ต้องรู้ว่าทำไม — ดู
            SeatQuotaBannerHost ใน components/seat-quota-banner.tsx */}
        <SeatQuotaBannerHost />
        <div
          id="main-content"
          className="m-3 flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4"
        >
          <ProfileGate>
            <RouteGuard>
              <Outlet />
            </RouteGuard>
          </ProfileGate>
        </div>
        <StatusBar />
      </SidebarInset>
      <KeyboardShortcutsDialog />
      <CommandPalette />
      <MissingDepartmentDialog />
      <ActivitySheetHost />
    </SidebarShell>
  );
}
