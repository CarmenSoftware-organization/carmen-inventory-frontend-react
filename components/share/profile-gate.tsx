import { AlertTriangle, RotateCw } from "lucide-react";
import { CarmenLogo } from "@/components/icons/carmen-logo";
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
      className="flex flex-1 items-center justify-center px-6 py-16"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="inline-flex animate-spin">
        <CarmenLogo size={56} />
      </span>
      <span className="sr-only">{t("loadingTitle")}</span>
    </div>
  );
}

function ProfileError({ onRetry }: { readonly onRetry: () => void }) {
  const t = useTranslations("profileGate");
  return (
    <div
      className="flex flex-1 items-center justify-center px-6 py-16"
      role="alert"
    >
      <div className="bg-card flex w-full max-w-sm flex-col items-center rounded-xl border px-8 py-9 text-center">
        <div className="bg-muted text-destructive mb-4 flex size-14 items-center justify-center rounded-2xl">
          <AlertTriangle className="size-6" />
        </div>

        <span className="text-muted-foreground text-[0.5625rem] font-semibold tracking-widest uppercase">
          {t("errorEyebrow")}
        </span>

        <h2 className="text-foreground mt-3 text-base font-semibold tracking-tight">
          {t("errorTitle")}
        </h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {t("errorDesc")}
        </p>

        <Button type="button" size="sm" onClick={onRetry} className="mt-5">
          <RotateCw />
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
