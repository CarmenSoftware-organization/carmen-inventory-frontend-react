
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Empty state สำหรับ products section — flat neutral (dashed muted border) */
export function EmptyProducts({
  onAdd,
  disabled,
  title,
  description,
  addLabel,
}: {
  readonly onAdd: () => void;
  readonly disabled: boolean;
  readonly title: string;
  readonly description: string;
  readonly addLabel: string;
}) {
  return (
    <div className="border-border/60 bg-muted/20 rounded-xl border border-dashed p-6 text-center">
      <div className="bg-muted text-muted-foreground/70 mx-auto mb-2 flex size-9 items-center justify-center rounded-xl">
        <Tag className="size-4" />
      </div>
      <div className="text-foreground text-xs font-semibold">{title}</div>
      <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
        {description}
      </p>
      {!disabled && (
        <Button type="button" size="xs" onClick={onAdd} className="mt-2">
          <Plus />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
