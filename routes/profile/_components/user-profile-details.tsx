
import Link from "@/lib/compat/link";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
    <div className="group bg-muted/30 hover:bg-muted/50 flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors">
      <span className="bg-background flex size-7 items-center justify-center rounded-md border">
        <Icon className="text-muted-foreground size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-muted-foreground text-[0.625rem] font-semibold tracking-wide uppercase">
          {label}
        </dt>
        <dd className="truncate text-xs font-semibold" title={value || undefined}>
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
    <div className="w-full space-y-3">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl border bg-primary/5">
        <div className="relative flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar
              // Force remount when avatar_url flips — Radix caches the
              // loaded-image state and won't surface the fallback after a
              // mid-session delete without a fresh root.
              key={profile.avatar_url ?? "fallback"}
              className="ring-primary/20 ring-offset-background size-14 ring-2 ring-offset-2 sm:size-16"
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
                <h2 className="text-base font-semibold tracking-tight sm:text-lg">
                  {fullName}
                </h2>
                <Badge variant="primary-light" size="sm" className="text-xs">
                  {profile.platform_role}
                </Badge>
              </div>
              <div className="text-muted-foreground flex flex-col gap-1 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <span className="inline-flex items-center gap-1 truncate">
                  <Mail className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{profile.email}</span>
                </span>
                {user_info.telephone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3 shrink-0" aria-hidden="true" />
                    {user_info.telephone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            <Link href="/profile/setting">
              <Settings className="size-3.5" aria-hidden="true" />
              {t("editProfile")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Personal Information */}
      <section className="bg-card rounded-xl border">
        <header className="flex items-center gap-2 border-b px-2 py-2">
          <span className="bg-primary/10 flex size-7 items-center justify-center rounded-md">
            <User className="text-primary size-4" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-semibold">{t("personalInfo")}</h3>
        </header>
        <dl className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 lg:grid-cols-4">
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
        <section className="bg-card rounded-xl border">
          <header className="flex items-center gap-2 border-b px-2 py-2">
            <span className="bg-primary/10 flex size-7 items-center justify-center rounded-md">
              <IdCard className="text-primary size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold">{t("signature")}</h3>
          </header>
          <div className="flex min-h-20 items-center justify-center p-3">
            <img
              key={profile.signature_url}
              src={profile.signature_url}
              alt={t("signature")}
              className="max-h-28 max-w-full object-contain"
            />
          </div>
        </section>
      )}

      {/* Business Units */}
      <section className="bg-card rounded-xl border">
        <header className="flex items-center gap-2 border-b px-2 py-2">
          <span className="bg-primary/10 flex size-7 items-center justify-center rounded-md">
            <Building2 className="text-primary size-4" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-semibold">{t("businessUnits")}</h3>
        </header>
        <div className="p-2">
          {profile.business_unit.length > 0 && (
            <Tabs defaultValue={profile.business_unit[0].id}>
              <div className="mb-3">
                <TabsList className="w-full overflow-x-auto sm:w-auto">
                  {profile.business_unit.map((bu) => (
                    <TabsTrigger key={bu.id} value={bu.id} className="text-xs">
                      {bu.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {profile.business_unit.map((bu) => (
                <TabsContent key={bu.id} value={bu.id}>
                  <BUSection bu={bu} />
                </TabsContent>
              ))}
            </Tabs>
          )}
          {profile.business_unit.length === 0 && (
            <p className="text-muted-foreground py-2 text-center text-xs">
              {t("noBusinessUnits")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
