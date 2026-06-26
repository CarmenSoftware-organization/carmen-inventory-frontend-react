
import type React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { CarmenLogo } from "@/components/icons/carmen-logo-v1";
import { SideMain } from "./side-main";
import Link from "@/lib/compat/link";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b p-4 group-data-[collapsible=icon]:px-0">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2 group-data-[collapsible=icon]:justify-center"
        >
          <CarmenLogo
            size={32}
            className="shadow-primary/20 hover:shadow-primary/30 shrink-0 rounded-md shadow-md transition-shadow duration-300 hover:shadow-lg"
          />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="from-primary to-primary/70 bg-linear-to-r bg-clip-text text-2xl font-extrabold tracking-widest text-transparent">
              CARMEN
            </span>
            <span className="text-primary/60 text-[0.625rem] font-medium">
              Hospitality Supply Chain
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SideMain />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
