import { Fragment } from "react";
import { Link } from "react-router";
import { useLocation } from "react-router";
import { useTranslations } from "use-intl";
import { Sparkles } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { moduleList } from "@/constant/module-list";
import { getModuleColor } from "@/constant/module-color-map";
import { useVisibleModules } from "@/hooks/use-visible-modules";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { AppTile } from "@/components/icons/tiles";
import { cn } from "@/lib/utils";

export function SideMain() {
  const pathname = useLocation().pathname;
  const t = useTranslations("modules");

  const activeModule = moduleList.find((mod) => pathname.startsWith(mod.path));
  const visibleSubs = useVisibleModules(activeModule?.subModules ?? []);

  if (!activeModule) {
    return null;
  }

  const moduleColor = getModuleColor(activeModule.path);

  return (
    <>
      {/* Module header — links to the module landing */}
      <Link
        to={activeModule.path}
        aria-label={t(activeModule.name)}
        className={cn(
          "relative mx-2 mt-2 mb-1 flex cursor-pointer items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5",
          "focus-visible:ring-primary/40 transition-colors outline-none focus-visible:ring-2",
          "group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0",
        )}
        style={{
          backgroundImage: `linear-gradient(135deg, color-mix(in oklch, ${moduleColor} 10%, transparent) 0%, transparent 70%)`,
        }}
      >
        {/* Left accent bar (hidden in collapsed mode) */}
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 w-0.5 rounded-full group-data-[collapsible=icon]:hidden"
          style={{ backgroundColor: moduleColor }}
        />

        {/* Module icon — illustrated AppTile (module signature) */}
        <div className="shrink-0">
          <AppTile name={activeModule.name} size={34} />
        </div>

        {/* Title (hidden when collapsed) */}
        <p
          className="min-w-0 flex-1 truncate text-sm leading-tight font-semibold group-data-[collapsible=icon]:hidden"
          style={{ color: moduleColor }}
        >
          {t(activeModule.name)}
        </p>
      </Link>

      {/* Sub-modules */}
      {visibleSubs.length > 0 && (
        <SidebarGroup className="pt-0 group-data-[collapsible=icon]:px-2">
          <SidebarMenu>
            {visibleSubs.map((sub) => {
              const isActive =
                pathname === sub.path || pathname.startsWith(sub.path + "/");
              return (
                <Fragment key={sub.path}>
                  {sub.separatorBefore && (
                    <div className="my-1.5 flex items-center gap-2 px-2 group-data-[collapsible=icon]:hidden">
                      <span className="bg-border h-px flex-1" />
                      <Sparkles className="text-muted-foreground/60 size-2.5" />
                      <span className="bg-border h-px flex-1" />
                    </div>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip={t(sub.name)}
                      isActive={isActive}
                      className={cn(
                        "group/sub relative overflow-hidden rounded-lg transition-all",
                        "data-[active=true]:font-semibold",
                        // active = blue left-bar signal (icon keeps its module color)
                        "before:bg-primary before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:opacity-0 before:transition-opacity before:content-[''] group-data-[collapsible=icon]:before:hidden data-[active=true]:before:opacity-100",
                        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                      )}
                    >
                      {sub.denied ? (
                        <button
                          type="button"
                          onClick={() =>
                            dispatchPermissionDenied(sub.permission)
                          }
                          title={t(sub.name)}
                          className="opacity-50"
                        >
                          <sub.icon
                            aria-hidden="true"
                            className={cn(
                              "size-5 shrink-0",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                          <span
                            className={cn(
                              "text-xs font-semibold group-data-[collapsible=icon]:hidden",
                              isActive && "text-primary",
                            )}
                          >
                            {t(sub.name)}
                          </span>
                        </button>
                      ) : (
                        <Link to={sub.path}>
                          <sub.icon
                            aria-hidden="true"
                            className={cn(
                              "size-5 shrink-0",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                          <span
                            className={cn(
                              "text-xs font-semibold group-data-[collapsible=icon]:hidden",
                              isActive && "text-primary",
                            )}
                          >
                            {t(sub.name)}
                          </span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Fragment>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      )}
    </>
  );
}
