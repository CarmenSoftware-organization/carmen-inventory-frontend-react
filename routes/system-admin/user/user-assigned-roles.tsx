
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Check, Shield, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/role";
import { EmptyState, SectionCard } from "./user-assigned-ui";
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
        "group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
        checked
          ? "border-primary/40 bg-primary/5"
          : "border-border/60 bg-card hover:border-foreground/20 hover:bg-muted/40",
        disabled &&
          "hover:border-border/60 hover:bg-card cursor-not-allowed opacity-60",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md transition-colors",
          checked
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10",
        )}
        aria-hidden="true"
      >
        {checked ? (
          <ShieldCheck className="size-4" />
        ) : (
          <Shield className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            checked ? "text-foreground" : "text-foreground/90",
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
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
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
  readonly onSubmit: (values: UserRolesFormValues) => void;
}

export function RolesSection({
  form,
  roles,
  isLoading,
  isDisabled,
  count,
  onSubmit,
}: RolesSectionProps) {
  const t = useTranslations("systemAdmin.user");
  return (
    <SectionCard icon={Shield} title={t("assignRoles")} count={count}>
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
          <div className="space-y-2">
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
    </SectionCard>
  );
}
