import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useAppConfigs } from "@/hooks/use-app-config";
import { useInterfaceEntitlement } from "@/hooks/use-interface-entitlement";
import type { AppConfig } from "@/types/app-config";
import {
  INTERFACE_CATEGORIES,
  type BrandDef,
  type InterfaceCategoryDef,
} from "./interface-registry";

export type BrandStatus = {
  readonly brand: BrandDef;
  readonly enabled: boolean;
};

export type CategoryGroup = {
  readonly category: InterfaceCategoryDef;
  readonly brands: readonly BrandStatus[];
};

/**
 * จับคู่ brand ในแต่ละ category กับ config ที่มีอยู่ แล้วกรองด้วย entitlement
 *
 * brand ที่ platform ไม่ได้ให้สิทธิ์ถูกตัดออก; category ที่ไม่เหลือ brand เลยถูกตัดทั้งกลุ่ม
 * brand ที่ยังไม่มี row ใน app_config ถือว่า disabled — เป็นสถานะปกติ ไม่ใช่ error
 *
 * @param categories - รายการ category จาก registry
 * @param configs - app config ทั้งหมดของ BU ปัจจุบัน (มี key อื่นปนมาด้วย)
 * @param isEntitled - predicate จาก `useInterfaceEntitlement`
 * @returns กลุ่มต่อ category (เฉพาะที่มี brand เห็นได้) เรียงตาม registry
 */
export function interfaceGroups(
  categories: readonly InterfaceCategoryDef[],
  configs: readonly AppConfig[],
  isEntitled: (categoryKey: string, brandKey: string) => boolean,
): readonly CategoryGroup[] {
  const byKey = new Map(configs.map((c) => [c.key, c]));
  return categories
    .map((category) => ({
      category,
      brands: category.brands
        .filter((brand) => isEntitled(category.key, brand.key))
        .map((brand) => ({
          brand,
          enabled: byKey.get(brand.configKey)?.value?.enabled === true,
        })),
    }))
    .filter((group) => group.brands.length > 0);
}

/**
 * หน้า list ของ interface ทั้งหมด — จัดกลุ่มตาม category, การ์ดต่อ brand พร้อม badge สถานะ
 *
 * @returns React element ของหน้า interface list
 */
export default function InterfaceList() {
  const t = useTranslations("systemAdmin.interface");
  const { isEntitled } = useInterfaceEntitlement();
  const { data, isLoading, isError, refetch } = useAppConfigs();

  const groups = interfaceGroups(INTERFACE_CATEGORIES, data ?? [], isEntitled);

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">{t("desc")}</p>
      </header>

      {isError && <ErrorState message={t("loadError")} onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {INTERFACE_CATEGORIES.map((def) => (
            <Skeleton key={def.key} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && groups.length === 0 && (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}

      {!isError && !isLoading && groups.length > 0 && (
        <div className="space-y-6">
          {groups.map(({ category, brands }) => {
            const Icon = category.icon;
            return (
              <section key={category.key}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                  <h2 className="text-sm font-medium">
                    {t(`${category.key}.title`)}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {brands.map(({ brand, enabled }) => (
                    <Link
                      key={brand.key}
                      to={`/system-admin/interface/${category.key}/${brand.key}`}
                      className="hover:border-primary/50 focus-visible:ring-ring flex items-center justify-between gap-2 rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span className="text-sm font-medium">
                        {t(`${category.key}.brand.${brand.key}`)}
                      </span>
                      <Badge variant={enabled ? "default" : "secondary"}>
                        {enabled ? t("statusEnabled") : t("statusDisabled")}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
