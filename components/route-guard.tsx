
import { usePathname, useRouter } from "@/lib/compat/navigation";
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
  const pathname = usePathname();
  const { can, isAdmin } = useCan();

  const leaf = findRouteLeaf(pathname);
  const denied = !!leaf?.permission && !isAdmin && !can(leaf.permission);

  if (!denied) return <>{children}</>;
  return <AccessDeniedBlock />;
}

function AccessDeniedBlock() {
  const t = useTranslations("permissionDenied");
  const router = useRouter();

  return (
    <div
      role="alert"
      className="relative flex flex-1 items-center justify-center px-6 py-16"
    >
      <style>{`
        @keyframes rg-fade-up { 0% { opacity: 0; transform: translateY(0.5rem); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes rg-tile-glow { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--destructive), transparent 70%); } 50% { box-shadow: 0 0 0 0.5rem color-mix(in oklch, var(--destructive), transparent 92%); } }
      `}</style>

      {/* Decorative ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 40rem 20rem at 50% 30%, color-mix(in oklch, var(--destructive), transparent 92%), transparent 70%)",
        }}
      />

      <div
        className="border-destructive/30 bg-card/60 relative flex w-full max-w-md flex-col items-center overflow-hidden rounded-3xl border px-8 py-10 text-center shadow-[0_2rem_4rem_-1rem_color-mix(in_oklch,var(--destructive),transparent_82%),0_0.5rem_1.5rem_-0.5rem_rgba(0,0,0,0.06)] backdrop-blur-2xl"
        style={{ animation: "rg-fade-up 0.45s ease-out both" }}
      >
        {/* Inner highlight overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
          }}
        />

        {/* Corner accent (top-right) */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--destructive), transparent 75%) 0%, transparent 70%)",
          }}
        />

        {/* Lock tile with gradient + glow */}
        <div
          className="relative mb-5 flex size-16 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--destructive), transparent 78%) 0%, color-mix(in oklch, var(--destructive), transparent 90%) 100%)",
            animation: "rg-tile-glow 2.4s ease-in-out infinite",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)",
            }}
          />
          <ShieldOff className="text-destructive relative size-7" aria-hidden />
        </div>

        {/* Eyebrow badge */}
        <span className="bg-destructive/10 text-destructive border-destructive/20 relative inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.5625rem] font-bold tracking-[0.18em] uppercase">
          <span
            aria-hidden
            className="bg-destructive size-1 rounded-full"
            style={{ animation: "rg-tile-glow 2.4s ease-in-out infinite" }}
          />
          {t("eyebrow")}
        </span>

        {/* Title */}
        <h2 className="text-foreground relative mt-3 text-base font-semibold tracking-tight">
          {t("title")}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground relative mt-1.5 max-w-[20rem] text-xs leading-relaxed">
          {t("pageDescription")}
        </p>

        {/* Divider */}
        <div className="border-border/50 relative mt-5 w-full border-t" />

        {/* Contact admin row */}
        <p className="text-muted-foreground/80 relative mt-4 text-[0.6875rem] leading-relaxed">
          {t("contactAdmin")}
        </p>

        {/* Action */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => router.back()}
          className="border-border/70 relative mt-5 rounded-lg"
        >
          <ArrowLeft />
          {t("goBack")}
        </Button>
      </div>
    </div>
  );
}
