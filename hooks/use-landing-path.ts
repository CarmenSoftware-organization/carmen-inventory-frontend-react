import {
  useVisibleModules,
  type ModuleWithAccess,
} from "@/hooks/use-visible-modules";

/**
 * ปลายทางสุดท้ายเมื่อไม่มี leaf ไหนเข้าได้เลย
 *
 * `/profile` **ไม่อยู่ใน `moduleList`** จึงเป็นหน้าเดียวที่การันตีว่าเข้าได้เสมอ —
 * `findRouteLeaf()` คืน `undefined` ให้ path นี้ `RouteGuard` เลยไม่มีอะไรให้บล็อก
 * ทั้งฝั่ง license และ permission (ดู `components/route-guard.tsx`)
 *
 * ถ้าวันหนึ่งมีคนย้าย `/profile` เข้า `moduleList` การันตีข้อนี้จะหายไปเงียบ ๆ
 * — เทสต์ใน `use-landing-path.test.ts` ตรึงไว้แล้ว
 */
export const LANDING_FALLBACK_PATH = "/profile";

/**
 * leaf ตัวแรกที่เข้าได้จริง ตามลำดับที่ sidebar แสดง (depth-first)
 *
 * คืน `undefined` เมื่อไม่เจอ — แยกจาก `firstAccessiblePath` เพื่อให้การ recurse
 * ลง subModules ไม่เผลอคืนค่า fallback ออกมาจากกลางต้นไม้
 */
function findFirst(modules: ModuleWithAccess[]): string | undefined {
  for (const mod of modules) {
    if (mod.subModules && mod.subModules.length > 0) {
      const hit = findFirst(mod.subModules);
      if (hit) return hit;
      // parent เป็นแค่หัวข้อกลุ่ม ไม่ใช่ปลายทาง — ลูกเข้าไม่ได้สักตัวก็ข้ามทั้งกลุ่ม
      continue;
    }
    if (!mod.locked && !mod.denied) return mod.path;
  }
  return undefined;
}

/**
 * path ที่ผู้ใช้คนนี้เปิดได้แน่ ๆ — ใช้เป็นหน้าแรกหลังล็อกอิน และเป็นทางออกของ
 * `AccessDeniedBlock`
 *
 * **ทำไมต้องคำนวณ ไม่ hardcode `/dashboard`:** `/dashboard` มี
 * `licenseFeature: "dashboard.widget"` จึงถูกล็อกได้จริงเมื่อ BU ไม่ได้ซื้อ →
 * ผู้ใช้จะเจอ `AccessDeniedBlock` ทันทีที่ล็อกอินเสร็จ โดยไม่มี history ให้ถอยกลับ
 *
 * กรอง **ทั้ง `locked` และ `denied`** — เอาแค่ `locked` จะย้ายจากกับดัก license
 * ไปกับดัก permission ซึ่งเป็นกล่องเดียวกันคนละสี
 *
 * เป็น pure function เพื่อ unit test ตรง ๆ ตามแบบ `annotate`/`markAll`
 * ใน `use-visible-modules.ts`
 */
export function firstAccessiblePath(modules: ModuleWithAccess[]): string {
  return findFirst(modules) ?? LANDING_FALLBACK_PATH;
}

/**
 * เวอร์ชัน hook ของ `firstAccessiblePath` — อ่านสิทธิ์และสัญญาของผู้ใช้ปัจจุบัน
 *
 * ต้องเรียกใต้ `ProfileGate` เท่านั้น (profile/license โหลดเสร็จแล้ว) ซึ่งจริงทั้ง
 * index route และ `RouteGuard` เพราะทั้งคู่ render เป็นลูกของ `ProfileGate`
 * ใน `routes/root-layout.tsx`
 *
 * **ขณะสวิตช์ `LICENSE_ENFORCEMENT` ยังปิด ค่าที่ได้คือ `/dashboard` เท่าเดิม** —
 * `isLicensed()` คืน true ทั้งใน shadow mode และเมื่อ state เป็น `"unresolved"`
 * ทุก leaf จึงไม่ locked และ dashboard เป็นตัวแรกใน `moduleList`
 */
export function useLandingPath(): string {
  return firstAccessiblePath(useVisibleModules());
}
