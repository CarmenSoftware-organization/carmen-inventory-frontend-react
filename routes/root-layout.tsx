import { Outlet } from "react-router";
import { StatusBar } from "@/components/footer/status-bar";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { MissingDepartmentDialog } from "@/components/missing-department-dialog";
import { Navbar } from "@/components/navbar/navbar";
import { RouteGuard } from "@/components/route-guard";
import { OfflineBanner } from "@/components/share/offline-banner";
import { ProfileGate } from "@/components/share/profile-gate";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarShell } from "@/components/sidebar/sidebar-shell";
import { SidebarInset } from "@/components/ui/sidebar";

export default function RootLayout() {
  return (
    <SidebarShell>
      <AppSidebar />
      <SidebarInset className="space-main-gradient relative h-dvh overflow-hidden">
        <Navbar />
        <OfflineBanner />
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
      <MissingDepartmentDialog />
    </SidebarShell>
  );
}
