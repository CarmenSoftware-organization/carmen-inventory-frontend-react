import { useState } from "react";
import { Loader2, Pencil, Plus, Send, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EmailProfile } from "@/types/email-profile";
import { EmailProfileDialog } from "./email-profile-dialog";
import { useEmailProfiles } from "./use-email-profiles";

/**
 * หน้าตั้งค่าโปรไฟล์อีเมลผู้ส่งของหน่วยธุรกิจ — สร้าง/แก้/ลบ/ตั้งค่าเริ่มต้น และทดสอบส่ง
 *
 * ทุกโปรไฟล์เก็บรวมกันเป็น array เดียวใน app-config key `email_profiles` (ไม่มี list
 * endpoint แยก ไม่มี pagination) จึงใช้ตาราง HTML ธรรมดาแทน `DataGrid`
 *
 * @returns React element ของหน้า email profile
 */
export function Component() {
  const t = useTranslations("systemAdmin.emailProfile");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");

  const { value, isLoading, isError, save, isSaving, testProfile, isTesting } =
    useEmailProfiles();
  const { profiles, default_profile_id } = value;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<EmailProfile | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<EmailProfile | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const openAdd = () => {
    setEditingProfile(null);
    setDialogOpen(true);
  };

  const openEdit = (profile: EmailProfile) => {
    setEditingProfile(profile);
    setDialogOpen(true);
  };

  const handleSave = (profile: EmailProfile) => {
    const isEdit = profiles.some((p) => p.id === profile.id);

    // ── ประกอบ `profiles[]` ก่อนส่ง — ห้ามแตะลำดับเดิม ──
    // backend จับคู่รหัสผ่านเดิมกับโปรไฟล์ "ตามตำแหน่งใน array" ไม่ใช่ตาม id ดังนั้นทุกครั้งที่
    // save ต้องส่ง profiles ทั้งชุดตามลำดับเดิมเป๊ะ ห้าม sort ห้าม filter ห้ามสลับตำแหน่ง —
    // แก้ไข = map ทับที่ id เดิม (ตำแหน่งไม่ขยับ), เพิ่มใหม่ = append ต่อท้าย (ไม่กระทบตำแหน่ง
    // เดิมของรายการที่มีอยู่แล้ว) ถ้าเรียงใหม่โดยตั้งใจ รหัสผ่านจะสลับข้ามโปรไฟล์แบบไม่มี error
    // ให้เห็น
    const nextProfiles = isEdit
      ? profiles.map((p) => (p.id === profile.id ? profile : p))
      : [...profiles, profile];
    // เหลือโปรไฟล์เดียว → เป็นค่าเริ่มต้นโดยอัตโนมัติ
    const nextDefault =
      nextProfiles.length === 1 ? nextProfiles[0].id : default_profile_id;

    save(
      { default_profile_id: nextDefault, profiles: nextProfiles },
      {
        onSuccess: () => {
          toast.success(
            isEdit
              ? tt("updateSuccess", { entity: t("entity") })
              : tt("createSuccess", { entity: t("entity") }),
          );
          setDialogOpen(false);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    // ลบแล้วลำดับของรายการที่เหลือเลื่อนตามธรรมชาติ — ยอมรับได้ (รายการที่เหลือยังเรียง
    // สัมพัทธ์กันเหมือนเดิม) ต่างจากการ sort/reorder โดยตั้งใจซึ่งห้ามทำเด็ดขาด
    const nextProfiles = profiles.filter((p) => p.id !== deleteTarget.id);
    const nextDefault =
      nextProfiles.length === 0
        ? null
        : nextProfiles.length === 1
          ? nextProfiles[0].id
          : default_profile_id;

    save(
      { default_profile_id: nextDefault, profiles: nextProfiles },
      {
        onSuccess: () => {
          toast.success(tt("deleteSuccess", { entity: t("entity") }));
          setDeleteTarget(null);
        },
      },
    );
  };

  const handleSetDefault = (profile: EmailProfile) => {
    // ไม่แตะ `profiles` เลย — ส่งอาเรย์เดิมกลับไปตามลำดับเดิม เปลี่ยนแค่ default_profile_id
    save(
      { default_profile_id: profile.id, profiles },
      {
        onSuccess: () =>
          toast.success(t("setDefaultSuccess", { name: profile.name })),
      },
    );
  };

  const handleTest = (profile: EmailProfile) => {
    setTestingId(profile.id);
    testProfile(
      { profile_id: profile.id },
      {
        onSuccess: (result) => {
          // HTTP 200 ไม่ได้แปลว่าส่งสำเร็จ — ต้องอ่าน `sent`/`error` เสมอ
          if (result.sent) {
            toast.success(
              t("testSentSuccess", {
                recipient: result.recipient ?? profile.from_email,
              }),
            );
          } else {
            toast.error(result.error || t("testSentFailure"));
          }
        },
        onSettled: () => setTestingId(null),
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{t("desc")}</p>
        </div>
        {!isError && !isLoading && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t("add")}
          </Button>
        )}
      </header>

      {isError && <ErrorState message={t("loadError")} />}

      {!isError && isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isError && !isLoading && profiles.length === 0 && (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}

      {!isError && !isLoading && profiles.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted border-b">
              <tr>
                <th className="h-9 px-3 text-left font-medium">
                  {t("table.name")}
                </th>
                <th className="h-9 px-3 text-left font-medium">
                  {t("table.from")}
                </th>
                <th className="h-9 px-3 text-left font-medium">
                  {t("table.status")}
                </th>
                <th className="h-9 px-3 text-right font-medium">
                  {tc("rowActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const isDefault = profile.id === default_profile_id;
                // ลบตัวที่เป็นค่าเริ่มต้นไม่ได้ถ้ายังมีตัวอื่น — ต้องตั้งตัวใหม่ก่อน
                const deleteDisabled = isDefault && profiles.length > 1;
                const isRowTesting = isTesting && testingId === profile.id;

                return (
                  <tr key={profile.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{profile.name}</span>
                        {isDefault && (
                          <Badge variant="success-light" size="xs">
                            {t("defaultBadge")}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {profile.from_email}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={profile.enabled ? "default" : "secondary"}
                      >
                        {profile.enabled
                          ? t("statusEnabled")
                          : t("statusDisabled")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {!isDefault && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleSetDefault(profile)}
                            disabled={isSaving}
                          >
                            <Star className="size-3" aria-hidden="true" />
                            {t("setDefault")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleTest(profile)}
                          disabled={isTesting}
                          aria-label={t("testSend")}
                        >
                          {isRowTesting ? (
                            <Loader2
                              className="size-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Send className="size-3.5" aria-hidden="true" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(profile)}
                          aria-label={tc("edit")}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </Button>
                        {deleteDisabled ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex" tabIndex={0}>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled
                                  aria-label={tc("delete")}
                                >
                                  <Trash2
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("cannotDeleteDefaultTooltip")}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteTarget(profile)}
                            aria-label={tc("delete")}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EmailProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={editingProfile}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isSaving && setDeleteTarget(null)}
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={isSaving}
        onConfirm={handleDelete}
      />
    </div>
  );
}
