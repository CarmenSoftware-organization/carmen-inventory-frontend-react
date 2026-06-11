
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import EmptyComponent from "@/components/empty-component";
import { useDashboardDatasets } from "@/hooks/use-dashboard-dataset";
import type { DashboardDataset } from "@/types/dashboard-dataset";

export default function DashboardDatasetComponent() {
  const t = useTranslations("systemAdmin.dashboardDataset");
  const [query, setQuery] = useState("");
  const { data, isLoading, isError, error } = useDashboardDatasets();

  const items = data?.items ?? [];
  const total = data?.count ?? 0;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q),
      )
    : items;

  const grouped = (() => {
    const map = new Map<string, DashboardDataset[]>();
    for (const d of filtered) {
      const list = map.get(d.category) ?? [];
      list.push(d);
      map.set(d.category, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  })();

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2">
        <ModuleTileIcon />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{t("title")}</h1>
            {total > 0 && (
              <Badge variant="secondary" size="sm">
                {total}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{t("desc")}</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search
          className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          className="h-8 pl-8 text-sm"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("searchPlaceholder")}
        />
      </div>

      {isLoading && (
        <div
          className="text-muted-foreground flex items-center gap-2 py-8 text-sm"
          aria-live="polite"
          aria-busy
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t("loading")}
        </div>
      )}

      {isError && (
        <div className="text-destructive border-destructive/30 bg-destructive/5 rounded-md border p-3 text-sm">
          {error instanceof Error ? error.message : t("loadError")}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyComponent
          title={query ? t("emptyFilteredTitle") : t("emptyTitle")}
          description={query ? t("emptyFilteredDesc") : t("emptyDesc")}
        />
      )}

      {!isLoading && !isError && grouped.length > 0 && (
        <div className="space-y-4">
          {grouped.map(([category, datasets]) => (
            <section key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {category}
                </h2>
                <span className="text-muted-foreground text-xs">
                  · {datasets.length}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {datasets.map((d) => (
                  <DatasetCard key={d.id} dataset={d} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DatasetCard({ dataset }: { readonly dataset: DashboardDataset }) {
  return (
    <article className="bg-card hover:border-foreground/20 rounded-lg border p-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm leading-snug font-medium">{dataset.name}</h3>
        <Badge variant="outline" size="sm" className="shrink-0">
          {dataset.shape}
        </Badge>
      </div>
      <p className="text-muted-foreground mt-1 text-xs leading-snug">
        {dataset.description}
      </p>
      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-[0.6875rem]">
        <span>{dataset.id}</span>
        <span aria-hidden>·</span>
        <span>{dataset.unit}</span>
      </div>
    </article>
  );
}
