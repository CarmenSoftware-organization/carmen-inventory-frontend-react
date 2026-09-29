import { useState } from "react";
import { useTranslations } from "use-intl";
import { useNotificationTemplates } from "@/hooks/use-notification-template";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type {
  NotificationTemplate,
  NotificationTemplateType,
} from "@/types/noti-tmpl";
import { LookupCombobox } from "./lookup-combobox";

interface LookupNotificationTemplateProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly channelType: NotificationTemplateType;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

export function LookupNotificationTemplate({
  value,
  onValueChange,
  channelType,
  disabled,
  placeholder,
  className,
  size,
  error,
}: LookupNotificationTemplateProps) {
  const tl = useTranslations("lookup");
  const tnt = useTranslations("systemAdmin.notificationTemplate");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<NotificationTemplate>({
      useListHook: useNotificationTemplates,
      search,
      // template ที่ stage ผูกไว้คงแสดงแม้ถูกปิดใช้งาน — มาทาง selectedItems
      serverFilter: `${ACTIVE_ONLY_FILTER},type|string:${channelType}`,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      renderItem={(tpl) => (
        <span className="flex-1 truncate text-left">{tpl.name}</span>
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
