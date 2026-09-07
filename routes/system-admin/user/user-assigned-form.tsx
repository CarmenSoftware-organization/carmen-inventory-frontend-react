import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { useNavigate } from "react-router";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
import { toast } from "sonner";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useRole } from "../shared/use-role";
import { useUpdateUser } from "@/hooks/use-user";
import type { UserDetail } from "@/types/user";
import type { FormMode } from "@/types/form";
import {
  userAssignedSchema,
  getDefaultValues,
  buildUserPatch,
  type UserAssignedFormValues,
} from "./user-assigned-form-schema";
import { UserAvatar } from "./user-assigned-ui";
import { RolesSection } from "./user-assigned-roles";
import { DepartmentsSection } from "./user-assigned-departments";
import { LocationsSection } from "./user-assigned-locations";
import { BackButton } from "@/components/share/back-button";
import { StatusBadge } from "@/components/ui/status-badge";

interface UserAssignedFormProps {
  readonly user: UserDetail;
}

export function UserAssignedForm({ user }: UserAssignedFormProps) {
  const navigate = useNavigate();
  const tt = useTranslations("toast");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const [mode, setMode] = useState<FormMode>("view");
  const isView = mode === "view";

  const { data: rolesData, isLoading: rolesLoading } = useRole();
  const updateUser = useUpdateUser();
  const roles = rolesData?.data ?? [];

  // ค่าตั้งต้นของทั้งสามส่วนมาพร้อมตัวผู้ใช้ในนัดเดียว — เก็บไว้เทียบตอน submit
  // ว่าอะไรเปลี่ยนบ้าง (PATCH รับ diff ไม่ใช่ทั้งชุด)
  const initialValues = getDefaultValues(user);

  // middlename เพิ่งมากับสัญญาใหม่ — ชื่อเต็มจึงตรงกับที่การ์ดในหน้ารายการแสดง
  const fullName = [
    user.user.firstname,
    user.user.middlename,
    user.user.lastname,
  ]
    .filter(Boolean)
    .join(" ");

  const form = useForm<UserAssignedFormValues>({
    resolver: zodResolver(
      userAssignedSchema,
    ) as Resolver<UserAssignedFormValues>,
    defaultValues: initialValues,
  });

  const isPending = updateUser.isPending;
  const isDisabled = isView || isPending;

  const onSubmit = async (values: UserAssignedFormValues) => {
    const payload = buildUserPatch(initialValues, values);

    // กด Save ทั้งที่ไม่ได้แตะอะไร = กลับไปโหมดดูเฉย ๆ ไม่ต้องกวน backend
    if (!payload) {
      setMode("view");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUser.mutateAsync({ user_id: user.user_id, ...payload });
      toast.success(tt("updateSuccess", { entity: tfl("user") }));
      navigate("/system-admin/user");
    } catch {
      // toast ขึ้นจาก MutationCache กลางแล้ว — แค่ไม่ navigate ออกจากฟอร์ม
      // ต้องเปิด guard กลับ ไม่งั้นฟอร์มที่ยัง dirty อยู่จะออกได้โดยไม่ถาม
      setIsSubmitting(false);
    }
  };

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  // ปิด guard ตั้งแต่กดบันทึก — submit สำเร็จแล้วเด้งกลับหน้ารายการ ถ้ายังเปิดอยู่
  // sentinel จะค้างใน history stack กด back แล้วเจอหน้าเดิมซ้ำ
  const [isSubmitting, setIsSubmitting] = useState(false);

  // useDiscardConfirm ดักได้แค่ปุ่มในฟอร์มเอง (Cancel/Back) — ลิงก์ข้างนอกอย่าง
  // เมนู sidebar ต้องใช้ตัวนี้ดัก ไม่งั้นกดแล้วหลุดออกไปพร้อมข้อมูลที่ยังไม่ได้เซฟ
  const navGuard = useNavigationGuard(
    !isView && form.formState.isDirty && !isSubmitting,
  );

  const handleCancel = () => {
    discard.confirm(() => {
      form.reset(initialValues);
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
  const roleCount = watchedRoleIds?.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <AnimationStyles />

      {/* ── Header: identity + actions (company-profile layout) ── */}
      {/* ปุ่ม back ห้อยออกนอกคอลัมน์ซ้ายแบบเดียวกับ DocFormHeader ที่ฟอร์มอื่น
          ใช้ (location/vendor/…) — absolute อ้างแถวหัวข้อ ชื่อผู้ใช้จึงเริ่มตรง
          ขอบเดียวกับเนื้อฟอร์มข้างล่าง ไม่โดนปุ่มดันเยื้องเข้ามา */}
      <header className="relative mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex min-w-0 items-center gap-3">
          <BackButton
            onClick={handleBack}
            className="absolute top-1/2 left-0 -translate-x-[calc(100%+0.25rem)] -translate-y-1/2"
          />
          <UserAvatar first={user.user.firstname} last={user.user.lastname} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="text-foreground truncate text-lg font-semibold tracking-tight">
                {fullName}
              </h1>
              {/* endpoint เพิ่งเริ่มส่ง is_active มาพร้อมตัวผู้ใช้ — ก่อนหน้านี้ไม่มี
                  badge เพราะไม่มีข้อมูล ไม่ใช่เพราะไม่อยากให้มี */}
              <StatusBadge active={user.user.is_active} className="shrink-0" />
            </div>
            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
              <span className="break-all">{user.user.email}</span>
              <span aria-hidden="true">·</span>
              <span>@{user.user.username}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isView ? (
            <Button size="sm" onClick={() => setMode("edit")}>
              <Pencil className="size-3.5" aria-hidden="true" />
              {tc("edit")}
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
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                form="user-assigned-form"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save className="size-3.5" aria-hidden="true" />
                )}
                {tc("save")}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ── Settings-style sections (title+desc left · body right) ── */}
      {/* ฟอร์มเดียวครอบทั้งสาม section — ปุ่ม Save อยู่นอกฟอร์มแล้วอ้างด้วย
          `form=` เดิม `<form>` ซ่อนอยู่ใน RolesSection ซึ่ง render เฉพาะตอนมี
          role ให้เลือก กดบันทึกตอนไม่มี role เลยเงียบสนิทเพราะปุ่มชี้ไปที่ไม่มีอยู่ */}
      <form
        id="user-assigned-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
      >
        <Reveal delay={80}>
          <RolesSection
            first
            form={form}
            roles={roles}
            isLoading={rolesLoading}
            isDisabled={isDisabled}
            count={roleCount}
          />
        </Reveal>

        <Reveal delay={140}>
          <DepartmentsSection
            form={form}
            isDisabled={isDisabled}
            departmentName={user.department?.name}
          />
        </Reveal>

        <Reveal delay={200}>
          <LocationsSection
            form={form}
            isDisabled={isDisabled}
            userLocations={user.locations}
          />
        </Reveal>
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />
    </div>
  );
}
