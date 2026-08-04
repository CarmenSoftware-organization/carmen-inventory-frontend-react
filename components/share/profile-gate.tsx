import { AlertTriangle, Building2, RotateCw } from "lucide-react";
import { CarmenLogo } from "@/components/icons/carmen-logo";
import { useTranslations } from "use-intl";
import { useLogout } from "@/hooks/use-logout";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { EyeBrow } from "@/components/ui/eye-brow";

/**
 * Gate ระดับ layout — Soft Sheet premium loader/error
 *
 * รอจน useProfile โหลดเสร็จ (มี data หรือ error) ก่อน render children
 * ป้องกัน flash ของ "not found" / error UI ใน child components ที่ depend
 * บน profile/buCode
 *
 * และกันเคส "โปรไฟล์โหลดผ่าน แต่ไม่มี business unit สักอัน" ไว้ด้วย — เกิดกับ
 * คนที่เพิ่งสมัครแล้วยังไม่มีใคร assign เข้าโรงแรมไหน ปล่อยผ่านไปทุกหน้าจะขึ้น
 * skeleton ค้างถาวร เพราะ query ทั้งแอป enabled ด้วย `!!buCode` จึงไม่เคยยิงเลย
 * ไม่มี error ไม่มี empty ให้เห็น
 */
export function ProfileGate({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { data, isPending, isError, refetch, fullName } = useProfile();

  if (isPending || (!data && !isError)) {
    return <ProfileLoading />;
  }

  if (isError) {
    return <ProfileError onRetry={() => refetch()} />;
  }

  if (data && data.business_unit.length === 0) {
    return <NoBusinessUnit name={fullName} onRetry={() => refetch()} />;
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

/**
 * ยังไม่ถูก assign เข้า BU ไหน — สถานะ "รอสิทธิ์" ไม่ใช่ error ของระบบ จึงไม่ใช้
 * โทน destructive: ไอคอน neutral หนึ่งตัว แล้วปล่อยให้ accent เดียวไปอยู่ที่ปุ่ม
 * (docs/DESIGN.md — one accent per element)
 */
function NoBusinessUnit({
  name,
  onRetry,
}: {
  readonly name: string;
  readonly onRetry: () => void;
}) {
  const t = useTranslations("profileGate");
  const logoutMutation = useLogout();

  return (
    <div
      className="flex flex-1 items-center justify-center px-6 py-16"
      role="status"
    >
      <div className="bg-card flex w-full max-w-sm flex-col items-center rounded-xl border p-6 text-center">
        <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-xl">
          <Building2 className="size-5" />
        </div>

        <EyeBrow>{t("noBuEyebrow")}</EyeBrow>

        <h2 className="text-foreground mt-3 text-base font-semibold tracking-tight">
          {t("noBuTitle")}
        </h2>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          {t("noBuDesc")}
        </p>

        {name && (
          <p className="text-muted-foreground/70 mt-3 text-micro-legal">
            {t("signedInAs", { name })}
          </p>
        )}

        <div className="mt-5 flex w-full flex-col gap-2">
          <Button type="button" size="sm" onClick={onRetry}>
            <RotateCw />
            {t("noBuRetry")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            {t("signOut")}
          </Button>
        </div>
      </div>
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
      <div className="bg-card flex w-full max-w-sm flex-col items-center rounded-xl border p-6 text-center">
        <div className="bg-muted text-destructive mb-4 flex size-12 items-center justify-center rounded-xl">
          <AlertTriangle className="size-5" />
        </div>

        <EyeBrow>{t("errorEyebrow")}</EyeBrow>

        <h2 className="text-foreground mt-3 text-base font-semibold tracking-tight">
          {t("errorTitle")}
        </h2>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
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
