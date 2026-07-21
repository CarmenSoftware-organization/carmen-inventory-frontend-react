
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

function AccessDeniedBlock() {
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

        <span className="text-muted-foreground text-[0.5625rem] font-semibold tracking-widest uppercase">
          {t("eyebrow")}
        </span>

        <h2 className="text-foreground mt-3 text-base font-semibold tracking-tight">
          {t("title")}
        </h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {t("pageDescription")}
        </p>

        <div className="border-border mt-5 w-full border-t" />

        <p className="text-muted-foreground mt-4 text-[0.6875rem] leading-relaxed">
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
