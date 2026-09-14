import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** Tooltip provider ครอบ root เพื่อ share delayDuration (shadcn) */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

/** Tooltip root (shadcn) */
function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

/** Tooltip trigger (shadcn) */
function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/**
 * Tooltip content container พร้อม arrow
 *
 * **พื้นเป็นการ์ดสีเดียวกับธีม ไม่ใช่ป้ายกลับสีตาม shadcn ต้นฉบับ** — ของเดิมเป็น
 * `bg-foreground text-background` (โหมดสว่าง = ป้ายดำ) ซึ่งใช้ได้กับ tooltip คำเดียว
 * แต่ในแอปนี้ครึ่งหนึ่งของ tooltip เป็นการ์ดหลายบรรทัดที่มีลิงก์/ตัวเลข/สีสถานะ
 * อยู่ข้างใน สีพวกนั้นคำนวณมาสำหรับพื้นสว่าง วางบนพื้นดำแล้วอ่านไม่ออก จุดที่รู้ตัว
 * จึง override เป็น popover กันเองทีละจุดจนหน้าตา tooltip ในหน้าเดียวกันไม่ตรงกัน
 * ย้ายมาเป็นค่าเริ่มต้นที่นี่ที่เดียว ปลายทางเลย override ทิ้งได้หมด
 */
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-lg border px-3 py-2 text-xs text-balance shadow-md",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-popover text-border z-50" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
