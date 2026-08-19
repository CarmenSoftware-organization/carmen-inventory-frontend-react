import { Link } from "react-router";
import {
  AtSign,
  Building2,
  IdCard,
  Mail,
  Phone,
  Settings,
  User,
  UserRound,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { useProfile } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoaderProfile from "@/components/loader/loader-profile";
import BUSection from "./bu-section";

function InfoItem({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}>) {
  return (
    <div className="group border-border/30 bg-background/40 hover:bg-background/60 flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-md">
      <span className="border-border/50 bg-background/50 group-hover:bg-primary/5 flex size-9 items-center justify-center rounded-lg border shadow-sm transition-transform group-hover:scale-110">
        <Icon className="text-primary size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-muted-foreground text-micro-legal font-bold tracking-wider uppercase">
          {label}
        </dt>
        <dd className="truncate text-sm font-medium" title={value || undefined}>
          {value || "-"}
        </dd>
      </div>
    </div>
  );
}

export default function UserProfileDetails() {
  const t = useTranslations("profile");
  const { data: profile, isLoading, isError } = useProfile();

  if (isLoading) return <LoaderProfile />;

  if (isError || !profile)
    return <p className="text-destructive p-4 text-xs">{t("failedToLoad")}</p>;

  const { user_info } = profile;
  const fullName = [
    user_info.firstname,
    user_info.middlename,
    user_info.lastname,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = [user_info.firstname, user_info.lastname]
    .filter(Boolean)
    .map((n) => n!.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 relative z-0 w-full space-y-4 duration-500">
      {/* Hero Header */}
      <div className="bg-primary/5 relative overflow-hidden rounded-2xl border shadow-sm">
        <div className="from-primary/10 absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-50" />
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <Avatar
              // Force remount when avatar_url flips
              key={profile.avatar_url ?? "fallback"}
              className="ring-background/50 size-16 shadow-xl ring-4 ring-offset-0 transition-transform duration-300 hover:scale-105 sm:size-20"
            >
              {profile.avatar_url && (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={fullName}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold sm:text-lg">
                {profile.alias_name || initials || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                  {fullName}
                </h2>
                <Badge
                  variant="primary-light"
                  size="sm"
                  className="shadow-primary/10 border-primary/20 text-xs shadow-sm"
                >
                  {profile.platform_role}
                </Badge>
              </div>
              <div className="text-muted-foreground flex flex-col gap-1.5 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Mail
                    className="text-primary/60 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate font-medium">{profile.email}</span>
                </span>
                {user_info.telephone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone
                      className="text-primary/60 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-medium">{user_info.telephone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="group h-11 w-full shadow-sm sm:h-9 sm:w-auto"
          >
            <Link to="/profile/setting">
              <Settings
                className="size-3.5 transition-transform group-hover:rotate-45"
                aria-hidden="true"
              />
              {t("editProfile")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Personal Information */}
      <section className="bg-card overflow-hidden rounded-2xl border shadow-sm">
        <header className="flex items-center gap-2 border-b px-3 py-3">
          <span className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
            <User className="text-primary size-4" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-semibold">{t("personalInfo")}</h3>
        </header>
        <dl className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem
            icon={UserRound}
            label={t("firstName")}
            value={user_info.firstname}
          />
          <InfoItem
            icon={UserRound}
            label={t("middleName")}
            value={user_info.middlename}
          />
          <InfoItem
            icon={IdCard}
            label={t("lastName")}
            value={user_info.lastname}
          />
          <InfoItem
            icon={AtSign}
            label={t("alias")}
            value={profile.alias_name}
          />
        </dl>
      </section>

      {/* Signature */}
      {profile.signature_url && (
        <section className="bg-card overflow-hidden rounded-2xl border shadow-sm">
          <header className="flex items-center gap-2 border-b px-3 py-3">
            <span className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
              <IdCard className="text-primary size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold">{t("signature")}</h3>
          </header>
          <div className="flex min-h-24 items-center justify-center p-4">
            <img
              key={profile.signature_url}
              src={profile.signature_url}
              alt={t("signature")}
              className="max-h-32 max-w-full object-contain drop-shadow-md transition-transform hover:scale-105"
            />
          </div>
        </section>
      )}

      {/* Business Units */}
      <section className="bg-card overflow-hidden rounded-2xl border shadow-sm">
        <header className="flex items-center gap-2 border-b px-3 py-3">
          <span className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
            <Building2 className="text-primary size-4" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-semibold">{t("businessUnits")}</h3>
        </header>
        <div className="p-3">
          {profile.business_unit.length > 0 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {profile.business_unit.map((bu) => (
                <div
                  key={bu.id}
                  className="bg-muted/10 rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h4 className="text-foreground mb-3 flex items-center gap-2 text-sm font-bold">
                    <Building2 className="text-primary size-4" />
                    {bu.name}
                  </h4>
                  <BUSection bu={bu} />
                </div>
              ))}
            </div>
          )}
          {profile.business_unit.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="bg-muted/30 border-border/30 mb-3 flex size-12 items-center justify-center rounded-full border">
                <Building2 className="text-muted-foreground size-5" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                {t("noBusinessUnits")}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
