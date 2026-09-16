import { useState } from "react";
import { useTranslations } from "use-intl";
import { useCategory } from "@/hooks/use-category";
import type { CategoryDto } from "@/types/category";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupCategoryProps {
  readonly value: string;
  readonly onValueChange: (value: string, item?: CategoryDto) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly size?: "xs" | "sm";
  readonly defaultLabel?: string;
  readonly error?: string;
}

export function LookupCategory({
  value,
  onValueChange,
  disabled,
  className,
  size = "sm",
  defaultLabel,
  error,
}: LookupCategoryProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const { data, isLoading } = useCategory(
    { perpage: -1 },
    { enabled: hasOpened || !!value },
  );

  const categories = (data?.data ?? []).filter((c) => c.is_active);

  return (
    <LookupCombobox
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={categories}
      getId={(c) => c.id}
      getLabel={(c) => `${c.code} — ${c.name}`}
      getSearchValue={(c) => `${c.code} ${c.name}`}
      size={size}
      renderItem={(c) => (
        <>
          <Badge size="xs" variant="secondary">
            {c.code}
          </Badge>
          <span className="flex-1 truncate text-left text-xs">{c.name}</span>
        </>
      )}
      placeholder={tl("select", { entity: tfl("category") })}
      searchPlaceholder={tl("search", { entity: tfl("category") })}
      disabled={disabled}
      className={className}
      defaultLabel={defaultLabel}
      emptyTitle={tl("noDefined", { entity: tfl("category") })}
      emptyDescription={tl("noDefined", { entity: tfl("category") })}
      isLoading={isLoading}
      error={error}
    />
  );
}
