
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { profileQueryKey, useProfile } from "@/hooks/use-profile";
import { useSwitchBu } from "@/hooks/use-switch-bu";

function BuAvatar({
  avatarUrl,
  alt,
  isActive,
  eager,
}: {
  readonly avatarUrl: string | null | undefined;
  readonly alt: string;
  readonly isActive: boolean;
  /** Hint browser ว่ารูปนี้อยู่ above-the-fold (ใช้กับ navbar trigger only) */
  readonly eager?: boolean;
}) {
  return (
    <Avatar
      className={cn(
        "size-7 shrink-0 ring-2",
        isActive
          ? "ring-primary/20"
          : "ring-muted-foreground/15 group-hover/item:ring-primary/30",
      )}
    >
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={alt}
          className="object-cover"
          loading={eager ? "eager" : undefined}
          fetchPriority={eager ? "high" : undefined}
        />
      )}
      <AvatarFallback
        className={cn(
          "relative",
          isActive
            ? "from-primary to-primary/70 text-primary-foreground bg-linear-to-br"
            : "bg-muted/40 text-muted-foreground group-hover/item:bg-primary/5 group-hover/item:text-primary",
        )}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/20 to-transparent"
          />
        )}
        <Building2 className="relative size-3.5 shrink-0" />
      </AvatarFallback>
    </Avatar>
  );
}

export default function BuSwitcher() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError, defaultBu } = useProfile();
  const switchBuMutation = useSwitchBu();
  const [isSwitching, setIsSwitching] = useState(false);

  const departments = profile?.business_unit ?? [];
  const currentDept = defaultBu;

  if (isError) {
    return null;
  }

  if (isLoading || isSwitching || !currentDept) {
    return (
      <div
        className="flex h-8 items-center gap-2 rounded-lg border border-transparent px-2"
        aria-live="polite"
        aria-busy="true"
      >
        <Skeleton className="ring-primary/20 size-7 shrink-0 rounded-full ring-2" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="size-3 shrink-0 rounded-sm" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="group data-[state=open]:border-border/60 data-[state=open]:bg-muted/60 h-8 gap-2 rounded-lg border border-transparent px-2 text-xs font-medium hover:border-none hover:bg-none"
        >
          <BuAvatar
            avatarUrl={currentDept.avatar_url}
            alt={currentDept.name}
            isActive
            eager
          />
          <span className="hidden w-fit min-w-24 truncate text-left font-semibold sm:block">
            {currentDept.alias_name && `${currentDept.alias_name} -`}{" "}
            {currentDept.name}
          </span>
          <ChevronsUpDown className="size-3 opacity-50 transition-opacity group-hover:opacity-80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="min-w-64 p-1.5"
      >
        <div className="px-2 py-1.5">
          <p className="text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase">
            Business Unit
          </p>
        </div>
        {departments.map((bu) => {
          const isActive = bu.id === currentDept.id;
          return (
            <DropdownMenuItem
              key={bu.id}
              disabled={isActive}
              onClick={async () => {
                if (isActive) return;
                setIsSwitching(true);
                try {
                  await switchBuMutation.mutateAsync(bu.id);
                  await queryClient.refetchQueries({
                    queryKey: [...profileQueryKey],
                  });
                  toast.success(`Switched to ${bu.name}`);
                } catch {
                  toast.error("Failed to switch business unit");
                } finally {
                  setIsSwitching(false);
                }
              }}
              className="group/item relative gap-2.5 rounded-md p-2 data-disabled:opacity-100"
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="bg-primary absolute inset-y-2 left-0 w-0.5 rounded-full"
                />
              )}
              <BuAvatar
                avatarUrl={bu.avatar_url}
                alt={bu.name}
                isActive={isActive}
              />
              <div className="grid min-w-0 flex-1 text-xs leading-tight">
                <span className="truncate font-semibold">
                  {bu.alias_name && `${bu.alias_name} -`} {bu.name}
                </span>
                <span className="text-muted-foreground truncate text-[0.6875rem]">
                  {bu.config?.hotel?.name}
                </span>
              </div>
              {isActive && (
                <span className="bg-primary ml-auto inline-flex size-1.5 shrink-0 rounded-full" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
