
import { useRef, useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Camera,
  KeyRound,
  Loader2,
  Mail,
  Trash2,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  useDeleteUserAvatar,
  useProfile,
  useUpdateProfile,
  useUploadUserAvatar,
  useUploadUserSignature,
  useDeleteUserSignature,
} from "@/hooks/use-profile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  getDefaultValues,
  createProfileSchema,
  type ProfileFormValues,
} from "./profile-form-schema";
import ChangePasswordDialog from "./change-password-dialog";
import { AvatarCropDialog } from "./avatar-crop-dialog";
import { SignatureDialog } from "./signature-dialog";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import {
  IMAGE_MAX_BYTES,
  IMAGE_ACCEPT_ATTR,
  IMAGE_MIME_TYPES,
} from "@/lib/image-upload";

export default function UserProfileSetting() {
  const router = useRouter();
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tv = useTranslations("validation");
  const { data: profile, isLoading, isError } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadUserAvatar();
  const deleteAvatar = useDeleteUserAvatar();
  const isUploadingAvatar = uploadAvatar.isPending;
  const isDeletingAvatar = deleteAvatar.isPending;
  const uploadSignature = useUploadUserSignature();
  const deleteSignature = useDeleteUserSignature();
  const isUploadingSignature = uploadSignature.isPending;
  const isDeletingSignature = deleteSignature.isPending;
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [removeSignatureOpen, setRemoveSignatureOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [removeAvatarOpen, setRemoveAvatarOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // Source image queued for the crop dialog. Separate from `avatarPreview`
  // (which only reflects the final image, post-crop).
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFilename, setCropFilename] = useState<string>("avatar.png");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side guards — backend still validates authoritatively
    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      toast.error(t("logoTypeError"));
      event.target.value = "";
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      toast.error(t("logoSizeError"));
      event.target.value = "";
      return;
    }

    // Open the crop dialog with the picked file as source. The dialog will
    // call `handleConfirmCrop` with the final (cropped) File when the user
    // confirms — only then do we hit the upload API.
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      setCropSrc(dataUrl);
      setCropFilename(file.name || "avatar.png");
    };
    reader.readAsDataURL(file);
  };

  const handleCancelCrop = () => {
    setCropSrc(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleConfirmCrop = (cropped: File) => {
    // Show the cropped preview while the upload is in flight
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(cropped);

    uploadAvatar.mutate(cropped, {
      onSuccess: () => {
        toast.success(t("avatarUploaded"));
        setAvatarPreview(null);
        setCropSrc(null);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
      },
      onError: (err) => {
        toast.error(err.message || t("avatarUploadFailed"));
        setAvatarPreview(null);
        setCropSrc(null);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
      },
    });
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview) {
      setAvatarPreview(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }
    if (!profile?.avatar_url) return;
    setRemoveAvatarOpen(true);
  };

  const handleConfirmRemoveAvatar = () => {
    deleteAvatar.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("avatarRemoved"));
        if (avatarInputRef.current) avatarInputRef.current.value = "";
        setRemoveAvatarOpen(false);
      },
      onError: (err) => {
        toast.error(err.message || t("avatarRemoveFailed"));
        // Keep dialog open so user can retry
      },
    });
  };

  const handleConfirmSignature = (file: File) => {
    uploadSignature.mutate(file, {
      onSuccess: () => {
        toast.success(t("signatureUpdated"));
        setSignatureDialogOpen(false);
      },
      onError: (err) => toast.error(err.message || t("signatureUploadFailed")),
    });
  };

  const handleConfirmRemoveSignature = () => {
    deleteSignature.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("signatureRemoved"));
        setRemoveSignatureOpen(false);
      },
      onError: (err) => toast.error(err.message || t("signatureRemoveFailed")),
    });
  };

  const profileSchema = createProfileSchema(tv, tfl);
  const defaultValues = getDefaultValues(profile);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileFormValues>,
    defaultValues,
    values: defaultValues,
  });

  const handleBack = () => router.push("/profile");

  const onSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate(values, {
      onSuccess: () => {
        toast.success(t("profileUpdated"));
        form.reset(values);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  if (isLoading) return <ProfileSettingSkeleton />;

  if (isError || !profile)
    return <p className="text-destructive p-4 text-xs">{t("failedToLoad")}</p>;

  const initials = [profile.user_info?.firstname, profile.user_info?.lastname]
    .filter(Boolean)
    .map((n) => n!.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="w-full space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-2 py-1 sm:static sm:py-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleBack}
          aria-label={tc("goBack")}
          className="h-11 w-11 sm:h-8 sm:w-8"
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
      </div>

      {/* Account Info — read-only hero */}
      <div className="from-primary/8 via-primary/3 relative overflow-hidden rounded-xl border bg-linear-to-br to-transparent shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1rem_1rem,var(--primary)_1px,transparent_1px)] bg-size-[1.5rem_1.5rem] opacity-[0.15]" />
        <div className="relative flex flex-col gap-2.5 px-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label={t("uploadAvatar")}
                aria-busy={isUploadingAvatar}
                className="group ring-primary/20 ring-offset-background hover:ring-primary/40 focus-visible:ring-primary relative block size-12 cursor-pointer rounded-full ring-2 ring-offset-2 transition focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
              >
                <Avatar
                  key={avatarPreview ?? profile.avatar_url ?? "fallback"}
                  className="size-12"
                >
                  {(avatarPreview ?? profile.avatar_url) && (
                    <AvatarImage
                      src={avatarPreview ?? profile.avatar_url ?? undefined}
                      alt={initials || "?"}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {profile.alias_name || initials || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="bg-foreground/55 pointer-events-none absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="size-4 text-white" aria-hidden="true" />
                </span>
              </button>
              {(avatarPreview || profile.avatar_url) && !isUploadingAvatar && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  disabled={isDeletingAvatar}
                  onClick={handleRemoveAvatar}
                  aria-label={t("removeAvatar")}
                  className="absolute -top-1 -right-1 size-5 rounded-full shadow"
                >
                  {isDeletingAvatar ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Trash2 aria-hidden="true" />
                  )}
                </Button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept={IMAGE_ACCEPT_ATTR}
                disabled={isUploadingAvatar}
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">
                  {t("accountInfo")}
                </span>
                <Badge variant="primary-light" size="xs" className="text-xs">
                  {profile.platform_role}
                </Badge>
              </div>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <Mail className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{profile.email || "-"}</span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPasswordOpen(true)}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            <KeyRound className="size-3.5" aria-hidden="true" />
            {t("changePassword")}
          </Button>
        </div>
      </div>

      {/* Personal Info Form */}
      <section className="bg-card rounded-xl border shadow-sm">
        <header className="border-b px-2 py-2">
          <h2 className="text-sm font-semibold">{t("personalInfo")}</h2>
        </header>
        <form
          id="profile-form"
          onSubmit={form.handleSubmit(onSubmit, () =>
            scrollToFirstInvalidField(),
          )}
          className="space-y-3 px-2 py-3"
        >
          <FieldGroup className="gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field data-invalid={!!form.formState.errors.firstname}>
                <FieldLabel htmlFor="firstname" required>
                  {t("firstName")}
                </FieldLabel>
                <Input
                  id="firstname"
                  placeholder={t("enterFirstName")}
                  className="h-8"
                  maxLength={100}
                  disabled={updateProfile.isPending}
                  {...form.register("firstname")}
                />
                <FieldError>
                  {form.formState.errors.firstname?.message}
                </FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.middlename}>
                <FieldLabel htmlFor="middlename">{t("middleName")}</FieldLabel>
                <Input
                  id="middlename"
                  placeholder={t("enterMiddleName")}
                  className="h-8"
                  maxLength={100}
                  disabled={updateProfile.isPending}
                  {...form.register("middlename")}
                />
                <FieldError>
                  {form.formState.errors.middlename?.message}
                </FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.lastname}>
                <FieldLabel htmlFor="lastname" required>
                  {t("lastName")}
                </FieldLabel>
                <Input
                  id="lastname"
                  placeholder={t("enterLastName")}
                  className="h-8"
                  maxLength={100}
                  disabled={updateProfile.isPending}
                  {...form.register("lastname")}
                />
                <FieldError>
                  {form.formState.errors.lastname?.message}
                </FieldError>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                data-invalid={!!form.formState.errors.telephone}
                className="w-full"
              >
                <FieldLabel htmlFor="telephone">{t("telephone")}</FieldLabel>
                <Input
                  id="telephone"
                  placeholder={t("enterTelephone")}
                  className="h-8"
                  maxLength={20}
                  disabled={updateProfile.isPending}
                  {...form.register("telephone")}
                />
                <FieldError>
                  {form.formState.errors.telephone?.message}
                </FieldError>
              </Field>

              <Field
                data-invalid={!!form.formState.errors.alias_name}
                className="w-full lg:w-20"
              >
                <FieldLabel htmlFor="alias_name">{t("alias")}</FieldLabel>
                <Input
                  id="alias_name"
                  placeholder={t("aliasPlaceholder")}
                  className="h-8"
                  maxLength={2}
                  disabled={updateProfile.isPending}
                  {...form.register("alias_name")}
                />
                <FieldError>
                  {form.formState.errors.alias_name?.message}
                </FieldError>
              </Field>
            </div>
          </FieldGroup>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={updateProfile.isPending}
              className="h-11 w-full sm:h-9 sm:w-auto"
            >
              {updateProfile.isPending ? t("saving") : tc("save")}
            </Button>
          </div>
        </form>
      </section>

      {/* Signature */}
      <section className="bg-card rounded-xl border shadow-sm">
        <header className="flex items-center justify-between border-b px-2 py-2">
          <h2 className="text-sm font-semibold">{t("signature")}</h2>
          <div className="flex gap-2">
            {profile.signature_url && !isUploadingSignature && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeletingSignature}
                onClick={() => setRemoveSignatureOpen(true)}
              >
                {isDeletingSignature ? (
                  <Loader2
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden="true" />
                )}
                {t("removeSignature")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploadingSignature}
              onClick={() => setSignatureDialogOpen(true)}
            >
              {profile.signature_url ? t("editSignature") : t("addSignature")}
            </Button>
          </div>
        </header>
        <div className="flex min-h-24 items-center justify-center p-3">
          {profile.signature_url ? (
            <img
              key={profile.signature_url}
              src={profile.signature_url}
              alt={t("signature")}
              className="max-h-32 max-w-full object-contain"
            />
          ) : (
            <p className="text-muted-foreground text-xs">
              {t("signatureUploadHint")}
            </p>
          )}
        </div>
      </section>

      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />

      <SignatureDialog
        open={signatureDialogOpen}
        isSubmitting={isUploadingSignature}
        onOpenChange={setSignatureDialogOpen}
        onConfirm={handleConfirmSignature}
      />

      <AvatarCropDialog
        src={cropSrc}
        filename={cropFilename}
        isSubmitting={isUploadingAvatar}
        onClose={handleCancelCrop}
        onConfirm={handleConfirmCrop}
      />

      <AlertDialog
        open={removeAvatarOpen}
        onOpenChange={(o) =>
          !o && !isDeletingAvatar && setRemoveAvatarOpen(false)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeAvatarConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeAvatarConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAvatar}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingAvatar}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRemoveAvatar();
              }}
            >
              {isDeletingAvatar ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-3" aria-hidden="true" />
              )}
              {isDeletingAvatar ? t("removingAvatar") : t("removeAvatar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeSignatureOpen}
        onOpenChange={(o) =>
          !o && !isDeletingSignature && setRemoveSignatureOpen(false)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("removeSignatureConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeSignatureConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSignature}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingSignature}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRemoveSignature();
              }}
            >
              {isDeletingSignature ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-3" aria-hidden="true" />
              )}
              {isDeletingSignature
                ? t("removingSignature")
                : t("removeSignature")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const ProfileSettingSkeleton = () => {
  return (
    <div className="max-w-2xl space-y-4 p-3">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
};
