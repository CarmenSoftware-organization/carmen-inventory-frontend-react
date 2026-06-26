
import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

const Combobox = ComboboxPrimitive.Root

/**
 * แสดงค่าที่ถูกเลือกปัจจุบันของ Combobox
 *
 * Wrapper ของ ComboboxPrimitive.Value (base-ui) ติด data-slot
 * "combobox-value" สำหรับ style selector ใช้ภายใน ComboboxTrigger
 * หรือ standalone เพื่อแสดง label ของค่าที่เลือก
 *
 * @param props - props ของ Value primitive จาก base-ui
 * @returns JSX element แสดงค่าปัจจุบัน
 * @example
 * ```tsx
 * <ComboboxTrigger><ComboboxValue placeholder="Pick..." /></ComboboxTrigger>
 * ```
 */
function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

/**
 * Trigger button ของ Combobox พร้อมไอคอน ChevronDown
 *
 * Wrapper ของ ComboboxPrimitive.Trigger auto-inject ChevronDownIcon
 * ที่ท้ายปุ่มด้วยสี muted-foreground children มักเป็น ComboboxValue
 *
 * @param props - children และ props ของ Trigger primitive
 * @returns JSX element ของปุ่ม trigger
 * @example
 * ```tsx
 * <ComboboxTrigger>
 *   <ComboboxValue placeholder="Select" />
 * </ComboboxTrigger>
 * ```
 */
function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon
        data-slot="combobox-trigger-icon"
        className="text-muted-foreground pointer-events-none size-4"
      />
    </ComboboxPrimitive.Trigger>
  )
}

/**
 * ปุ่ม X สำหรับล้างค่าที่เลือกใน Combobox
 *
 * Render เป็น InputGroupButton ghost size icon-xs มี data-slot
 * "combobox-clear" เพื่อให้ trigger ซ่อนอัตโนมัติเมื่อมี clear button
 *
 * @param props - props ของ Clear primitive
 * @returns JSX element ของปุ่ม clear
 * @example
 * ```tsx
 * <ComboboxInput showClear showTrigger={false} />
 * ```
 */
function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  )
}

/**
 * ช่อง search input ของ Combobox ครอบด้วย InputGroup
 *
 * ย้าย ComboboxTrigger และ ComboboxClear เข้า addon align="inline-end"
 * Trigger จะซ่อนอัตโนมัติเมื่อมี Clear (CSS :has selector) เหมาะกับ
 * pattern search + select แบบ single value
 *
 * @param props - props ของ Input primitive + showTrigger, showClear flags
 * @returns JSX element ของ input group
 * @example
 * ```tsx
 * <Combobox items={items}>
 *   <ComboboxInput placeholder="Search..." showClear />
 *   <ComboboxContent><ComboboxList>...</ComboboxList></ComboboxContent>
 * </Combobox>
 * ```
 */
function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  return (
    <InputGroup className={cn("w-auto", className)}>
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            asChild
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          >
            <ComboboxTrigger />
          </InputGroupButton>
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  )
}

/**
 * Popup container ของ Combobox render ผ่าน Portal + Positioner
 *
 * จัดการ z-index, animation (fade + zoom + slide ตาม side), width ตาม
 * anchor-width และ max-height 24rem ปรับ side/align/offset ผ่าน props
 * ใช้ครอบ ComboboxList + ComboboxEmpty
 *
 * @param props - side, align, sideOffset, alignOffset, anchor และ props ของ Popup
 * @returns JSX element ของ popup
 * @example
 * ```tsx
 * <ComboboxContent side="bottom" align="start">
 *   <ComboboxList>{items.map(...)}</ComboboxList>
 * </ComboboxContent>
 * ```
 */
function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            "bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:border-input/30 group/combobox-content relative max-h-96 w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-md shadow-md ring-1 duration-100 data-[chips=true]:min-w-(--anchor-width) *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:shadow-none",
            className
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

/**
 * Scrollable list ภายใน ComboboxContent
 *
 * Max-height จำกัดโดย available-height ของ popover เพื่อให้ scroll อยู่
 * ภายใน viewport เสมอ รองรับ scroll-py-1 สำหรับ item highlight
 *
 * @param props - props ของ List primitive
 * @returns JSX element ของ list container
 * @example
 * ```tsx
 * <ComboboxList>{items.map((i) => <ComboboxItem key={i.id} value={i.id}>{i.name}</ComboboxItem>)}</ComboboxList>
 * ```
 */
function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "max-h-[min(calc(--spacing(96)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * รายการหนึ่งของ Combobox พร้อม check indicator เมื่อถูกเลือก
 *
 * รองรับ data-highlighted (highlight ขณะ keyboard navigation) และ
 * data-disabled auto-append CheckIcon ที่ขวาสุดเมื่อ value ถูกเลือก
 *
 * @param props - children และ props ของ Item primitive
 * @returns JSX element ของ item
 * @example
 * ```tsx
 * <ComboboxItem value="usd">USD</ComboboxItem>
 * ```
 */
function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        data-slot="combobox-item-indicator"
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none size-4 pointer-coarse:size-5" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

/**
 * Group wrapper สำหรับจัดกลุ่มรายการใน Combobox
 *
 * Wrapper ของ Group primitive ใช้คู่กับ ComboboxLabel สำหรับหัวข้อกลุ่ม
 *
 * @param props - props ของ Group primitive
 * @returns JSX element ของ group
 * @example
 * ```tsx
 * <ComboboxGroup>
 *   <ComboboxLabel>Fiat</ComboboxLabel>
 *   <ComboboxItem value="usd">USD</ComboboxItem>
 * </ComboboxGroup>
 * ```
 */
function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  )
}

/**
 * หัวข้อของ ComboboxGroup
 *
 * สไตล์ text-xs text-muted-foreground ปรับขยายเป็น text-sm บน touch device
 * ผ่าน pointer-coarse
 *
 * @param props - props ของ GroupLabel primitive
 * @returns JSX element ของ label
 * @example
 * ```tsx
 * <ComboboxLabel>Fiat Currencies</ComboboxLabel>
 * ```
 */
function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn(
        "text-muted-foreground px-2 py-1.5 text-xs pointer-coarse:px-3 pointer-coarse:py-2 pointer-coarse:text-sm",
        className
      )}
      {...props}
    />
  )
}

/**
 * Collection helper สำหรับ render items แบบ virtualized/dynamic
 *
 * Wrapper ของ Collection primitive ใช้เมื่อ items มาจาก data array
 * และต้องการให้ base-ui จัดการ rendering + virtualization ให้อัตโนมัติ
 *
 * @param props - props ของ Collection primitive (items, children render-prop)
 * @returns JSX element ของ collection
 * @example
 * ```tsx
 * <ComboboxCollection items={users}>
 *   {(u) => <ComboboxItem key={u.id} value={u.id}>{u.name}</ComboboxItem>}
 * </ComboboxCollection>
 * ```
 */
function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  )
}

/**
 * Empty state ของ Combobox เมื่อไม่มีผลลัพธ์จากการค้นหา
 *
 * แสดงเฉพาะเมื่อ content มี data-empty (group-data selector) จัดกลางหน้า
 * ด้วย text-muted-foreground ขนาด text-sm
 *
 * @param props - props ของ Empty primitive
 * @returns JSX element ของ empty state
 * @example
 * ```tsx
 * <ComboboxEmpty>No results found</ComboboxEmpty>
 * ```
 */
function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/combobox-content:flex",
        className
      )}
      {...props}
    />
  )
}

/**
 * เส้นแบ่งระหว่างกลุ่มรายการใน Combobox
 *
 * แสดงเป็น border 1px สี border ใช้คั่น ComboboxGroup หลาย ๆ กลุ่ม
 *
 * @param props - props ของ Separator primitive
 * @returns JSX element เส้นคั่น
 * @example
 * ```tsx
 * <ComboboxGroup>...</ComboboxGroup>
 * <ComboboxSeparator />
 * <ComboboxGroup>...</ComboboxGroup>
 * ```
 */
function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

/**
 * Container chips สำหรับ Combobox ที่เป็น multi-select
 *
 * render ค่าที่เลือกเป็น chips หลายอันในกล่องเดียว มี focus-within ring
 * ที่รวม chips + input เพื่อให้ดูเหมือน input ปกติ รองรับ aria-invalid
 * แสดง error border
 *
 * @param props - props ของ Chips primitive
 * @returns JSX element ของ chips container
 * @example
 * ```tsx
 * <ComboboxChips>
 *   <ComboboxChip>Tag A</ComboboxChip>
 *   <ComboboxChipsInput placeholder="Add..." />
 * </ComboboxChips>
 * ```
 */
function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        "dark:bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive dark:has-aria-invalid:border-destructive/50 flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-transparent bg-clip-padding px-2.5 py-1.5 text-sm transition-[color,box-shadow] focus-within:ring-2 has-aria-invalid:ring-2 has-data-[slot=combobox-chip]:px-1.5",
        className
      )}
      {...props}
    />
  )
}

/**
 * Chip หนึ่งตัวใน ComboboxChips แสดงค่าที่เลือก
 *
 * มีปุ่ม X remove (ซ่อนได้ผ่าน showRemove=false) รองรับ disabled state
 * ที่ทำให้ opacity ต่ำลงและ pointer-events ถูกปิด
 *
 * @param props - children, showRemove และ props ของ Chip primitive
 * @returns JSX element ของ chip
 * @example
 * ```tsx
 * <ComboboxChip>Purchase</ComboboxChip>
 * ```
 */
function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "bg-muted text-foreground flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0",
        className
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="-ml-1 opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <XIcon className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  )
}

/**
 * Input ขนาดเล็กภายใน ComboboxChips สำหรับพิมพ์เพิ่ม tag ใหม่
 *
 * ถอด border/outline ออก flex-1 เพื่อให้ขยายเต็มพื้นที่ที่เหลือหลัง chips
 *
 * @param props - props ของ Input primitive
 * @returns JSX element input
 * @example
 * ```tsx
 * <ComboboxChips>
 *   ...chips
 *   <ComboboxChipsInput placeholder="Add tag" />
 * </ComboboxChips>
 * ```
 */
function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn("min-w-16 flex-1 outline-none", className)}
      {...props}
    />
  )
}

/**
 * Hook สร้าง ref สำหรับใช้เป็น anchor ของ ComboboxContent
 *
 * ใช้เมื่อต้องการให้ popover อ้างอิงตำแหน่งจาก element อื่น (เช่น chips
 * container) แทนที่จะเป็น ComboboxInput ตามปกติ
 *
 * @returns MutableRefObject ของ HTMLDivElement
 * @example
 * ```tsx
 * const anchorRef = useComboboxAnchor();
 * <div ref={anchorRef}>...</div>
 * <ComboboxContent anchor={anchorRef.current} />
 * ```
 */
function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}
