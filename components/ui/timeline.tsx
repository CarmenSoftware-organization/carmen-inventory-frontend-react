
import {
  createContext,
  HTMLAttributes,
  useCallback,
  useContext,
  useState,
} from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Types
type TimelineContextValue = {
  activeStep: number
  setActiveStep: (step: number) => void
}

// Context
const TimelineContext = createContext<TimelineContextValue | undefined>(
  undefined
)

/**
 * Hook เข้าถึง TimelineContext ภายใน Timeline compound component
 *
 * Throw error ถ้าถูกเรียกนอก <Timeline> เพื่อเตือนว่า sub-component
 * ต้องอยู่ในบริบทของ Timeline เสมอ
 *
 * @returns ค่า context { activeStep, setActiveStep }
 * @example
 * ```tsx
 * const { activeStep } = useTimeline();
 * ```
 */
const useTimeline = () => {
  const context = useContext(TimelineContext)
  if (!context) {
    throw new Error("useTimeline must be used within a Timeline")
  }
  return context
}

// Components
interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: number
  value?: number
  onValueChange?: (value: number) => void
  orientation?: "horizontal" | "vertical"
}

/**
 * Root component ของ Timeline compound แสดงลำดับเหตุการณ์/ขั้นตอน
 *
 * ใช้ในหน้า detail ของ PR/PO/GRN เพื่อแสดง audit trail/workflow
 * รองรับทั้ง controlled (value + onValueChange) และ uncontrolled
 * (defaultValue) orientation "vertical" (default) หรือ "horizontal"
 * state เก็บใน context เพื่อให้ TimelineItem ใช้คำนวณ completed
 *
 * @param props - defaultValue, value, onValueChange, orientation, children
 * @returns JSX element ของ timeline พร้อม context provider
 * @example
 * ```tsx
 * <Timeline defaultValue={2}>
 *   <TimelineItem step={1}><TimelineHeader>...</TimelineHeader></TimelineItem>
 *   <TimelineItem step={2}>...</TimelineItem>
 * </Timeline>
 * ```
 */
function Timeline({
  defaultValue = 1,
  value,
  onValueChange,
  orientation = "vertical",
  className,
  children,
  ...props
}: TimelineProps) {
  const [activeStep, setInternalStep] = useState(defaultValue)

  const setActiveStep = useCallback(
    (step: number) => {
      if (value === undefined) {
        setInternalStep(step)
      }
      onValueChange?.(step)
    },
    [value, onValueChange]
  )

  const currentStep = value ?? activeStep

  return (
    <TimelineContext.Provider
      value={{ activeStep: currentStep, setActiveStep }}
    >
      <div
        className={cn(
          "group/timeline flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col",
          className
        )}
        data-orientation={orientation}
        data-slot="timeline"
        {...props}
      >
        {children}
      </div>
    </TimelineContext.Provider>
  )
}

// TimelineContent
/**
 * Content section ของ TimelineItem (ข้อความรายละเอียด)
 *
 * สไตล์ text-sm text-muted-foreground วางใต้ TimelineHeader ภายใน
 * TimelineItem
 *
 * @param props - props ของ div
 * @returns JSX element ของ content
 * @example
 * ```tsx
 * <TimelineContent>Approved by John Doe</TimelineContent>
 * ```
 */
function TimelineContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="timeline-content"
      {...props}
    />
  )
}

// TimelineDate
interface TimelineDateProps extends HTMLAttributes<HTMLTimeElement> {
  asChild?: boolean
}

/**
 * แสดงวันที่ของ TimelineItem ใช้ <time> element เป็นค่า default
 *
 * รองรับ asChild เพื่อ render element อื่นผ่าน Radix Slot สไตล์ text-xs
 * font-medium สี muted-foreground
 *
 * @param props - asChild, children และ props ของ time
 * @returns JSX element ของวันที่
 * @example
 * ```tsx
 * <TimelineDate dateTime="2026-01-15">Jan 15, 2026</TimelineDate>
 * ```
 */
function TimelineDate({
  asChild = false,
  className,
  ...props
}: TimelineDateProps) {
  const Comp = asChild ? Slot.Root : "time"

  return (
    <Comp
      className={cn(
        "text-muted-foreground mb-1 block text-xs font-medium group-data-[orientation=vertical]/timeline:max-sm:h-4",
        className
      )}
      data-slot="timeline-date"
      {...props}
    />
  )
}

// TimelineHeader
/**
 * Header wrapper ของ TimelineItem สำหรับรวม Date + Title
 *
 * เป็น div เปล่าที่มี data-slot="timeline-header" สำหรับ style selector
 * และจัดเป็นกลุ่มของ header ภายในแต่ละ item
 *
 * @param props - props ของ div
 * @returns JSX element ของ header
 * @example
 * ```tsx
 * <TimelineHeader>
 *   <TimelineDate>Today</TimelineDate>
 *   <TimelineTitle>Submitted</TimelineTitle>
 * </TimelineHeader>
 * ```
 */
function TimelineHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} data-slot="timeline-header" {...props} />
  )
}

// TimelineIndicator
interface TimelineIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

/**
 * วงกลม indicator ของ TimelineItem แสดง state completed/active
 *
 * Absolute position แนบด้านซ้าย/ขวาของ item เปลี่ยนสี border เป็น primary
 * เมื่อ item นั้น completed (group-data selector) รองรับ asChild
 *
 * @param props - asChild, children, className และ props ของ div
 * @returns JSX element ของ indicator
 * @example
 * ```tsx
 * <TimelineItem step={1}>
 *   <TimelineIndicator />
 *   <TimelineHeader>...</TimelineHeader>
 * </TimelineItem>
 * ```
 */
function TimelineIndicator({
  asChild = false,
  className,
  children,
  ...props
}: TimelineIndicatorProps) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      aria-hidden="true"
      className={cn(
        "border-primary/20 group-data-completed/timeline-item:border-primary absolute size-4 rounded-full border-2 group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:left-0 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:top-0 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:-translate-x-1/2",
        className
      )}
      data-slot="timeline-indicator"
      {...props}
    >
      {children}
    </Comp>
  )
}

// TimelineItem
interface TimelineItemProps extends HTMLAttributes<HTMLDivElement> {
  step: number
}

/**
 * Timeline item แต่ละขั้นในลำดับเวลา
 *
 * คำนวณ completed state โดยเทียบ step กับ activeStep จาก context
 * (step <= activeStep = completed) auto-set data-completed attribute
 * เพื่อให้ TimelineIndicator/TimelineSeparator ของ item ถัดไปเปลี่ยนสี
 *
 * @param props - step (ลำดับ 1-based) และ props ของ div
 * @returns JSX element ของ item
 * @example
 * ```tsx
 * <TimelineItem step={1}>
 *   <TimelineIndicator />
 *   <TimelineHeader>...</TimelineHeader>
 *   <TimelineContent>...</TimelineContent>
 * </TimelineItem>
 * ```
 */
function TimelineItem({ step, className, ...props }: TimelineItemProps) {
  const { activeStep } = useTimeline()

  return (
    <div
      className={cn(
        "group/timeline-item has-[+[data-completed]]:**:data-[slot=timeline-separator]:bg-primary relative flex flex-1 flex-col gap-0.5 group-data-[orientation=horizontal]/timeline:mt-8 group-data-[orientation=horizontal]/timeline:not-last:pe-8 group-data-[orientation=vertical]/timeline:ms-8 group-data-[orientation=vertical]/timeline:not-last:pb-6",
        className
      )}
      data-completed={step <= activeStep || undefined}
      data-slot="timeline-item"
      {...props}
    />
  )
}

// TimelineSeparator
/**
 * เส้นเชื่อมระหว่าง TimelineItem
 *
 * Absolute position เปลี่ยนสีเป็น primary เมื่อ item ถัดไปมี data-completed
 * ซ่อนที่ item สุดท้ายด้วย :last-child selector
 *
 * @param props - props ของ div
 * @returns JSX element ของ separator
 * @example
 * ```tsx
 * <TimelineItem step={1}>
 *   <TimelineIndicator />
 *   <TimelineSeparator />
 *   ...
 * </TimelineItem>
 * ```
 */
function TimelineSeparator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-primary/10 absolute self-start group-last/timeline-item:hidden group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:h-0.5 group-data-[orientation=horizontal]/timeline:w-[calc(100%-1rem-0.25rem)] group-data-[orientation=horizontal]/timeline:translate-x-4.5 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:h-[calc(100%-1rem-0.25rem)] group-data-[orientation=vertical]/timeline:w-0.5 group-data-[orientation=vertical]/timeline:-translate-x-1/2 group-data-[orientation=vertical]/timeline:translate-y-4.5",
        className
      )}
      data-slot="timeline-separator"
      {...props}
    />
  )
}

// TimelineTitle
/**
 * Title ของ TimelineItem เป็น h3 สไตล์ text-sm font-medium
 *
 * ใช้ภายใน TimelineHeader เพื่อเป็นหัวข้อของเหตุการณ์
 *
 * @param props - props ของ h3
 * @returns JSX element ของ title
 * @example
 * ```tsx
 * <TimelineTitle>Approved</TimelineTitle>
 * ```
 */
function TimelineTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
    // heading content provided via children in {...props}; no jsx-a11y plugin in Vite eslint config
  return (
    <h3
      className={cn("text-sm font-medium", className)}
      data-slot="timeline-title"
      {...props}
    />
  )
}

export {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
}