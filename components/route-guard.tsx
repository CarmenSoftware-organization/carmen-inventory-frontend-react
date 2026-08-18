import { useLocation, useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { ArrowLeft, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EyeBrow } from "@/components/ui/eye-brow";
import { findRouteLeaf } from "@/constant/module-list";
import { useCan } from "@/hooks/use-can";
import { licenseFeatureOf, useLicense } from "@/hooks/use-license";
import type { DeniedReason } from "@/components/permission-denied-dialog";

interface RouteGuardProps {
  readonly children: React.ReactNode;
}

/**
 * บล็อก direct URL ของหน้าที่ผู้ใช้ไม่มีสิทธิ์ หรือ BU ไม่ได้ซื้อ feature นี้
 *
 * - หา leaf ใน moduleList ที่ตรงกับ pathname (รวม nested เช่น /[id])
 * - เช็ค **license ก่อน permission เสมอ** — ถ้า feature ไม่อยู่ในสัญญาของ BU
 *   การมีสิทธิ์ RBAC ก็ไม่ช่วยอะไร และต่างจาก permission ตรงที่ **ไม่มี admin
 *   bypass** เลย (admin ของ BU ที่ไม่ได้ซื้อโมดูลก็ยังเข้าไม่ได้ — ดู
 *   hooks/use-license.ts และ phase-c-backend-contract.md ข้อ 7.1)
 * - `useLicense().isLicensed()` จัดการสวิตช์ `LICENSE_ENFORCEMENT` (shadow mode)
 *   กับ state `"unresolved"` ให้แล้วภายใน — ทั้งสองกรณีไม่ล็อกหน้า ไม่ต้องเช็คซ้ำที่นี่
 * - สัญญาหมดอายุ/ถูกระงับ (`expired`/`inactive`) **ไม่บล็อกที่นี่** — ยังอ่านได้
 *   ตามสเปก §3.2 การบล็อกอยู่ที่ปุ่มเขียนกับที่ backend เท่านั้น
 * - ถ้า license ผ่านแต่ไม่มี permission (และไม่ใช่ admin) → แสดง AccessDeniedBlock
 * - Admin (เมื่อ license ผ่าน) หรือ leaf ที่ไม่ระบุ permission → render ปกติ
 *
 * วางใน `(root)/layout.tsx` ภายใต้ `ProfileGate` (รอ profile โหลดเสร็จก่อน)
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = useLocation().pathname;
  const { can, isAdmin } = useCan();
  const { isLicensed } = useLicense();
  const t = useTranslations("permissionDenied");

  const leaf = findRouteLeaf(pathname);

  const feature = leaf ? licenseFeatureOf(leaf) : undefined;
  const locked = !!feature && !isLicensed(feature);
  if (locked) {
    return (
      <AccessDeniedBlock
        reason="license"
        description={t("licenseDescription")}
      />
    );
  }

  const denied = !!leaf?.permission && !isAdmin && !can(leaf.permission);
  if (denied) return <AccessDeniedBlock />;

  return <>{children}</>;
}

interface AccessDeniedBlockProps {
  /** แทนคำอธิบาย default ("หน้านี้เข้าไม่ได้") เมื่อเหตุผลเจาะจงกว่านั้น */
  readonly description?: string;
  /**
   * ทำไมถึงเข้าไม่ได้ — ใช้เลือกว่าจะแสดงบรรทัด "ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์"
   * ต่อท้ายไหม default `"permission"` (พฤติกรรมเดิมเมื่อไม่ส่งมา)
   */
  readonly reason?: DeniedReason;
}

/**
 * บล็อกเต็มหน้าเมื่อผู้ใช้เข้าถึงสิ่งที่ไม่มีสิทธิ์
 *
 * สัญญาณสีแดงมีจุดเดียวคือไอคอน กล่องรอบ ๆ เป็น neutral ตาม docs/DESIGN.md
 * ใช้ทั้งจาก `RouteGuard` (สิทธิ์ระดับหน้า) และจากหน้าที่ gate ตัวเองด้วยเงื่อนไข
 * ที่ moduleList ไม่รู้ เช่น หน้าสร้าง PR ที่ไม่มี workflow ให้เริ่มเลยสักตัว
 */
export function AccessDeniedBlock({
  description,
  reason = "permission",
}: AccessDeniedBlockProps) {
  const t = useTranslations("permissionDenied");
  const navigate = useNavigate();

  return (
    <div
      role="alert"
      className="flex flex-1 items-center justify-center px-6 py-16"
    >
      <div className="bg-card flex w-full max-w-sm flex-col items-center rounded-xl border p-6 text-center">
        <div className="bg-muted text-destructive mb-4 flex size-12 items-center justify-center rounded-xl">
          <ShieldOff className="size-5" aria-hidden />
        </div>

        <EyeBrow>{t("eyebrow")}</EyeBrow>

        <h2 className="text-foreground mt-3 text-base font-semibold tracking-tight">
          {t("title")}
        </h2>
        {/* คำอธิบายกับ "ติดต่อผู้ดูแล" เป็นเรื่องเดียวกัน — ชิดกัน (mt-1) ให้อ่านเป็น
            ก้อนเดียว ไม่ต้องมีเส้นคั่นมาแบ่งของที่ไม่ได้แยกกันจริง */}
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          {description ?? t("pageDescription")}
        </p>
        {/* "ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์" ใช้ได้เฉพาะเรื่องสิทธิ์ — เหตุผล license/
            expired มีทางแก้คนละทาง (ต่อสัญญา/ติดต่อฝ่ายขาย) และคำอธิบายด้านบนบอก
            ไปแล้ว การแปะบรรทัดนี้ต่อท้ายจึงขัดกันเอง */}
        {reason === "permission" && (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {t("contactAdmin")}
          </p>
        )}

        <Button
          type="button"
          size="sm"
          onClick={() => navigate(-1)}
          className="mt-5"
        >
          <ArrowLeft />
          {t("goBack")}
        </Button>
      </div>
    </div>
  );
}
