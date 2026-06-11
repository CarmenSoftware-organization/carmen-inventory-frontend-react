
import { useTranslations } from "use-intl";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { FieldLabel } from "@/components/ui/field";
import { PrFilterStatus } from "./pr-filter-status";
import { FilterDate } from "@/components/filter/filter-date";
import { FilterDepartment } from "@/components/filter/filter-department";
import { FilterRequester } from "@/components/filter/filter-requester";
import { FilterStage } from "@/components/filter/filter-stage";
import { FilterWorkflow } from "@/components/filter/filter-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";

interface PrFilterSheetProps {
  readonly filter: string;
  readonly onFilterChange: (filter: string) => void;
  readonly stage: string;
  readonly onStageChange: (stage: string) => void;
  readonly stages?: string[];
  readonly requesterId: string;
  readonly onRequesterIdChange: (requesterId: string) => void;
  readonly departmentId: string;
  readonly onDepartmentIdChange: (departmentId: string) => void;
  readonly workflowId: string;
  readonly onWorkflowIdChange: (value: string) => void;
  readonly prDate: string;
  readonly onPrDateChange: (value: string) => void;
  readonly viewMode?: "my-pending" | "all-document";
  readonly onViewModeChange?: (mode: "my-pending" | "all-document") => void;
}

/**
 * แผง Sheet รวมตัวกรองของรายการใบขอซื้อ ครอบคลุม view mode (my pending /
 * all document), วันที่สร้างเอกสาร, สถานะเอกสาร, stage ของ workflow, workflow,
 * department และ requester ใช้บนหน้า list ของ PR เพื่อซ่อนตัวกรองที่มีจำนวนมาก
 * ไว้ใน sheet (โดยเฉพาะบนมือถือ) และ toggle view mode ปรากฏเฉพาะจอมือถือ
 * @param props - คุณสมบัติของ sheet
 * @param props.filter - ค่าตัวกรองสถานะเอกสารปัจจุบัน
 * @param props.onFilterChange - callback เปลี่ยนค่าตัวกรองสถานะ
 * @param props.stage - ค่า stage ที่เลือก
 * @param props.onStageChange - callback เปลี่ยนค่า stage
 * @param props.stages - รายการชื่อ stage ทั้งหมดให้เลือก
 * @param props.requesterId - id ผู้ร้องขอที่เลือก
 * @param props.onRequesterIdChange - callback เปลี่ยนค่า requester
 * @param props.departmentId - id แผนกที่เลือก
 * @param props.onDepartmentIdChange - callback เปลี่ยนค่า department
 * @param props.workflowId - id ของ workflow ที่เลือก
 * @param props.onWorkflowIdChange - callback เปลี่ยนค่า workflow
 * @param props.prDate - ช่วงวันที่ของ PR (รูปแบบ filter-date)
 * @param props.onPrDateChange - callback เปลี่ยนช่วงวันที่
 * @param props.viewMode - view mode ปัจจุบัน (my-pending | all-document)
 * @param props.onViewModeChange - callback สลับ view mode (มือถือเท่านั้น)
 * @returns React element ของ Sheet ตัวกรอง PR พร้อมปุ่ม trigger
 * @example
 * <PrFilterSheet
 *   filter={filter} onFilterChange={setFilter}
 *   stage={stage} onStageChange={setStage}
 *   stages={stages}
 *   requesterId={requesterId} onRequesterIdChange={setRequesterId}
 *   departmentId={deptId} onDepartmentIdChange={setDeptId}
 *   workflowId={wfId} onWorkflowIdChange={setWfId}
 *   prDate={prDate} onPrDateChange={setPrDate}
 *   viewMode="my-pending" onViewModeChange={setViewMode}
 * />
 */
export function PrFilterSheet({
  filter,
  onFilterChange,
  stage,
  onStageChange,
  stages,
  requesterId,
  onRequesterIdChange,
  departmentId,
  onDepartmentIdChange,
  workflowId,
  onWorkflowIdChange,
  prDate,
  onPrDateChange,
  viewMode,
  onViewModeChange,
}: PrFilterSheetProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Filter aria-hidden="true" />
          {tc("filter")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96">
        <SheetHeader className="animate-fade-in-left">
          <SheetTitle>{tc("filter")}</SheetTitle>
          <SheetDescription>{t("filterDescription")}</SheetDescription>
        </SheetHeader>
        <div className="animate-fade-in-left space-y-4 px-4 [animation-delay:75ms]">
          {viewMode && onViewModeChange && (
            <>
              <div className="space-y-1.5 sm:hidden">
                <FieldLabel className="text-xs">View</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={viewMode === "my-pending" ? "default" : "outline"}
                    onClick={() => onViewModeChange("my-pending")}
                  >
                    {t("myPending")}
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      viewMode === "all-document" ? "default" : "outline"
                    }
                    onClick={() => onViewModeChange("all-document")}
                  >
                    {t("allDocuments")}
                  </Button>
                </div>
              </div>
              <Separator className="sm:hidden" />
            </>
          )}
          <div className="space-y-1.5">
            <FieldLabel className="text-xs">{tfl("prDate")}</FieldLabel>
            <FilterDate value={prDate} onChange={onPrDateChange} />
          </div>
          <Separator />

          {/* Document status */}
          <div className="space-y-1.5">
            <FieldLabel className="text-xs">{tc("status")}</FieldLabel>
            <PrFilterStatus
              value={filter}
              onChange={onFilterChange}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel className="text-xs">{t("stage")}</FieldLabel>
            <FilterStage
              value={stage}
              onChange={onStageChange}
              stages={stages ?? []}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Workflow & Organization */}
          <div className="space-y-1.5">
            <FieldLabel className="text-xs">{tfl("workflow")}</FieldLabel>
            <FilterWorkflow
              value={workflowId}
              onChange={onWorkflowIdChange}
              workflowType={WORKFLOW_TYPE.PR}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel className="text-xs">{tfl("department")}</FieldLabel>
            <FilterDepartment
              value={departmentId}
              onChange={onDepartmentIdChange}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel className="text-xs">{tc("requester")}</FieldLabel>
            <FilterRequester
              value={requesterId}
              onChange={onRequesterIdChange}
              className="w-full"
            />
          </div>

          {/* Date */}
        </div>
      </SheetContent>
    </Sheet>
  );
}
