import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { useNavigate } from "react-router";
import { Pencil, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
import { toast } from "sonner";
import { useRole } from "../shared/use-role";
import {
  useUpdateUserRoles,
  useUserLocations,
  useUserDepartments,
} from "@/hooks/use-user";
import type { UserDetail } from "@/types/user";
import type { FormMode } from "@/types/form";
import {
  userRolesSchema,
  getDefaultValues,
  type UserRolesFormValues,
} from "./user-roles-form-schema";
import { UserAvatar } from "./user-assigned-ui";
import { RolesSection } from "./user-assigned-roles";
import { DepartmentsSection } from "./user-assigned-departments";
import { LocationsSection } from "./user-assigned-locations";
import { BackButton } from "@/components/share/back-button";

interface UserAssignedFormProps {
  readonly user: UserDetail;
}

export function UserAssignedForm({ user }: UserAssignedFormProps) {
  const navigate = useNavigate();
  const tt = useTranslations("toast");
  const tfl = useTranslations("field");
  const [mode, setMode] = useState<FormMode>("view");
  const isView = mode === "view";

  const { data: rolesData, isLoading: rolesLoading } = useRole();
  const updateUserRoles = useUpdateUserRoles();
  const roles = rolesData?.data ?? [];

  // คลังเป็นข้อมูลอ่านอย่างเดียวในหน้านี้ — ผูก/ถอนคลังทำที่ /config/location
  const { data: userLocations = [], isLoading: locationsLoading } =
    useUserLocations(user.user_id);

  const { data: userDepartments, isLoading: departmentsLoading } =
    useUserDepartments(user.user_id);

  const memberDepartment = userDepartments?.department ?? null;
  const hodDepartments = userDepartments?.hod_departments ?? [];

  const initialRoleIds = user.application_roles.map(
    (r) => r.application_role_id,
  );

  const form = useForm<UserRolesFormValues>({
    resolver: zodResolver(userRolesSchema) as Resolver<UserRolesFormValues>,
    defaultValues: getDefaultValues(user),
  });

  const isPending = updateUserRoles.isPending;
  const isDisabled = isView || isPending;

  const onSubmit = async (values: UserRolesFormValues) => {
    const addRoles = values.role_ids.filter(
      (id) => !initialRoleIds.includes(id),
    );
    const removeRoles = initialRoleIds.filter(
      (id) => !values.role_ids.includes(id),
    );

    if (addRoles.length === 0 && removeRoles.length === 0) {
      setMode("view");
      return;
    }

    try {
      await updateUserRoles.mutateAsync({
        user_id: user.user_id,
        application_role_id: {
          ...(addRoles.length > 0 && { add: addRoles }),
          ...(removeRoles.length > 0 && { remove: removeRoles }),
        },
      });
      toast.success(tt("updateSuccess", { entity: tfl("user") }));
      navigate("/system-admin/user");
    } catch {
      // toast ขึ้นจาก MutationCache กลางแล้ว — แค่ไม่ navigate ออกจากฟอร์ม
    }
  };

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const handleCancel = () => {
    discard.confirm(() => {
      form.reset({ role_ids: initialRoleIds });
      setMode("view");
    });
  };

  // Back = กลับหน้า list เสมอ ไม่ใช่ history back — จากหน้า detail ผู้ใช้เดินไปใบอื่น
  // ได้ (ปุ่ม ↑↓ ของ DocSequenceNav) history จึงเป็นเส้นทางที่เดินผ่านมา ไม่ใช่ที่ที่
  // อยากกลับไป กดครั้งเดียวต้องถึง list ไม่ใช่ถอยทีละใบ
  const goBack = () => {
    navigate("/system-admin/user");
  };

  const handleBack = () => {
    if (mode === "edit") {
      discard.confirm(goBack);
    } else {
      goBack();
    }
  };

  /* useWatch subscribes only to `role_ids` for live count */
  const watchedRoleIds = useWatch({
    control: form.control,
    name: "role_ids",
  });
  const selectedRoleCount = watchedRoleIds?.length ?? 0;
  const totalDeptCount = (memberDepartment ? 1 : 0) + hodDepartments.length;
  const roleCountForDisplay = isView
    ? initialRoleIds.length
    : selectedRoleCount;

  return (
    <div className="mx-auto w-full max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <AnimationStyles />

      {/* ── Header: identity + actions (company-profile layout) ── */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton onClick={handleBack} />
          <UserAvatar first={user.firstname} last={user.lastname} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-foreground truncate text-lg font-semibold tracking-tight">
                {user.firstname} {user.lastname}
              </h1>
              <Badge variant="success-light" size="xs" className="shrink-0">
                ● Active
              </Badge>
            </div>
            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
              <span className="break-all">{user.email}</span>
              <span aria-hidden="true">·</span>
              <span>@{user.username}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isView ? (
            <Button size="sm" onClick={() => setMode("edit")}>
              <Pencil />
              Edit
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="size-3.5" aria-hidden="true" />
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                form="user-roles-form"
                disabled={isPending}
              >
                <Save className="size-3.5" aria-hidden="true" />
                {isPending ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ── Settings-style sections (title+desc left · body right) ── */}
      <Reveal delay={80}>
        <RolesSection
          first
          form={form}
          roles={roles}
          isLoading={rolesLoading}
          isDisabled={isDisabled}
          count={roleCountForDisplay}
          onSubmit={onSubmit}
        />
      </Reveal>

      <Reveal delay={140}>
        <DepartmentsSection
          memberDepartment={memberDepartment}
          hodDepartments={hodDepartments}
          isLoading={departmentsLoading}
          totalCount={totalDeptCount}
        />
      </Reveal>

      <Reveal delay={200}>
        <LocationsSection
          isLoading={locationsLoading}
          userLocations={userLocations}
        />
      </Reveal>

      <DiscardDialog {...discard.dialogProps} variant="warning" />
    </div>
  );
}
