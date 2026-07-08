
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Check, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/role";
import { AssignSection, EmptyState } from "./user-assigned-ui";
import type { UserRolesFormValues } from "./user-roles-form-schema";

/* ------------------------------------------------------------------ */
/* RoleToggleCard — single role pickable card                          */
/* ------------------------------------------------------------------ */

interface RoleToggleCardProps {
  readonly role: Role;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onChange: (checked: boolean) => void;
}

function RoleToggleCard({
  role,
  checked,
  disabled,
  onChange,
}: RoleToggleCardProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={cn(
        "group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
        checked ? "bg-primary/5" : "hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            checked ? "text-foreground font-medium" : "text-foreground/90",
          )}
        >
          {role.name}
        </p>
        {role.description && (
          <p className="text-muted-foreground line-clamp-1 text-[0.6875rem]">
            {role.description}
          </p>
        )}
      </div>
      <div
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border group-hover:border-foreground/30 bg-transparent",
        )}
        aria-hidden="true"
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* RolesSection — form section wrapping all roles                      */
/* ------------------------------------------------------------------ */

interface RolesSectionProps {
  readonly form: UseFormReturn<UserRolesFormValues>;
  readonly roles: Role[];
  readonly isLoading: boolean;
  readonly isDisabled: boolean;
  readonly count: number;
  readonly first?: boolean;
  readonly onSubmit: (values: UserRolesFormValues) => void;
}

export function RolesSection({
  form,
  roles,
  isLoading,
  isDisabled,
  count,
  first,
  onSubmit,
}: RolesSectionProps) {
  const t = useTranslations("systemAdmin.user");
  return (
    <AssignSection
      title={t("assignRoles")}
      description={t("assignRolesDesc")}
      count={count}
      first={first}
    >
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={t("noRolesAvailable")}
          desc={t("noRolesAvailableDesc")}
        />
      ) : (
        <form
          id="user-roles-form"
          onSubmit={form.handleSubmit(onSubmit, () =>
            scrollToFirstInvalidField(),
          )}
        >
          <div className="divide-border/60 overflow-hidden rounded-lg border divide-y">
            {roles.map((role: Role) => (
              <Controller
                key={role.id}
                control={form.control}
                name="role_ids"
                render={({ field }) => {
                  const isChecked = field.value?.includes(role.id);
                  return (
                    <RoleToggleCard
                      role={role}
                      checked={!!isChecked}
                      disabled={isDisabled}
                      onChange={(c) => {
                        if (c) {
                          field.onChange([...field.value, role.id]);
                        } else {
                          field.onChange(
                            field.value.filter((v) => v !== role.id),
                          );
                        }
                      }}
                    />
                  );
                }}
              />
            ))}
          </div>
        </form>
      )}
    </AssignSection>
  );
}
