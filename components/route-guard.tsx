import { useLocation, useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { ArrowLeft, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { findRouteLeaf } from "@/constant/module-list";
import { useCan } from "@/hooks/use-can";

interface RouteGuardProps {
  readonly children: React.ReactNode;
}

/**
 * บล็อก direct URL ของหน้าที่ผู้ใช้ไม่มีสิทธิ์
 *
 * - หา leaf ใน moduleList ที่ตรงกับ pathname (รวม nested เช่น /[id])
 * - ถ้า leaf มี `permission` แต่ผู้ใช้ไม่มี → แสดง AccessDeniedBlock แทน children
 * - Admin หรือ leaf ที่ไม่ระบุ permission → render ปกติ
 *
 * วางใน `(root)/layout.tsx` ภายใต้ `ProfileGate` (รอ profile โหลดเสร็จก่อน)
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = useLocation().pathname;
  const { can, isAdmin } = useCan();

  const leaf = findRouteLeaf(pathname);
  const denied = !!leaf?.permission && !isAdmin && !can(leaf.permission);

  if (!denied) return <>{children}</>;
  return <AccessDeniedBlock />;
}

interface AccessDeniedBlockProps {
  /** แทนคำอธิบาย default ("หน้านี้เข้าไม่ได้") เมื่อเหตุผลเจาะจงกว่านั้น */
  readonly description?: string;
}

/**
 * บล็อกเต็มหน้าเมื่อผู้ใช้เข้าถึงสิ่งที่ไม่มีสิทธิ์
 *
 * สัญญาณสีแดงมีจุดเดียวคือไอคอน กล่องรอบ ๆ เป็น neutral ตาม docs/DESIGN.md
 * ใช้ทั้งจาก `RouteGuard` (สิทธิ์ระดับหน้า) และจากหน้าที่ gate ตัวเองด้วยเงื่อนไข
 * ที่ moduleList ไม่รู้ เช่น หน้าสร้าง PR ที่ไม่มี workflow ให้เริ่มเลยสักตัว
 */
export function AccessDeniedBlock({ description }: AccessDeniedBlockProps) {
  const t = useTranslations("permissionDenied");
  const navigate = useNavigate();

  return (
    <div
      role="alert"
      className="flex flex-1 items-center justify-center px-6 py-16"
    >
      <div className="bg-card flex w-full max-w-sm flex-col items-center rounded-xl border px-8 py-9 text-center">
        <div className="bg-muted text-destructive mb-4 flex size-14 items-center justify-center rounded-2xl">
          <ShieldOff className="size-6" aria-hidden />
        </div>

        <span className="text-muted-foreground text-micro-eyebrow font-semibold tracking-widest uppercase">
          {t("eyebrow")}
        </span>

        <h2 className="text-foreground mt-3 text-base font-semibold tracking-tight">
          {t("title")}
        </h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {description ?? t("pageDescription")}
        </p>

        <div className="border-border mt-5 w-full border-t" />

        <p className="text-muted-foreground text-micro mt-4 leading-relaxed">
          {t("contactAdmin")}
        </p>

        <Button
          type="button"
          size="sm"
          variant="outline"
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
