import { Link } from "react-router";
import { ChevronRight, Lock } from "lucide-react";
import { useTranslations } from "use-intl";
import { getModule } from "@/constant/module-list";
import { useVisibleModules } from "@/hooks/use-visible-modules";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { cn } from "@/lib/utils";

interface ModuleLandingProps {
  modulePath: string;
  description: string;
}

/**
 * สีเดียวของทั้งแอป — จุด ไอคอน และพื้นอ่อนของทุกโมดูลใช้ตัวนี้
 *
 * Single-accent design (docs/DESIGN.md): ไม่มีสีประจำโมดูลรายตัวแล้ว เดิมมีตาราง
 * route→สี กับฟังก์ชันอ่านค่าครอบไว้อีกชั้น ทั้งที่ฟังก์ชันคืนค่านี้ตายตัวโดยไม่
 * สนใจ path ที่ส่งเข้าไป — ลบทิ้งทั้งชุดแล้ว
 */
const ACCENT = "var(--primary)";

export function ModuleLanding({ modulePath, description }: ModuleLandingProps) {
  const t = useTranslations("modules");
  const mod = getModule(modulePath);
  const Icon = mod.icon;
  const visibleSubs = useVisibleModules(mod.subModules);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `color-mix(in oklch, ${ACCENT}, transparent 90%)`,
          }}
        >
          <Icon className="size-5" style={{ color: ACCENT }} />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h1 className="text-foreground text-xl leading-tight font-semibold tracking-tight md:text-[1.5rem]">
            {t(mod.name)}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">
            {t(description)}
          </p>
          <div className="text-muted-foreground/80 text-micro-legal mt-1 flex items-center gap-1 tracking-wide">
            <span
              className="inline-block size-1 rounded-full"
              style={{ backgroundColor: ACCENT }}
            />
            <span>{t("subModuleCount", { count: visibleSubs.length })}</span>
          </div>
        </div>
      </div>

      {/* Sub-module grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleSubs.map((sub) => {
          const cardClass = cn(
            "group border-border bg-card hover:border-primary/40 relative flex items-center gap-3 overflow-hidden rounded-xl border py-2 pr-3 pl-4 text-left transition-colors",
            (sub.denied || sub.locked) && "opacity-50",
          );

          const cardContent = (
            <>
              {/* Left accent bar — subtle by default, full on hover */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-2 left-0 w-0.5 rounded-r-full opacity-60 transition-all group-hover:inset-y-0 group-hover:w-1 group-hover:opacity-100"
                style={{ backgroundColor: ACCENT }}
              />

              {/* Icon pill — muted by default, color on hover */}
              <div
                className="relative flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `color-mix(in oklch, ${ACCENT}, transparent 90%)`,
                }}
              >
                <sub.icon
                  className="size-4 transition-transform"
                  style={{ color: ACCENT }}
                  aria-hidden="true"
                />
              </div>

              {/* Name + optional description */}
              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate text-sm font-semibold tracking-tight">
                  {t(sub.name)}
                </div>
              </div>

              {/* กุญแจบอกว่าล็อกเพราะยังไม่ได้ซื้อ ไม่ใช่เพราะไม่มีสิทธิ์ — แสดง
                  ตลอดเวลา (ไม่รอ hover) ต่างจาก chevron ที่บอกแค่ "ไปต่อได้" */}
              {sub.locked ? (
                <Lock
                  className="text-muted-foreground size-3.5 shrink-0 opacity-70"
                  aria-hidden="true"
                />
              ) : (
                <ChevronRight
                  className="text-primary size-3.5 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden="true"
                />
              )}
            </>
          );

          // locked ชนะ denied เสมอ (บอกเหตุผลที่แก้ได้ด้วยเงินตรงกว่า) — ทั้งคู่
          // render เป็นปุ่ม (ไม่ใช่ anchor → NextTopLoader's anchor click listener
          // ไม่ทริกเกอร์) ต่างกันแค่ reason ที่ dispatch
          if (sub.denied || sub.locked) {
            return (
              <button
                key={sub.path}
                type="button"
                onClick={() =>
                  dispatchPermissionDenied(
                    sub.permission,
                    undefined,
                    sub.locked ? "license" : "permission",
                  )
                }
                aria-disabled
                className={cardClass}
              >
                {cardContent}
              </button>
            );
          }

          return (
            <Link key={sub.path} to={sub.path} className={cardClass}>
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
