
import { Fragment } from "react";
import { Link } from "react-router";
import { usePathname } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { moduleList } from "@/constant/module-list";

/**
 * ตรวจสอบว่า segment ของ URL เป็น id หรือไม่
 *
 * ใช้ regex ตรวจ 3 รูปแบบ: numeric id (เฉพาะตัวเลข), UUID มาตรฐาน 8-4-4-4-12
 * และ MongoDB ObjectId (24 hex chars) ใช้โดย `PathBreadcrumb` เพื่อกรอง
 * segment ที่เป็น id ออกจาก breadcrumb
 *
 * @param segment - segment ของ path ที่ต้องการตรวจสอบ
 * @returns true ถ้า segment match รูปแบบ id รูปแบบใดรูปแบบหนึ่ง
 * @example
 * ```ts
 * isIdSegment("123"); // true
 * isIdSegment("new"); // false
 * ```
 */
function isIdSegment(segment: string) {
  // numeric id
  if (/^\d+$/.test(segment)) return true;
  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  // MongoDB ObjectId (24 hex chars)
  if (/^[0-9a-f]{24}$/i.test(segment)) return true;
  return false;
}

/** Map URL path segment → modules translation key */
const SEGMENT_TO_KEY: Record<string, string> = {};
for (const mod of moduleList) {
  const segment = mod.path.split("/").pop()!;
  SEGMENT_TO_KEY[segment] = mod.name;
  if (mod.subModules) {
    for (const sub of mod.subModules) {
      const subSegment = sub.path.split("/").pop()!;
      SEGMENT_TO_KEY[subSegment] = sub.name;
    }
  }
}

/**
 * Breadcrumb ของหน้าปัจจุบัน
 *
 * สร้าง breadcrumb จาก `usePathname()` โดยกรอง id segment ออกผ่าน
 * `isIdSegment` และแปลงแต่ละ segment เป็นคำแปลจาก `moduleList`
 * (fallback เป็น segment ที่แปลง kebab-case → Title Case) รายการสุดท้าย
 * render เป็น `BreadcrumbPage` และรายการอื่นซ่อนบน mobile (แสดงเฉพาะ md ขึ้นไป)
 *
 * @returns JSX element ของ breadcrumb
 * @example
 * ```tsx
 * <PathBreadcrumb />
 * ```
 */
export default function PathBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("modules");
  const segments = pathname.split("/").filter((s) => Boolean(s) && !isIdSegment(s));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");

          const key = SEGMENT_TO_KEY[segment];
          const label = key
            ? t(key)
            : segment
                .replaceAll("-", " ")
                .replaceAll(/\b\w/g, (c) => c.toUpperCase());

          const isLast = index === segments.length - 1;

          return (
            <Fragment key={href}>
              {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem className={isLast ? "" : "hidden md:block"}>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
