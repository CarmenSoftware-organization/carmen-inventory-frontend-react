
import { useState } from "react";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import { KeySquare, Layers, UserCog, Warehouse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
import { toast } from "sonner";
import { useCreateRole, useUpdateRole, useDeleteRole } from "@/hooks/use-role";
import { usePermission } from "@/hooks/use-permission";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import type { RoleDetail } from "@/types/role";
import type { FormMode } from "@/types/form";
import { SectionCard, StatTile } from "../../_shared/admin-ui";
import { RoleHero } from "./role-form-hero";
import { PermissionPicker } from "./permission-picker";
import {
  roleSchema,
  getDefaultValues,
  type RoleFormValues,
} from "./role-form-schema";

interface RoleFormProps {
  readonly role?: RoleDetail;
}

export function RoleForm({ role }: RoleFormProps) {
  const router = useRouter();
  const t = useTranslations("systemAdmin.role");
  const tt = useTranslations("toast");
  const [mode, setMode] = useState<FormMode>(role ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const [showDelete, setShowDelete] = useState(false);

  const isPending = createRole.isPending || updateRole.isPending;
  const isDisabled = isView || isPending;

  const originalPermissionIds = new Set(role?.permissions.map((p) => p.permission_id) ?? []);

  const defaultValues = getDefaultValues(role);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema) as Resolver<RoleFormValues>,
    defaultValues,
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  /* Live watches — subscribe only to specific fields */
  const watchedName = useWatch({
    control: form.control,
    name: "application_role_name",
  });
  const watchedPermissions = useWatch({
    control: form.control,
    name: "permissions",
  });
  const selectedPermissionCount = watchedPermissions?.length ?? 0;

  /* Permission catalog stats (cached — picker uses same query) */
  const { data: permData } = usePermission({ perpage: -1 });
  const permAll = permData?.data ?? [];
  const permCategories = new Set<string>();
  const permResources = new Set<string>();
  for (const p of permAll) {
    const dot = p.resource.indexOf(".");
    if (dot !== -1) {
      permCategories.add(p.resource.substring(0, dot));
      permResources.add(p.resource);
    }
  }
  const permStats = {
    total: permAll.length,
    categories: permCategories.size,
    resources: permResources.size,
  };

  const onSubmit = (values: RoleFormValues) => {
    if (isAdd) {
      createRole.mutate(
        {
          application_role_name: values.application_role_name,
          permissions: { add: values.permissions },
        },
        {
          onSuccess: () => {
            toast.success(tt("createSuccess", { entity: t("entity") }));
            router.push("/system-admin/role");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (isEdit && role) {
      const currentIds = new Set(values.permissions);
      const add = values.permissions.filter(
        (id) => !originalPermissionIds.has(id),
      );
      const remove = [...originalPermissionIds].filter(
        (id) => !currentIds.has(id),
      );

      updateRole.mutate(
        {
          id: role.id,
          application_role_name: values.application_role_name,
          permissions: { add, remove },
        },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            router.push("/system-admin/role");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && role) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        router.push("/system-admin/role");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => router.push("/system-admin/role"));
    } else {
      router.push("/system-admin/role");
    }
  };

  const heroName = watchedName ?? "";

  return (
    <div className="space-y-4">
      <AnimationStyles />

      {/* ── Hero ──────────────────────────────────── */}
      <Reveal>
        <RoleHero
          name={heroName}
          isNew={isAdd}
          isView={isView}
          canDelete={isView && !!role}
          isDeleting={deleteRole.isPending}
          isSaving={isPending}
          selectedPermissions={selectedPermissionCount}
          totalPermissions={permStats.total}
          onBack={handleBack}
          onDelete={() => setShowDelete(true)}
          onEdit={() => setMode("edit")}
          onCancel={handleCancel}
        />
      </Reveal>

      {/* ── Stat tiles ────────────────────────────── */}
      <Reveal delay={80}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            icon={KeySquare}
            label={t("statPermissions")}
            value={selectedPermissionCount}
            tone="info"
          />
          <StatTile
            icon={Layers}
            label={t("statCategories")}
            value={permStats.categories}
            tone="warning"
          />
          <StatTile
            icon={Warehouse}
            label={t("statResources")}
            value={permStats.resources}
            tone="success"
          />
        </div>
      </Reveal>

      {/* ── Form ──────────────────────────────────── */}
      <form
        id="role-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-4"
      >
        {/* Name */}
        <Reveal delay={140}>
          <SectionCard icon={UserCog} title={t("name")}>
            <Field data-invalid={!!form.formState.errors.application_role_name}>
              <Input
                placeholder={t("namePlaceholder")}
                className="h-9 max-w-md"
                disabled={isDisabled}
                maxLength={100}
                {...form.register("application_role_name")}
              />
              {form.formState.errors.application_role_name?.message && (
                <FieldError>
                  {form.formState.errors.application_role_name.message}
                </FieldError>
              )}
            </Field>
          </SectionCard>
        </Reveal>

        {/* Permissions */}
        <Reveal delay={200}>
          <SectionCard
            icon={KeySquare}
            title={t("permissions")}
            count={selectedPermissionCount}
          >
            <Controller
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <PermissionPicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isDisabled}
                  originalIds={originalPermissionIds}
                />
              )}
            />
          </SectionCard>
        </Reveal>
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {role && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteRole.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", {
            name: role.application_role_name,
          })}
          isPending={deleteRole.isPending}
          onConfirm={() => {
            deleteRole.mutate(role.id, {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                router.push("/system-admin/role");
              },
              onError: (err) => toast.error(err.message),
            });
          }}
        />
      )}
    </div>
  );
}
