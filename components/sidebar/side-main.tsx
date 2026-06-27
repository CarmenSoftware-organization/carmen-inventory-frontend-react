
import { Fragment } from "react";
import { Link } from "react-router";
import { usePathname } from "@/lib/compat/navigation";
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
import { AppTile, SubTile } from "@/components/icons/tiles";
import { cn } from "@/lib/utils";

/**
 * เมนูหลักใน Sidebar — premium ERP design
 *
 * Render Module Header card (gradient icon tile + pill + colored title) ตาม
 * โมดูลปัจจุบันจาก pathname · sub-modules เป็น pill-style button พร้อม left
 * accent bar + colored icon เมื่อ active · รองรับ collapsed icon mode
 * (ซ่อนข้อความ เหลือเฉพาะไอคอน) และ separator ระหว่างกลุ่ม sub-modules
 *
 * @returns JSX element ของเมนู sub-modules หรือ null หาก pathname ไม่ตรงกับโมดูลใด
 */
export function SideMain() {
  const pathname = usePathname();
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

        {/* Module tile — illustrated AppTile (squircle + glyph) */}
        <div className="shrink-0">
          <AppTile name={activeModule.name} size={28} />
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
                        "before:bg-primary before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:opacity-0 before:transition-opacity before:content-[''] data-[active=true]:before:opacity-100 group-data-[collapsible=icon]:before:hidden",
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
                          <span className="shrink-0">
                            <SubTile
                              name={sub.name}
                              parentName={activeModule.name}
                              size={20}
                            />
                          </span>
                          <span className="text-xs font-semibold group-data-[collapsible=icon]:hidden">
                            {t(sub.name)}
                          </span>
                        </button>
                      ) : (
                        <Link to={sub.path}>
                          <span className="shrink-0">
                            <SubTile
                              name={sub.name}
                              parentName={activeModule.name}
                              size={20}
                            />
                          </span>
                          <span className="text-xs font-semibold group-data-[collapsible=icon]:hidden">
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
