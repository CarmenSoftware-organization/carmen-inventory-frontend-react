import type React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SideMain } from "./side-main";
import Link from "@/lib/compat/link";
import { CarmenLogo } from "../icons/carmen-logo";
import brandingUrl from "../icons/carmen-branding.svg";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b p-4 group-data-[collapsible=icon]:px-0">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2 group-data-[collapsible=icon]:justify-center"
        >
          <img
            src={brandingUrl}
            alt="Carmen"
            className="h-11 w-auto group-data-[collapsible=icon]:hidden"
          />
          <span className="hidden group-data-[collapsible=icon]:block">
            <CarmenLogo size={32} />
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SideMain />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
