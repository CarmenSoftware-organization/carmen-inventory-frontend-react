import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useAppConfigs } from "@/hooks/use-app-config";
import type { AppConfig } from "@/types/app-config";
import { INTERFACES, type InterfaceDef } from "./interface-registry";

export type InterfaceStatus = {
  readonly def: InterfaceDef;
  readonly enabled: boolean;
};

/**
 * จับคู่ interface ใน registry กับ config ที่มีอยู่ เพื่อหาสถานะ enabled
 *
 * interface ที่ยังไม่มี row ใน app_config ถือว่า disabled — เป็นสถานะปกติของ interface
 * ที่ยังไม่เคยตั้งค่า ไม่ใช่ error
 *
 * @param defs - รายการ interface จาก registry
 * @param configs - app config ทั้งหมดของ BU ปัจจุบัน (มี key อื่นปนมาด้วย)
 * @returns หนึ่งแถวต่อหนึ่ง interface เรียงตาม registry
 */
export function interfaceStatuses(
  defs: readonly InterfaceDef[],
  configs: readonly AppConfig[],
): readonly InterfaceStatus[] {
  const byKey = new Map(configs.map((c) => [c.key, c]));
  return defs.map((def) => ({
    def,
    enabled: byKey.get(def.configKey)?.value?.enabled === true,
  }));
}

/**
 * หน้า list ของ interface ทั้งหมด — การ์ดต่อ interface พร้อม badge สถานะ
 *
 * @returns React element ของหน้า interface list
 */
export default function InterfaceList() {
  const t = useTranslations("systemAdmin.interface");
  const { data, isLoading, isError, refetch } = useAppConfigs();

  const rows = interfaceStatuses(INTERFACES, data ?? []);

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">{t("desc")}</p>
      </header>

      {isError && <ErrorState message={t("loadError")} onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {INTERFACES.map((def) => (
            <Skeleton key={def.key} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ def, enabled }) => {
            const Icon = def.icon;
            return (
              <Link
                key={def.key}
                to={`/system-admin/interface/${def.key}`}
                className="hover:border-primary/50 focus-visible:ring-ring flex flex-col gap-2 rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <Icon className="text-muted-foreground size-5" aria-hidden="true" />
                  <Badge variant={enabled ? "default" : "secondary"}>
                    {enabled ? t("statusEnabled") : t("statusDisabled")}
                  </Badge>
                </div>
                <div>
                  <h2 className="text-sm font-medium">{t(`${def.key}.title`)}</h2>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t(`${def.key}.desc`)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
