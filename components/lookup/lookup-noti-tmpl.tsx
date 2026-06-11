
import { useState } from "react";
import { useTranslations } from "use-intl";
import { useNotificationTemplates } from "@/hooks/use-notification-template";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type {
  NotificationTemplate,
  NotificationTemplateType,
} from "@/types/noti-tmpl";
import { LookupCombobox } from "./lookup-combobox";
import { Badge } from "../ui/badge";

interface LookupNotificationTemplateProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** channel ที่ใช้ filter ประเภท template (app/email/...) */
  readonly channelType: NotificationTemplateType;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
}

export function LookupNotificationTemplate({
  value,
  onValueChange,
  channelType,
  disabled,
  placeholder,
  className,
  error,
}: LookupNotificationTemplateProps) {
  const tl = useTranslations("lookup");
  const tnt = useTranslations("systemAdmin.notificationTemplate");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination({
      useListHook: useNotificationTemplates,
      search,
      perpage: -1,
      enabled: hasOpened || !!value,
      resetDeps: [channelType],
      filter: (tpl: NotificationTemplate) =>
        tpl.is_active && tpl.type === channelType,
    });

  return (
    <LookupCombobox
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      renderItem={(tpl) => (
        <>
          <Badge size="xs" variant="secondary" className="shrink-0">
            {tpl.type}
          </Badge>
          <span className="flex-1 truncate text-left">{tpl.name}</span>
        </>
      )}
      getId={(tpl) => tpl.id}
      getLabel={(tpl) => tpl.name}
      placeholder={placeholder ?? tl("select", { entity: tnt("entity") })}
      searchPlaceholder={tl("search", { entity: tnt("entity") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      error={error}
      popoverWidth="52rem"
    />
  );
}
