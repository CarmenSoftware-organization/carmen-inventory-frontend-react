
import {
  Children,
  createContext,
  HTMLAttributes,
  isValidElement,
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

import { cn } from "@/lib/utils"

// Types
type StepperOrientation = "horizontal" | "vertical"
type StepState = "active" | "completed" | "inactive" | "loading"
type StepIndicators = {
  active?: React.ReactNode
  completed?: React.ReactNode
  inactive?: React.ReactNode
  loading?: React.ReactNode
}

interface StepperContextValue {
  activeStep: number
  setActiveStep: (step: number) => void
  stepsCount: number
  orientation: StepperOrientation
  registerTrigger: (node: HTMLButtonElement) => void
  unregisterTrigger: (node: HTMLButtonElement) => void
  triggerNodes: HTMLButtonElement[]
  focusNext: (currentIdx: number) => void
  focusPrev: (currentIdx: number) => void
  focusFirst: () => void
  focusLast: () => void
  indicators: StepIndicators
}

interface StepItemContextValue {
  step: number
  state: StepState
  isDisabled: boolean
  isLoading: boolean
}

const StepperContext = createContext<StepperContextValue | undefined>(undefined)
const StepItemContext = createContext<StepItemContextValue | undefined>(
  undefined
)

/**
 * Hook เข้าถึง StepperContext ภายใน Stepper compound
 *
 * Throw error ถ้าถูกเรียกนอก <Stepper> ให้ sub-component เช่น StepperItem,
 * StepperTrigger ใช้อ่าน activeStep และควบคุม navigation
 *
 * @returns context { activeStep, setActiveStep, orientation, indicators, ... }
 * @example
 * ```tsx
 * const { activeStep } = useStepper();
 * ```
 */
function useStepper() {
  const ctx = useContext(StepperContext)
  if (!ctx) throw new Error("useStepper must be used within a Stepper")
  return ctx
}

/**
 * Hook เข้าถึง StepItemContext ของ StepperItem ปัจจุบัน
 *
 * Throw error ถ้าถูกเรียกนอก <StepperItem> ใช้โดย StepperTrigger,
 * StepperIndicator ฯลฯ เพื่ออ่าน state (active/completed/inactive/loading)
 *
 * @returns context { step, state, isDisabled, isLoading }
 * @example
 * ```tsx
 * const { state } = useStepItem();
 * ```
 */
function useStepItem() {
  const ctx = useContext(StepItemContext)
  if (!ctx) throw new Error("useStepItem must be used within a StepperItem")
  return ctx
}

interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: number
  value?: number
  onValueChange?: (value: number) => void
  orientation?: StepperOrientation
  indicators?: StepIndicators
}

/**
 * Root component ของ Stepper compound แสดง wizard/multi-step form
 *
 * จัดการ active step, keyboard navigation (arrow/home/end/enter/space),
 * orientation (horizontal/vertical) และ custom indicators ต่อ state
 * รองรับทั้ง controlled (value + onValueChange) และ uncontrolled
 * (defaultValue) role="tablist" เพื่อ a11y
 *
 * @param props - defaultValue, value, onValueChange, orientation, indicators, children
 * @returns JSX element ของ stepper พร้อม context provider
 * @example
 * ```tsx
 * <Stepper defaultValue={1}>
 *   <StepperNav>
 *     <StepperItem step={1}><StepperTrigger><StepperIndicator /></StepperTrigger></StepperItem>
 *   </StepperNav>
 *   <StepperPanel><StepperContent value={1}>Step 1 content</StepperContent></StepperPanel>
 * </Stepper>
 * ```
 */
function Stepper({
  defaultValue = 1,
  value,
  onValueChange,
  orientation = "horizontal",
  className,
  children,
  indicators = {},
  ...props
}: StepperProps) {
  const [activeStep, setActiveStep] = useState(defaultValue)
  const [triggerNodes, setTriggerNodes] = useState<HTMLButtonElement[]>([])

  const registerTrigger = useCallback((node: HTMLButtonElement) => {
    setTriggerNodes((prev) => (prev.includes(node) ? prev : [...prev, node]))
  }, [])

  const unregisterTrigger = useCallback((node: HTMLButtonElement) => {
    setTriggerNodes((prev) => prev.filter((n) => n !== node))
  }, [])

  const handleSetActiveStep = (step: number) => {
    if (value === undefined) setActiveStep(step)
    onValueChange?.(step)
  }

  const currentStep = value ?? activeStep

  const focusTrigger = (idx: number) => triggerNodes[idx]?.focus()
  const focusNext = (currentIdx: number) =>
    focusTrigger((currentIdx + 1) % triggerNodes.length)
  const focusPrev = (currentIdx: number) =>
    focusTrigger((currentIdx - 1 + triggerNodes.length) % triggerNodes.length)
  const focusFirst = () => focusTrigger(0)
  const focusLast = () => focusTrigger(triggerNodes.length - 1)

  const contextValue: StepperContextValue = {
    activeStep: currentStep,
    setActiveStep: handleSetActiveStep,
    stepsCount: Children.toArray(children).filter(
      (child): child is ReactElement =>
        isValidElement(child) &&
        (child.type as { displayName?: string }).displayName === "StepperItem"
    ).length,
    orientation,
    registerTrigger,
    unregisterTrigger,
    focusNext,
    focusPrev,
    focusFirst,
    focusLast,
    triggerNodes,
    indicators,
  }

  return (
    <StepperContext.Provider value={contextValue}>
      <div
        role="tablist"
        aria-orientation={orientation}
        data-slot="stepper"
        className={cn("w-full", className)}
        data-orientation={orientation}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  )
}

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number
  completed?: boolean
  disabled?: boolean
  loading?: boolean
}

/**
 * Stepper item แต่ละขั้นของ wizard
 *
 * คำนวณ state จาก activeStep ของ context:
 * - completed: step < activeStep หรือ prop completed=true
 * - active: step === activeStep
 * - inactive: step > activeStep
 * - loading: loading=true และ step === activeStep
 * Provide StepItemContext ให้ children ใช้
 *
 * @param props - step (required), completed, disabled, loading, children
 * @returns JSX element พร้อม context provider
 * @example
 * ```tsx
 * <StepperItem step={2}>
 *   <StepperTrigger>
 *     <StepperIndicator>2</StepperIndicator>
 *     <StepperTitle>Details</StepperTitle>
 *   </StepperTrigger>
 * </StepperItem>
 * ```
 */
function StepperItem({
  step,
  completed = false,
  disabled = false,
  loading = false,
  className,
  children,
  ...props
}: StepperItemProps) {
  const { activeStep } = useStepper()

  const state: StepState =
    completed || step < activeStep
      ? "completed"
      : activeStep === step
        ? "active"
        : "inactive"

  const isLoading = loading && step === activeStep

  return (
    <StepItemContext.Provider
      value={{ step, state, isDisabled: disabled, isLoading }}
    >
      <div
        data-slot="stepper-item"
        className={cn(
          "group/step flex items-center justify-center not-last:flex-1 group-data-[orientation=horizontal]/stepper-nav:flex-row group-data-[orientation=vertical]/stepper-nav:flex-col",
          className
        )}
        data-state={state}
        {...(isLoading ? { "data-loading": true } : {})}
        {...props}
      >
        {children}
      </div>
    </StepItemContext.Provider>
  )
}

interface StepperTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

/**
 * ปุ่ม trigger (role="tab") ของ StepperItem
 *
 * รองรับ keyboard navigation:
 * - ArrowRight/Down: focus next
 * - ArrowLeft/Up: focus prev (wrap)
 * - Home/End: focus first/last
 * - Enter/Space: activate step
 * auto register/unregister node ใน stepper context เพื่อจัดการ focus
 * รองรับ asChild สำหรับ render เป็น span (non-interactive)
 *
 * @param props - asChild, children, tabIndex และ props ของ button
 * @returns JSX element button หรือ span
 * @example
 * ```tsx
 * <StepperTrigger>
 *   <StepperIndicator />
 *   <StepperTitle>Review</StepperTitle>
 * </StepperTrigger>
 * ```
 */
function StepperTrigger({
  asChild = false,
  className,
  children,
  tabIndex,
  ...props
}: StepperTriggerProps) {
  const { state, isLoading, step, isDisabled } = useStepItem()
  const {
    setActiveStep,
    activeStep,
    registerTrigger,
    unregisterTrigger,
    triggerNodes,
    focusNext,
    focusPrev,
    focusFirst,
    focusLast,
  } = useStepper()

  const isSelected = activeStep === step
  const id = `stepper-tab-${step}`
  const panelId = `stepper-panel-${step}`

  // Use state instead of ref to avoid accessing .current during render
  const [btnNode, setBtnNode] = useState<HTMLButtonElement | null>(null)

  // stable ref to prevent infinite re-render loop
  const callbackRef = useCallback(
    (node: HTMLButtonElement | null) => setBtnNode(node),
    [],
  )

  useEffect(() => {
    if (!btnNode) return
    registerTrigger(btnNode)
    return () => unregisterTrigger(btnNode)
  }, [btnNode, registerTrigger, unregisterTrigger])

  const myIdx = triggerNodes.indexOf(btnNode!)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault()
        if (myIdx !== -1) focusNext(myIdx)
        break
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault()
        if (myIdx !== -1) focusPrev(myIdx)
        break
      case "Home":
        e.preventDefault()
        focusFirst()
        break
      case "End":
        e.preventDefault()
        focusLast()
        break
      case "Enter":
      case " ":
        e.preventDefault()
        setActiveStep(step)
        break
    }
  }

  if (asChild) {
    return (
      <span
        data-slot="stepper-trigger"
        data-state={state}
        className={className}
      >
        {children}
      </span>
    )
  }

  return (
    <button
      ref={callbackRef}
      role="tab"
      id={id}
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={typeof tabIndex === "number" ? tabIndex : isSelected ? 0 : -1}
      data-slot="stepper-trigger"
      data-state={state}
      data-loading={isLoading}
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 inline-flex cursor-pointer items-center outline-none focus-visible:z-10 focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-60",
        "gap-3 rounded-full",
        className
      )}
      onClick={() => setActiveStep(step)}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Visual indicator วงกลมแสดงสถานะของ StepperItem
 *
 * render custom content ตาม state (indicators.active/completed/inactive/
 * loading) ถ้าไม่ตั้งไว้ใช้ children แทน เปลี่ยนสี background เป็น primary
 * เมื่อ active/completed ด้วย data-state selector
 *
 * @param props - children (fallback content), className
 * @returns JSX element ของ indicator
 * @example
 * ```tsx
 * <StepperIndicator>1</StepperIndicator>
 * ```
 */
function StepperIndicator({
  children,
  className,
}: React.ComponentProps<"div">) {
  const { state, isLoading } = useStepItem()
  const { indicators } = useStepper()

  const indicator = isLoading
    ? indicators?.loading
    : state === "completed"
      ? indicators?.completed
      : state === "active"
        ? indicators?.active
        : indicators?.inactive

  return (
    <div
      data-slot="stepper-indicator"
      data-state={state}
      className={cn(
        "border-background bg-accent text-accent-foreground data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative flex size-6 shrink-0 items-center justify-center overflow-hidden",
        "rounded-full text-xs",
        className
      )}
    >
      <div className="absolute">{indicator ?? children}</div>
    </div>
  )
}

/**
 * เส้นแบ่งระหว่าง StepperItem ในแนว orientation
 *
 * Horizontal: h-0.5 flex-1, Vertical: w-0.5 h-12 สีตาม data-state ของ
 * item (active/completed เปลี่ยนสี primary)
 *
 * @param props - className
 * @returns JSX element ของ separator
 * @example
 * ```tsx
 * <StepperItem step={1}>...<StepperSeparator /></StepperItem>
 * ```
 */
function StepperSeparator({ className }: React.ComponentProps<"div">) {
  const { state } = useStepItem()

  return (
    <div
      data-slot="stepper-separator"
      data-state={state}
      className={cn(
        "bg-muted rounded-sm group-data-[orientation=horizontal]/stepper-nav:h-0.5 group-data-[orientation=vertical]/stepper-nav:h-12 group-data-[orientation=vertical]/stepper-nav:w-0.5 m-0.5 group-data-[orientation=horizontal]/stepper-nav:flex-1",
        className
      )}
    />
  )
}

/**
 * Title ของ StepperItem เป็น h3 สไตล์ text-sm font-semibold
 *
 * ใช้ภายใน StepperTrigger เพื่อเป็นชื่อขั้นตอน reflect state ผ่าน
 * data-state attribute
 *
 * @param props - children, className
 * @returns JSX element ของ title
 * @example
 * ```tsx
 * <StepperTitle>Basic Info</StepperTitle>
 * ```
 */
function StepperTitle({ children, className }: React.ComponentProps<"h3">) {
  const { state } = useStepItem()

  return (
    <h3
      data-slot="stepper-title"
      data-state={state}
      className={cn("text-sm leading-none font-semibold", className)}
    >
      {children}
    </h3>
  )
}

/**
 * Description ย่อยของ StepperItem (text-sm muted)
 *
 * ใช้ใต้ StepperTitle เพื่ออธิบายรายละเอียดของขั้นตอน
 *
 * @param props - children, className
 * @returns JSX element ของ description
 * @example
 * ```tsx
 * <StepperDescription>กรอกข้อมูลพื้นฐาน</StepperDescription>
 * ```
 */
function StepperDescription({
  children,
  className,
}: React.ComponentProps<"div">) {
  const { state } = useStepItem()

  return (
    <div
      data-slot="stepper-description"
      data-state={state}
      className={cn("text-muted-foreground text-sm", className)}
    >
      {children}
    </div>
  )
}

/**
 * Nav container (role="tablist") ของ stepper items
 *
 * จัด layout ของ StepperItem ตาม orientation จาก context ครอบทุก item
 * เพื่อเป็น tablist ของ ARIA
 *
 * @param props - children, className
 * @returns JSX element nav
 * @example
 * ```tsx
 * <StepperNav>
 *   <StepperItem step={1}>...</StepperItem>
 *   <StepperItem step={2}>...</StepperItem>
 * </StepperNav>
 * ```
 */
function StepperNav({ children, className }: React.ComponentProps<"nav">) {
  const { activeStep, orientation } = useStepper()

  return (
    <nav
      data-slot="stepper-nav"
      data-state={activeStep}
      data-orientation={orientation}
      className={cn(
        "group/stepper-nav inline-flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col",
        className
      )}
    >
      {children}
    </nav>
  )
}

/**
 * Panel wrapper เก็บ StepperContent ทั้งหมด
 *
 * render ใต้ StepperNav ทำหน้าที่เป็น container ของ content แต่ละ step
 * data-state reflect activeStep
 *
 * @param props - children, className
 * @returns JSX element panel
 * @example
 * ```tsx
 * <StepperPanel>
 *   <StepperContent value={1}>...</StepperContent>
 *   <StepperContent value={2}>...</StepperContent>
 * </StepperPanel>
 * ```
 */
function StepperPanel({ children, className }: React.ComponentProps<"div">) {
  const { activeStep } = useStepper()

  return (
    <div
      data-slot="stepper-panel"
      data-state={activeStep}
      className={cn("w-full", className)}
    >
      {children}
    </div>
  )
}

interface StepperContentProps extends React.ComponentProps<"div"> {
  value: number
  forceMount?: boolean
}

/**
 * Content ของ step หนึ่ง ๆ ใน StepperPanel
 *
 * render เฉพาะเมื่อ value === activeStep หรือ forceMount=true (กรณี
 * forceMount จะใช้ hidden attribute + class เพื่อซ่อนแต่ยัง mount อยู่
 * ใช้กับ form ที่ต้อง retain state ของแต่ละ step)
 *
 * @param props - value (step number), forceMount, children, className
 * @returns JSX element หรือ null เมื่อไม่ active และไม่ forceMount
 * @example
 * ```tsx
 * <StepperContent value={1} forceMount>
 *   <Step1Form />
 * </StepperContent>
 * ```
 */
function StepperContent({
  value,
  forceMount,
  children,
  className,
}: StepperContentProps) {
  const { activeStep } = useStepper()
  const isActive = value === activeStep

  if (!forceMount && !isActive) {
    return null
  }

  return (
    <div
      data-slot="stepper-content"
      data-state={activeStep}
      className={cn("w-full", className, !isActive && forceMount && "hidden")}
      hidden={!isActive && forceMount}
    >
      {children}
    </div>
  )
}

export {
  useStepper,
  useStepItem,
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperPanel,
  StepperContent,
  StepperNav,
  type StepperProps,
  type StepperItemProps,
  type StepperTriggerProps,
  type StepperContentProps,
}
