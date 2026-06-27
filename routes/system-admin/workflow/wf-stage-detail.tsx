
import { useState } from "react";
import {
  useWatch,
  type UseFormReturn,
  type UseFieldArrayReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { User, Stage } from "@/types/workflows";
import type { WorkflowCreateModel } from "./wf-form-schema";
import { WfStageGeneral } from "./wf-stage-general";
import { WfStageNotifications } from "./wf-stage-notifications";
import { WfStageUsers } from "./wf-stage-users";

interface WfStageDetailProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly fieldArray: UseFieldArrayReturn<WorkflowCreateModel, "data.stages">;
  readonly index: number;
  readonly users: User[];
  readonly isDisabled: boolean;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}

export function WfStageDetail({
  form,
  fieldArray,
  index,
  users,
  isDisabled,
  isFirst,
  isLast,
}: WfStageDetailProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const isMiddle = !isFirst && !isLast;
  const t = useTranslations("systemAdmin.workflow");
  const tc = useTranslations("common");

  const watchedStage = useWatch({
    control: form.control,
    name: `data.stages.${index}`,
  }) as Stage | undefined;

  const isHod = watchedStage?.is_hod ?? false;
  const assignedUsers = watchedStage?.assigned_users ?? [];
  const assignedUserIds = new Set(assignedUsers.map((u) => u.user_id));

  const handleDeleteStage = () => {
    fieldArray.remove(index);
    setShowDeleteAlert(false);
  };

  if (isLast) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <CheckCircle2 className="text-success-foreground mb-2 size-8" />
        <p className="text-xs font-semibold">{t("completedStage")}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t("completedStageDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        {isMiddle && !isDisabled && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteAlert(true)}
            className="text-xs"
          >
            <Trash2 className="size-3" />
            {tc("delete")}
          </Button>
        )}
      </div>

      <Tabs defaultValue="general">
        <TabsList variant="line">
          <TabsTrigger value="general" className="text-xs">
            {t("general")}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">
            {t("notifications")}
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs">
            {t("assignedUsers")}
            {!isHod && assignedUsers.length > 0 && (
              <Badge
                variant="secondary"
                size="xs"
                className="ml-1.5 tabular-nums"
              >
                {assignedUsers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-2 pt-2">
          <WfStageGeneral
            form={form}
            index={index}
            isFirst={isFirst}
            isDisabled={isDisabled}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-2 pt-2">
          <WfStageNotifications
            form={form}
            index={index}
            isFirst={isFirst}
            isMiddle={isMiddle}
            isDisabled={isDisabled}
            watchedStage={watchedStage}
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-2 pt-2">
          <WfStageUsers
            form={form}
            index={index}
            users={users}
            isMiddle={isMiddle}
            isDisabled={isDisabled}
            isHod={isHod}
            assignedUserIds={assignedUserIds}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {t("deleteStage")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {t("deleteStageConfirm", { name: watchedStage?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">
              {tc("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStage}
              className="h-7 text-xs"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
