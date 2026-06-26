
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Empty state สำหรับ products section — dashed primary border + gradient icon */
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
    <div className="border-primary/35 bg-primary/5 rounded-xl border border-dashed p-6 text-center">
      <div className="text-primary-foreground mx-auto mb-2 flex size-9 items-center justify-center rounded-xl bg-primary">
        <Tag className="size-4" />
      </div>
      <div className="text-foreground text-xs font-semibold">{title}</div>
      <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
        {description}
      </p>
      {!disabled && (
        <Button
          type="button"
          size="xs"
          onClick={onAdd}
          className="mt-2 rounded-full"
        >
          <Plus />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
