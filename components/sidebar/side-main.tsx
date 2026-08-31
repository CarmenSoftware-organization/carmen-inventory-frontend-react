import { Fragment } from "react";
import { Link } from "react-router";
import { useLocation } from "react-router";
import { useTranslations } from "use-intl";
import { Lock } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { moduleList } from "@/constant/module-list";
import { useVisibleModules } from "@/hooks/use-visible-modules";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { AppTile } from "@/components/icons/tiles";
import { cn } from "@/lib/utils";

/**
 * สีเดียวของทั้งแอป — จุด ไอคอน และพื้นอ่อนของทุกโมดูลใช้ตัวนี้
 *
 * Single-accent design (docs/DESIGN.md): ไม่มีสีประจำโมดูลรายตัวแล้ว เดิมมีตาราง
 * route→สี กับฟังก์ชันอ่านค่าครอบไว้อีกชั้น ทั้งที่ฟังก์ชันคืนค่านี้ตายตัวโดยไม่
 * สนใจ path ที่ส่งเข้าไป — ลบทิ้งทั้งชุดแล้ว
 */
const ACCENT = "var(--primary)";

export function SideMain() {
  const { pathname, search } = useLocation();
  const t = useTranslations("modules");

  const activeModule = moduleList.find((mod) => pathname.startsWith(mod.path));
  const visibleSubs = useVisibleModules(activeModule?.subModules ?? []);

  if (!activeModule) {
    return null;
  }

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
          backgroundImage: `linear-gradient(135deg, color-mix(in oklch, ${ACCENT} 10%, transparent) 0%, transparent 70%)`,
        }}
      >
        {/* Left accent bar (hidden in collapsed mode) */}
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 w-0.5 rounded-full group-data-[collapsible=icon]:hidden"
          style={{ backgroundColor: ACCENT }}
        />

        {/* Module icon — illustrated AppTile (module signature) */}
        <div className="shrink-0">
          <AppTile name={activeModule.name} size={34} />
        </div>

        {/* Title (hidden when collapsed) */}
        <p
          className="min-w-0 flex-1 truncate text-sm leading-tight font-semibold group-data-[collapsible=icon]:hidden"
          style={{ color: ACCENT }}
        >
          {t(activeModule.name)}
        </p>
      </Link>

      {/* Sub-modules */}
      {visibleSubs.length > 0 && (
        <SidebarGroup className="pt-0 group-data-[collapsible=icon]:px-2">
          <SidebarMenu>
            {visibleSubs.map((sub) => {
              const onPath =
                pathname === sub.path || pathname.startsWith(sub.path + "/");
              // เมนูย่อยที่ path เดียวกันแยกกันด้วย query — ไม่งั้นสว่างพร้อมกันหมด
              // ตัวแม่สว่างเมื่ออยู่หน้านั้นแบบไม่ได้กรองด้วยลูกตัวไหน
              const activeChild = sub.subModules?.find(
                (c) => c.search && onPath && search === c.search,
              );
              const isActive = onPath && !activeChild;
              // ไอคอน + ป้าย เหมือนกันทั้งสองสาขา ต่างแค่ตัวห่อ (Link หรือปุ่มที่กด
              // แล้วบอกว่าไม่มีสิทธิ์) — แยกไว้จะได้ไม่ต้องแก้สองที่ทุกครั้ง
              const content = (
                <>
                  <sub.icon
                    aria-hidden="true"
                    className={cn(
                      "shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs group-data-[collapsible=icon]:hidden",
                      isActive && "text-primary",
                    )}
                  >
                    {t(sub.name)}
                  </span>
                </>
              );
              return (
                <Fragment key={sub.path}>
                  {sub.separatorBefore && (
                    <div
                      role="presentation"
                      className="bg-border mx-2 my-1.5 h-px group-data-[collapsible=icon]:hidden"
                    />
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip={t(sub.name)}
                      isActive={isActive}
                      className={cn(
                        // rounded-md ไม่ใช่ lg — เมนูคือ control ตาม grammar ของ
                        // docs/DESIGN.md (md = control · lg/xl = container)
                        "group/sub relative overflow-hidden rounded-md transition-all",
                        // active = แถบซ้ายนี้ + พื้นกับน้ำหนักจาก
                        // sidebarMenuButtonVariants + ไอคอนและตัวหนังสือเป็น
                        // `text-primary` (ดูที่ `content`) รวมเป็นสีน้ำเงินสามที่บน
                        // ปุ่มเดียว ซึ่งแรงกว่ากติกา single-accent ใน docs/DESIGN.md
                        // เคยลองตัดเหลือแค่แถบแล้ว แต่ทีมเลือกแบบนี้ — ตั้งใจ ไม่ใช่หลุด
                        "before:bg-primary before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:opacity-0 before:transition-opacity before:content-[''] group-data-[collapsible=icon]:before:hidden data-[active=true]:before:opacity-100",
                        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                      )}
                    >
                      {sub.locked || sub.denied ? (
                        <button
                          type="button"
                          onClick={() =>
                            dispatchPermissionDenied(
                              sub.permission,
                              undefined,
                              sub.locked ? "license" : "permission",
                            )
                          }
                          title={t(sub.name)}
                          className="opacity-50"
                        >
                          {/* กุญแจบอกว่าล็อกเพราะยังไม่ได้ซื้อ ไม่ใช่เพราะไม่มีสิทธิ์ —
                              locked ชนะ denied เสมอ (บอกเหตุผลที่แก้ได้ด้วยเงินตรงกว่า) */}
                          {sub.locked ? (
                            <span className="flex items-center gap-2">
                              {content}
                              <Lock
                                className="size-3 shrink-0 opacity-70"
                                aria-hidden
                              />
                            </span>
                          ) : (
                            content
                          )}
                        </button>
                      ) : (
                        <Link to={sub.path}>{content}</Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* เมนูย่อยอีกชั้น — เยื้องเข้าไปและซ่อนตอนย่อ sidebar เป็นไอคอน
                      (ไอคอนเรียงกันสามตัวที่ชี้หน้าเดียวกันแยกไม่ออกอยู่ดี) */}
                  {sub.subModules?.map((child) => {
                    const childActive = onPath && search === child.search;
                    return (
                      <SidebarMenuItem
                        key={`${child.path}${child.search ?? ""}`}
                        className="group-data-[collapsible=icon]:hidden"
                      >
                        <SidebarMenuButton
                          asChild
                          size="sm"
                          isActive={childActive}
                          className="ms-4 w-auto rounded-md"
                        >
                          <Link to={`${child.path}${child.search ?? ""}`}>
                            <child.icon
                              aria-hidden="true"
                              className={cn(
                                "shrink-0",
                                childActive
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                            />
                            <span
                              className={cn(
                                "text-xs",
                                childActive && "text-primary",
                              )}
                            >
                              {t(child.name)}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </Fragment>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      )}
    </>
  );
}
