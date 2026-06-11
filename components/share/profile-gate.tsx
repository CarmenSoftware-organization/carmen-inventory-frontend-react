
import { AlertTriangle, Hotel, RotateCw } from "lucide-react";
import { useTranslations } from "use-intl";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";

/**
 * Gate ระดับ layout — Soft Sheet premium loader/error
 *
 * รอจน useProfile โหลดเสร็จ (มี data หรือ error) ก่อน render children
 * ป้องกัน flash ของ "not found" / error UI ใน child components ที่ depend
 * บน profile/buCode
 */
export function ProfileGate({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { data, isPending, isError, refetch } = useProfile();

  if (isPending || (!data && !isError)) {
    return <ProfileLoading />;
  }

  if (isError) {
    return <ProfileError onRetry={() => refetch()} />;
  }

  return <>{children}</>;
}

function ProfileLoading() {
  const t = useTranslations("profileGate");
  return (
    <div
      className="relative flex flex-1 items-center justify-center px-6 py-16"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <style>{`
        @keyframes pg-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes pg-fade-up { 0% { opacity: 0; transform: translateY(0.5rem); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes pg-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes pg-glow {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.75; }
        }
      `}</style>

      <div
        className="border-border/50 bg-card/60 relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-3xl border px-8 py-9 text-center shadow-[0_2rem_4rem_-1rem_color-mix(in_oklch,var(--primary),transparent_82%),0_0.5rem_1.5rem_-0.5rem_rgba(0,0,0,0.05)] backdrop-blur-2xl"
        style={{ animation: "pg-fade-up 0.5s ease-out both" }}
      >
        {/* Inner highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
          }}
        />

        {/* Brand mark with soft gradient glow */}
        <div className="relative mb-5">
          <div
            aria-hidden
            className="from-primary to-chart-3 absolute inset-0 -z-10 rounded-2xl bg-linear-to-br blur-xl"
            style={{ animation: "pg-glow 2.6s ease-in-out infinite" }}
          />
          <div className="from-primary to-chart-3 text-primary-foreground relative flex size-14 items-center justify-center rounded-2xl bg-linear-to-br shadow-[0_0.75rem_2rem_-0.5rem_color-mix(in_oklch,var(--primary),transparent_45%)]">
            <Hotel className="size-6" />
          </div>
        </div>

        {/* Headline */}
        <h2
          className="text-foreground relative mt-3 bg-linear-to-r from-current via-current to-current bg-clip-text text-base font-semibold tracking-tight"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--foreground) 0%, color-mix(in oklch, var(--foreground), transparent 50%) 50%, var(--foreground) 100%)",
            backgroundSize: "200% 100%",
            animation: "pg-shimmer 2.2s linear infinite",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {t("loadingTitle")}
        </h2>
        {/* Indeterminate progress bar */}
        <div
          aria-hidden
          className="bg-primary/10 relative mt-5 h-0.5 w-32 overflow-hidden rounded-full"
        >
          <div
            className="from-primary to-chart-3 absolute inset-y-0 w-1/3 rounded-full bg-linear-to-r"
            style={{ animation: "pg-bar 1.4s ease-in-out infinite" }}
          />
        </div>

        <span className="sr-only">{t("loadingSr")}</span>
      </div>
    </div>
  );
}

function ProfileError({ onRetry }: { readonly onRetry: () => void }) {
  const t = useTranslations("profileGate");
  return (
    <div
      className="relative flex flex-1 items-center justify-center px-6 py-16"
      role="alert"
    >
      <div
        className="border-destructive/40 bg-card/60 relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-3xl border px-8 py-9 text-center shadow-[0_2rem_4rem_-1rem_color-mix(in_oklch,var(--destructive),transparent_82%),0_0.5rem_1.5rem_-0.5rem_rgba(0,0,0,0.05)] backdrop-blur-2xl"
        style={{ animation: "pg-fade-up 0.5s ease-out both" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
          }}
        />

        <div className="bg-destructive/10 text-destructive relative mb-4 flex size-14 items-center justify-center rounded-2xl">
          <AlertTriangle className="size-6" />
        </div>

        <span className="bg-destructive/10 text-destructive border-destructive/15 relative inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.5625rem] font-bold tracking-widest uppercase">
          {t("errorEyebrow")}
        </span>

        <h2 className="text-foreground relative mt-3 text-base font-semibold tracking-tight">
          {t("errorTitle")}
        </h2>
        <p className="text-muted-foreground relative mt-1 text-xs leading-relaxed">
          {t("errorDesc")}
        </p>

        <Button
          type="button"
          size="sm"
          onClick={onRetry}
          className="relative mt-5 rounded-lg"
        >
          <RotateCw />
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
