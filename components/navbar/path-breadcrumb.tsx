import { Fragment } from "react";
import { Link } from "react-router";
import { useLocation } from "react-router";
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
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment,
    )
  )
    return true;
  // MongoDB ObjectId (24 hex chars)
  if (/^[0-9a-f]{24}$/i.test(segment)) return true;
  return false;
}

/** Map URL path segment → modules translation key */
const SEGMENT_TO_KEY: Record<string, string> = {};
function addModuleSegments(modules: typeof moduleList) {
  for (const mod of modules) {
    const segment = mod.path.split("/").pop()!;
    SEGMENT_TO_KEY[segment] = mod.name;
    if (mod.subModules) {
      addModuleSegments(mod.subModules);
    }
  }
}
addModuleSegments(moduleList);

/**
 * segment ที่ไม่ใช่โมดูลแต่โผล่ใน URL จริง
 *
 * ไม่มีใน `moduleList` เลยตกไป fallback ที่แปลง kebab-case เป็น Title Case ซึ่ง
 * เป็นภาษาอังกฤษเสมอ — ภาษาไทยเลยได้ "ใบขอซื้อ > New" ปนกันครึ่งบรรทัด
 */
const EXTRA_SEGMENT_KEY: Record<string, string> = {
  new: "new",
  entry: "entry",
  review: "review",
  setting: "setting",
  notifications: "notifications",
  "from-price-list": "fromPriceList",
};

/**
 * Breadcrumb ของหน้าปัจจุบัน
 *
 * สร้าง breadcrumb จาก `useLocation().pathname` โดยกรอง id segment ออกผ่าน
 * `isIdSegment` และแปลงแต่ละ segment เป็นคำแปลจาก `moduleList` +
 * `EXTRA_SEGMENT_KEY` (fallback เป็น segment ที่แปลง kebab-case → Title Case)
 *
 * ชั้นที่เป็นหน้าปัจจุบันเท่านั้นที่กดไม่ได้ — เปิดใบใดใบหนึ่งอยู่ (URL ลงท้าย
 * ด้วย id) ทุกชั้นเป็นลิงก์หมด เพราะไม่มีชั้นไหนแทนหน้าที่ยืนอยู่จริง จอแคบ
 * แสดงสองชั้นท้าย เพื่อให้ยังมีทางกดกลับหน้ารายการ
 *
 * @returns JSX element ของ breadcrumb
 * @example
 * ```tsx
 * <PathBreadcrumb />
 * ```
 */
export default function PathBreadcrumb() {
  const pathname = useLocation().pathname;
  const t = useTranslations("modules");

  const rawSegments = pathname.split("/").filter(Boolean);
  // href ประกอบจาก segment ดิบ ไม่ใช่ segment ที่กรอง id ออกแล้ว — ไม่งั้นชั้นที่
  // อยู่หลัง id (เช่น .../physical-count/<id>/entry) จะได้ลิงก์ที่ไม่มีอยู่จริง
  const crumbs = rawSegments
    .map((segment, index) => ({
      segment,
      href: "/" + rawSegments.slice(0, index + 1).join("/"),
    }))
    .filter(({ segment }) => !isIdSegment(segment));

  // กำลังเปิดใบใดใบหนึ่งอยู่ = segment ท้าย URL เป็น id ซึ่งโดนกรองทิ้งไปแล้ว
  // ชั้นสุดท้ายที่เหลือจึงไม่ใช่หน้าที่ยืนอยู่ ต้องกดกลับไปหน้ารายการได้
  const onDetailPage =
    rawSegments.length > 0 && isIdSegment(rawSegments[rawSegments.length - 1]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map(({ segment, href }, index) => {
          const key = SEGMENT_TO_KEY[segment] ?? EXTRA_SEGMENT_KEY[segment];
          const label = key
            ? t(key)
            : segment
                .replaceAll("-", " ")
                .replaceAll(/\b\w/g, (c) => c.toUpperCase());

          const isCurrentPage = index === crumbs.length - 1 && !onDetailPage;
          // จอแคบเก็บสองชั้นท้ายไว้ — ชั้นก่อนสุดท้ายคือทางกลับหน้ารายการ
          // ถ้าซ่อนหมดเหลือคำเดียวก็กดอะไรไม่ได้เลยบนมือถือ
          const hiddenOnMobile = index < crumbs.length - 2;

          return (
            <Fragment key={href}>
              {index > 0 && (
                <BreadcrumbSeparator
                  className={index < crumbs.length - 1 ? "hidden md:block" : ""}
                />
              )}
              <BreadcrumbItem
                className={hiddenOnMobile ? "hidden md:block" : ""}
              >
                {isCurrentPage ? (
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
