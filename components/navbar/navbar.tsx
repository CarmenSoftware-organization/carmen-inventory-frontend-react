
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserProfile } from "./user-profile";
import PathBreadcrumb from "./path-breadcrumb";
import BuSwitcher from "./bu-switcher";
import ModuleApp from "./module-app";
import Notification from "./notification";

export function Navbar() {
  return (
    <header
      data-slot="navbar"
      className="bg-background space-navbar-gradient sticky top-0 z-50 flex h-16 shrink-0 items-center gap-1.5 border-b pt-[env(safe-area-inset-top)] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:h-14"
    >
      <div className="flex w-full items-center gap-1.5 px-2">
        <SidebarTrigger />
        <div className="min-w-0 flex-1 truncate">
          <PathBreadcrumb />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="flex items-center gap-1">
            <BuSwitcher />
            <ModuleApp />
          </div>

          <Notification />
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
