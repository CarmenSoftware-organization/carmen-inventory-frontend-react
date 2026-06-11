
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Building2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProfile } from "@/hooks/use-profile";

export function MissingDepartmentDialog() {
  const { isSuccess, defaultBu, hasDepartment } = useProfile();
  const t = useTranslations("profileError");
  const [dismissedBuId, setDismissedBuId] = useState<string | null>(null);

  const shouldShow = isSuccess && !!defaultBu && !hasDepartment;
  const isDismissed = dismissedBuId !== null && dismissedBuId === defaultBu?.id;

  return (
    <AlertDialog open={shouldShow && !isDismissed}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Building2 className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-sm">
            {t("missingDepartmentTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("missingDepartmentDesc", { buName: defaultBu?.name ?? "" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex! justify-center">
          <AlertDialogAction
            size="sm"
            onClick={() => setDismissedBuId(defaultBu?.id ?? null)}
          >
            {t("close")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
