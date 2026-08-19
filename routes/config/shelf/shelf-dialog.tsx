import { Controller } from "react-hook-form";
import { Rows3 } from "lucide-react";
import { useTranslations } from "use-intl";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Field, FieldInput, FieldLabel } from "@/components/ui/field";
import { ConfigEntityDialog } from "@/components/templates/config-entity-dialog";
import { useCreateShelf, useUpdateShelf } from "@/hooks/use-shelf";
import {
  createShelfSchema,
  EMPTY_FORM,
  type ShelfFormValues,
} from "./shelf-form-schema";
import type { Shelf } from "@/types/shelf";

interface ShelfDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly shelf?: Shelf | null;
  readonly readOnly?: boolean;
}

type ShelfPayload = { name: string; is_active: boolean };

export function ShelfDialog({
  open,
  onOpenChange,
  shelf,
  readOnly,
}: ShelfDialogProps) {
  const t = useTranslations("config.shelf");
  const tfl = useTranslations("field");

  return (
    <ConfigEntityDialog<Shelf, ShelfFormValues, ShelfPayload>
      open={open}
      onOpenChange={onOpenChange}
      entity={shelf}
      readOnly={readOnly}
      icon={Rows3}
      translationNamespace="config.shelf"
      useCreate={useCreateShelf}
      useUpdate={useUpdateShelf}
      buildSchema={createShelfSchema}
      toFormValues={(e) =>
        e ? { name: e.name, is_active: e.is_active } : EMPTY_FORM
      }
      toPayload={(v) => ({ name: v.name, is_active: v.is_active })}
    >
      {({ form, disabled }) => (
        <>
          <Field>
            <FieldLabel htmlFor="shelf-name" required>
              {tfl("name")}
            </FieldLabel>
            <FieldInput
              id="shelf-name"
              placeholder={t("namePlaceholder")}
              className="h-8"
              disabled={disabled}
              error={form.formState.errors.name?.message}
              maxLength={100}
              {...form.register("name")}
            />
          </Field>

          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <StatusSwitch
                id="shelf-is-active"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
        </>
      )}
    </ConfigEntityDialog>
  );
}
