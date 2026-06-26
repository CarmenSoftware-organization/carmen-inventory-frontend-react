
import { useState } from "react";
import Link from "@/lib/compat/link";
import { ChevronDown, KeyRound, LogOut, User } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMutating } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { useLogout } from "@/hooks/use-logout";
import { SWITCH_BU_MUTATION_KEY } from "@/hooks/use-switch-bu";
import ChangePasswordDialog from "@/routes/profile/_components/change-password-dialog";
import { formatName } from "@/lib/name";
import { cn } from "@/lib/utils";
import { LangSwitch } from "./lang-switch";
import { ThemeSwitch } from "./theme-switch";

function UserAvatar({
  avatarUrl,
  name,
  fallbackText,
  size,
  interactive,
  eager,
}: {
  readonly avatarUrl: string | null | undefined;
  readonly name: string;
  readonly fallbackText: string;
  readonly size: "sm" | "md";
  /** trigger context: hover/data-state ring transitions */
  readonly interactive?: boolean;
  /** above-the-fold: hint browser ว่า image นี้สำคัญ (LCP) */
  readonly eager?: boolean;
}) {
  const isLarge = size === "md";
  return (
    <Avatar
      key={avatarUrl ?? "fallback"}
      className={cn(
        "ring-primary/20 ring-2",
        isLarge ? "size-11" : "size-7",
        interactive &&
          "group-hover:ring-primary/40 group-data-[state=open]:ring-primary/50 transition-all",
      )}
    >
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={name}
          className="object-cover"
          loading={eager ? "eager" : undefined}
          fetchPriority={eager ? "high" : undefined}
        />
      )}
      <AvatarFallback
        className={cn(
          "bg-primary text-primary-foreground font-semibold",
          isLarge ? "text-sm" : "text-[0.625rem]",
        )}
      >
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
}

export function UserProfile() {
  const t = useTranslations("navbar");
  const tCommon = useTranslations("common");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const {
    data: profile,
    isLoading,
    isError,
    defaultBu,
    aliasName,
    avatarUrl,
  } = useProfile();
  const logoutMutation = useLogout();
  const isSwitchingBu =
    useIsMutating({ mutationKey: [...SWITCH_BU_MUTATION_KEY] }) > 0;

  if (isError) return null;

  if (isLoading || isSwitchingBu || !profile) {
    return (
      <div
        className="flex items-center gap-1.5 px-1.5 py-1"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="hidden items-center sm:grid" aria-hidden="true">
          <Skeleton className="mb-1 h-3 w-24" />
          <Skeleton className="ml-auto h-2.5 w-16" />
        </div>
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <span className="sr-only">{t("profile")}</span>
      </div>
    );
  }

  // มาถึงตรงนี้ profile guaranteed not null (เพิ่ง guard ไป)
  const name = `${profile.user_info.firstname} ${profile.user_info.lastname}`;
  const department = defaultBu?.department?.name ?? "";
  const convertName = formatName(
    profile.user_info.firstname,
    profile.user_info.lastname,
  );
  const fallbackText = aliasName ?? convertName;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group data-[state=open]:bg-muted/60 data-[state=open]:border-border/60 flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-1.5 py-1 text-right transition-colors outline-none hover:border-none hover:bg-none">
        <div className="hidden text-xs leading-tight sm:grid">
          <span className="w-content truncate font-semibold">{name}</span>
          <span
            className={`w-full truncate text-right text-[0.625rem] ${department ? "text-muted-foreground" : "text-warning"}`}
          >
            {department || t("noDepartment")}
          </span>
        </div>
        <UserAvatar
          avatarUrl={avatarUrl}
          name={name}
          fallbackText={fallbackText}
          size="sm"
          interactive
          eager
        />
        <ChevronDown
          className="size-3 shrink-0 opacity-50 transition-opacity group-hover:opacity-80 group-data-[state=open]:opacity-100"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-72 p-2" align="end" sideOffset={6}>
        <div className="flex items-start gap-3 px-2 py-2">
          <UserAvatar
            avatarUrl={avatarUrl}
            name={name}
            fallbackText={fallbackText}
            size="md"
          />
          <div className="grid min-w-0 flex-1 gap-0.5 leading-tight">
            <span className="truncate text-sm font-semibold">{name}</span>
            <span className="text-muted-foreground truncate text-[0.6875rem]">
              {profile.email}
            </span>
            <span
              className={`truncate text-[0.6875rem] ${department ? "text-muted-foreground" : "text-warning"}`}
            >
              {department || t("noDepartment")}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground px-2 pt-1 pb-0.5 text-[0.625rem] font-semibold tracking-wider uppercase">
          {t("sectionAccount")}
        </DropdownMenuLabel>
        <DropdownMenuItem
          asChild
          className="cursor-pointer gap-2 rounded-md px-2 py-2 text-sm"
        >
          <Link href="/profile">
            <User className="size-4" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-md px-2 py-2 text-sm"
          onClick={() => setPasswordOpen(true)}
        >
          <KeyRound className="size-4" />
          {t("changePassword")}
        </DropdownMenuItem>
        <DropdownMenuLabel className="text-muted-foreground px-2 pt-2 pb-0.5 text-[0.625rem] font-semibold tracking-wider uppercase">
          {t("sectionPreferences")}
        </DropdownMenuLabel>
        <LangSwitch />
        <ThemeSwitch />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2 rounded-md px-2 py-2 text-sm"
          onSelect={(e) => {
            e.preventDefault();
            setLogoutOpen(true);
          }}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="text-destructive size-4" />
          {logoutMutation.isPending ? t("loggingOut") : t("logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />

      <AlertDialog
        open={logoutOpen}
        onOpenChange={(o) => !logoutMutation.isPending && setLogoutOpen(o)}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <div className="flex items-start gap-3">
            <div className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-lg">
              <LogOut className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle className="text-base">
                {t("confirmLogoutTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t("confirmLogoutDesc")}
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={logoutMutation.isPending}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="default"
              onClick={(e) => {
                e.preventDefault();
                logoutMutation.mutate();
              }}
              disabled={logoutMutation.isPending}
            >
              <LogOut />
              {logoutMutation.isPending ? t("loggingOut") : t("logOut")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
