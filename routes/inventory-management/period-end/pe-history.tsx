
import { Archive } from "lucide-react";
import { useTranslations } from "use-intl";
import EmptyComponent from "@/components/empty-component";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePeriodEnd } from "@/hooks/use-period-end";

export default function PeHistory() {
  const t = useTranslations("inventoryManagement.periodEnd");
  const { data, isLoading } = usePeriodEnd();

  const items = data?.data ?? [];

  return (
    <section
      className="animate-fade-in-up space-y-3"
      style={{ animationDelay: "120ms" }}
    >
      <header className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="bg-muted text-muted-foreground inline-flex size-7 items-center justify-center rounded-lg"
        >
          <Archive className="size-3.5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{t("history")}</h2>
          <p className="text-muted-foreground text-xs">{t("historyDesc")}</p>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        <Card className="bg-muted/20 border-dashed">
          <CardContent>
            <EmptyComponent icon={Archive} title={t("noHistory")} />
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
