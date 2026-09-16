import { useTranslations } from "use-intl";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
  ListCardActiveRow,
} from "@/components/share/list-card";
import type { RecipeCategory } from "@/types/recipe-category";

interface RecipeCategoryCardProps {
  readonly item: RecipeCategory;
  readonly parentName?: string;
  readonly onEdit: (item: RecipeCategory) => void;
  readonly onDelete: (item: RecipeCategory) => void;
}

export default function RecipeCategoryCard({
  item,
  parentName,
  onEdit,
  onDelete,
}: RecipeCategoryCardProps) {
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.name || "..."}
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      <ListCardActiveRow active={item.is_active} />
      {item.code && <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>}
      {parentName && (
        <ListCardRow label={tfl("parentCategory")}>{parentName}</ListCardRow>
      )}
      {item.description && (
        <ListCardRow label={tfl("description")}>{item.description}</ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
