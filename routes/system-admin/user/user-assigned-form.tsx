
import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
import type { TransferItem } from "@/components/ui/transfer";
import { toast } from "sonner";
import { useRole } from "@/hooks/use-role";
import { useLocation } from "@/hooks/use-location";
import {
  useUpdateUserRoles,
  useUserLocations,
  useUpdateUserLocations,
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

interface UserAssignedFormProps {
  readonly user: UserDetail;
}

export function UserAssignedForm({ user }: UserAssignedFormProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>("view");
  const isView = mode === "view";

  const { data: rolesData, isLoading: rolesLoading } = useRole();
  const updateUserRoles = useUpdateUserRoles();
  const roles = rolesData?.data ?? [];

  const { data: userLocations = [], isLoading: locationsLoading } =
    useUserLocations(user.user_id);
  const { data: allLocationData, isLoading: allLocationsLoading } = useLocation(
    { perpage: 999 },
  );
  const updateUserLocations = useUpdateUserLocations();

  const { data: userDepartments, isLoading: departmentsLoading } =
    useUserDepartments(user.user_id);

  /* Transfer source */
  const locationSource: TransferItem[] = (allLocationData?.data ?? [])
    .filter((l) => l.is_active)
    .map((l) => ({ key: l.id, title: `${l.code} — ${l.name}` }));

  const initialLocationKeys = userLocations.map((l) => l.location_id);
  const serverLocationKey = initialLocationKeys.join("|");

  const [locationTargetKeys, setLocationTargetKeys] =
    useState<string[]>(initialLocationKeys);

  // Re-seed the transfer target only when the SERVER data actually changes,
  // via React's "adjust state during render" pattern. Depending on
  // `initialLocationKeys` in an effect re-ran every render (fresh array each
  // time) and reverted the user's picks the moment they moved one across.
  const [seededLocationKey, setSeededLocationKey] = useState(serverLocationKey);
  if (seededLocationKey !== serverLocationKey) {
    setSeededLocationKey(serverLocationKey);
    setLocationTargetKeys(initialLocationKeys);
  }

  const memberDepartment = userDepartments?.department ?? null;
  const hodDepartments = userDepartments?.hod_departments ?? [];

  const initialRoleIds = user.application_roles.map((r) => r.application_role_id);

  const form = useForm<UserRolesFormValues>({
    resolver: zodResolver(userRolesSchema) as Resolver<UserRolesFormValues>,
    defaultValues: getDefaultValues(user),
  });

  const isSaving = updateUserRoles.isPending || updateUserLocations.isPending;
  const isPending = isSaving;
  const isDisabled = isView || isPending;

  const hasLocationChanges =
    JSON.stringify([...locationTargetKeys].sort()) !==
    JSON.stringify([...initialLocationKeys].sort());

  const onSubmit = async (values: UserRolesFormValues) => {
    const addRoles = values.role_ids.filter(
      (id) => !initialRoleIds.includes(id),
    );
    const removeRoles = initialRoleIds.filter(
      (id) => !values.role_ids.includes(id),
    );
    const hasRoleChanges = addRoles.length > 0 || removeRoles.length > 0;

    if (!hasRoleChanges && !hasLocationChanges) {
      setMode("view");
      return;
    }

    try {
      const promises: Promise<unknown>[] = [];
      if (hasRoleChanges) {
        promises.push(
          updateUserRoles.mutateAsync({
            user_id: user.user_id,
            application_role_id: {
              ...(addRoles.length > 0 && { add: addRoles }),
              ...(removeRoles.length > 0 && { remove: removeRoles }),
            },
          }),
        );
      }
      if (hasLocationChanges) {
        promises.push(
          updateUserLocations.mutateAsync({
            userId: user.user_id,
            locationIds: locationTargetKeys,
          }),
        );
      }
      await Promise.all(promises);
      toast.success("User updated successfully");
      navigate("/system-admin/user");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty || hasLocationChanges,
    isPending,
  });

  const handleCancel = () => {
    discard.confirm(() => {
      form.reset({ role_ids: initialRoleIds });
      setLocationTargetKeys(initialLocationKeys);
      setMode("view");
    });
  };

  const handleBack = () => {
    if (mode === "edit") {
      discard.confirm(() => navigate("/system-admin/user"));
    } else {
      navigate("/system-admin/user");
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
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <AnimationStyles />

      {/* ── Header: identity + actions (business-setting layout) ── */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Go back"
            onClick={handleBack}
          >
            <ArrowLeft />
          </Button>
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
          isView={isView}
          isLoading={locationsLoading}
          isDisabled={isDisabled}
          userLocations={userLocations}
          locationSource={locationSource}
          locationTargetKeys={locationTargetKeys}
          onTargetKeysChange={setLocationTargetKeys}
          transferLoading={allLocationsLoading || locationsLoading}
          initialLocationCount={initialLocationKeys.length}
        />
      </Reveal>

      <DiscardDialog {...discard.dialogProps} variant="warning" />
    </div>
  );
}
