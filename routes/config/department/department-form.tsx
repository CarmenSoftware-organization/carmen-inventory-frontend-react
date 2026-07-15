import { lazy, Suspense, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import {
  Field,
  FieldInput,
  FieldLabel,
  FieldPlainText,
} from "@/components/ui/field";
import { FormToolbar } from "@/components/ui/form-toolbar";
import { SettingSection } from "@/components/ui/setting-section";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Textarea } from "@/components/ui/textarea";
import type { TransferItem } from "@/components/ui/transfer";
import { UserTable } from "@/components/ui/user-table";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useUpdateDepartment,
} from "@/hooks/use-department";
import { useAllUsers } from "@/hooks/use-all-users";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import type { Department } from "@/types/department";
import type { FormMode } from "@/types/form";
import { transferHandler } from "@/utils/transfer-handler";
import {
  createDepartmentSchema,
  type DepartmentFormValues,
} from "./department-form-schema";

// แทน next/dynamic ด้วย React.lazy (code-split chunk เหมือนเดิม)
const Transfer = lazy(() =>
  import("@/components/ui/transfer").then((m) => ({ default: m.Transfer })),
);

const FORM_ID = "department-form";
const emptyTransfer = { add: [], remove: [] };

interface DepartmentFormProps {
  readonly department?: Department;
}

export function DepartmentForm({ department }: DepartmentFormProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>(department ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createDepartment.isPending || updateDepartment.isPending;
  const isDisabled = isView || isPending;
  const t = useTranslations("config.department");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  // Fetch all users for Transfer
  const { data: allUsers = [], isLoading: isLoadingUsers } = useAllUsers();

  // Department users source: users without department + users already in this department
  const currentDeptUserIds = new Set(
    department?.department_users.map((u) => u.user_id) ?? [],
  );
  const departmentUserSource: TransferItem[] = allUsers
    .filter(
      (user) => !user.department?.id || currentDeptUserIds.has(user.user_id),
    )
    .map((user) => ({
      key: user.user_id,
      title: `${user.firstname} ${user.lastname}`,
    }));

  // HOD users source: all users (no filter)
  const hodUserSource: TransferItem[] = allUsers.map((user) => ({
    key: user.user_id,
    title: `${user.firstname} ${user.lastname}`,
  }));

  // Enrich department users with email from allUsers
  const emailMap = new Map(allUsers.map((u) => [u.user_id, u.email]));
  const enrichedDeptUsers = (department?.department_users ?? []).map((u) => ({
    ...u,
    email: emailMap.get(u.user_id) ?? "",
  }));
  const enrichedHodUsers = (department?.hod_users ?? []).map((u) => ({
    ...u,
    email: emailMap.get(u.user_id) ?? "",
  }));

  // Target keys state
  const [deptUserTargetKeys, setDeptUserTargetKeys] = useState<string[]>(
    () => department?.department_users.map((u) => u.user_id) ?? [],
  );
  const [hodUserTargetKeys, setHodUserTargetKeys] = useState<string[]>(
    () => department?.hod_users.map((u) => u.user_id) ?? [],
  );

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(
      createDepartmentSchema(tv, tfl),
    ) as Resolver<DepartmentFormValues>,
    defaultValues: department
      ? {
          code: department.code,
          name: department.name,
          description: department.description,
          account_code: department.account_code ?? "",
          is_active: department.is_active,
          department_users: { ...emptyTransfer },
          hod_users: { ...emptyTransfer },
        }
      : {
          code: "",
          name: "",
          description: "",
          account_code: "",
          is_active: true,
          department_users: { ...emptyTransfer },
          hod_users: { ...emptyTransfer },
        },
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  // Transfer onChange handlers
  const handleDeptUsersChange = (
    nextTargetKeys: string[],
    direction: "left" | "right",
    moveKeys: string[],
  ) => {
    setDeptUserTargetKeys(nextTargetKeys);
    transferHandler(form, "department_users", moveKeys, direction);
  };

  const handleHodUsersChange = (
    nextTargetKeys: string[],
    direction: "left" | "right",
    moveKeys: string[],
  ) => {
    setHodUserTargetKeys(nextTargetKeys);
    transferHandler(form, "hod_users", moveKeys, direction);
  };

  const onSubmit = (values: DepartmentFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description ?? "",
      account_code: values.account_code,
      is_active: values.is_active,
      department_users: values.department_users,
      hod_users: values.hod_users,
    };

    if (isEdit && department) {
      updateDepartment.mutate(
        // doc_version round-trips the loaded record's version — the backend
        // requires it on PATCH for optimistic concurrency (omitting it → 400).
        { id: department.id, doc_version: department.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            setMode("view");
          },
        },
      );
    } else if (isAdd) {
      createDepartment.mutate(payload, {
        onSuccess: (res) => {
          const { id } = (res as { data: { id: string } }).data;
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate(`/config/department/${id}`, { replace: true });
          setMode("view");
        },
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && department) {
        form.reset({
          code: department.code,
          name: department.name,
          description: department.description,
          account_code: department.account_code ?? "",
          is_active: department.is_active,
          department_users: { ...emptyTransfer },
          hod_users: { ...emptyTransfer },
        });
        setDeptUserTargetKeys(
          department.department_users.map((u) => u.user_id),
        );
        setHodUserTargetKeys(department.hod_users.map((u) => u.user_id));
        setMode("view");
      } else {
        navigate("/config/department");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate("/config/department"));
    } else {
      navigate("/config/department");
    }
  };

  const codeBadge =
    department && !isAdd ? (
      <Badge
        variant="secondary"
        size="sm"
        className="text-xs"
        aria-label={tfl("code")}
      >
        {department.code}
      </Badge>
    ) : undefined;

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <AnimationStyles />
      {/* ── Toolbar ─────────── */}
      <Reveal>
        <FormToolbar
          entity={department?.name || t("entity")}
          mode={mode}
          formId={FORM_ID}
          isPending={isPending}
          onBack={handleBack}
          onCancel={handleCancel}
          onEdit={() => setMode("edit")}
          onDelete={department ? () => setShowDelete(true) : undefined}
          deleteIsPending={deleteDepartment.isPending}
          statusBadge={codeBadge}
          editTitle={department?.name}
          permissionPrefix="configuration.department"
        />
      </Reveal>

      <div className="mt-6">
        {/* ── General Info ─────────── */}
        <Reveal delay={80}>
          <form
            id={FORM_ID}
            onSubmit={form.handleSubmit(onSubmit, () =>
              scrollToFirstInvalidField(),
            )}
          >
            <SettingSection
              first
              title={tfl("general")}
              description={t("generalDesc")}
            >
              <Field>
                <FieldLabel htmlFor="department-code" required>
                  {tfl("code")}
                </FieldLabel>
                {isView ? (
                  <FieldPlainText>{department?.code}</FieldPlainText>
                ) : (
                  <FieldInput
                    id="department-code"
                    placeholder={t("codePlaceholder")}
                    disabled={isDisabled}
                    error={form.formState.errors.code?.message}
                    maxLength={10}
                    {...form.register("code")}
                  />
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="department-name" required>
                  {tfl("name")}
                </FieldLabel>
                {isView ? (
                  <FieldPlainText>{department?.name}</FieldPlainText>
                ) : (
                  <FieldInput
                    id="department-name"
                    placeholder={t("namePlaceholder")}
                    disabled={isDisabled}
                    error={form.formState.errors.name?.message}
                    maxLength={100}
                    {...form.register("name")}
                  />
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="department-account-code">
                  {tfl("accountCode")}
                </FieldLabel>
                {isView ? (
                  <FieldPlainText>{department?.account_code}</FieldPlainText>
                ) : (
                  <FieldInput
                    id="department-account-code"
                    placeholder={tfl("optional")}
                    disabled={isDisabled}
                    maxLength={30}
                    {...form.register("account_code")}
                  />
                )}
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="department-description">
                  {tfl("description")}
                </FieldLabel>
                {isView ? (
                  <FieldPlainText className="items-start whitespace-pre-wrap">
                    {department?.description}
                  </FieldPlainText>
                ) : (
                  <Textarea
                    id="department-description"
                    placeholder={tfl("optional")}
                    rows={2}
                    disabled={isDisabled}
                    maxLength={256}
                    className="resize-none"
                    {...form.register("description")}
                  />
                )}
              </Field>

              <div className="sm:col-span-2">
                <Controller
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <StatusSwitch
                      id="department-is-active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled}
                    />
                  )}
                />
              </div>
            </SettingSection>
          </form>
        </Reveal>

        {/* ── Members ─────────── */}
        <Reveal delay={160}>
          <SettingSection
            wide
            title={t("members")}
            description={t("membersDesc")}
            count={
              isView
                ? (department?.department_users.length ?? 0)
                : deptUserTargetKeys.length
            }
          >
            {isView ? (
              <UserTable users={enrichedDeptUsers} />
            ) : (
              <Suspense fallback={null}>
                <Transfer
                  dataSource={departmentUserSource}
                  targetKeys={deptUserTargetKeys}
                  onChange={handleDeptUsersChange}
                  disabled={isDisabled}
                  loading={isLoadingUsers}
                  titles={[t("availableUsers"), t("members")]}
                />
              </Suspense>
            )}
          </SettingSection>
        </Reveal>

        {/* ── HOD ─────────── */}
        <Reveal delay={220}>
          <SettingSection
            wide
            title={t("hod")}
            description={t("hodDesc")}
            count={
              isView
                ? (department?.hod_users.length ?? 0)
                : hodUserTargetKeys.length
            }
          >
            {isView ? (
              <UserTable users={enrichedHodUsers} />
            ) : (
              <Suspense fallback={null}>
                <Transfer
                  dataSource={hodUserSource}
                  targetKeys={hodUserTargetKeys}
                  onChange={handleHodUsersChange}
                  disabled={isDisabled}
                  loading={isLoadingUsers}
                  titles={[t("availableUsers"), t("hod")]}
                />
              </Suspense>
            )}
          </SettingSection>
        </Reveal>
      </div>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {department && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteDepartment.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: department?.name ?? "" })}
          isPending={deleteDepartment.isPending}
          onConfirm={() => {
            deleteDepartment.mutate(department.id, {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                navigate("/config/department");
              },
            });
          }}
        />
      )}
    </div>
  );
}
