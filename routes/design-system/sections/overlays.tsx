import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DsSection, DsRow } from "../ds-kit";

export function OverlaysSection() {
  return (
    <>
      <DsSection
        id="card"
        title="Card"
        description={
          <>
            <code>rounded-xl</code> · เส้นขอบ 1px · <b>ไม่มีเงา</b> —
            การ์ดในลิสต์เป็น chrome ที่ต้องถอยให้ข้อมูล ไม่ใช่ของที่ลอย
          </>
        }
        code={`<Card>
  <CardHeader>
    <CardTitle>ใบขอซื้อ</CardTitle>
    <CardDescription>PR-2026-000142</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
</Card>`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>ใบขอซื้อ</CardTitle>
              <CardDescription>PR-2026-000142 · ครัวกลาง</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              12 รายการ · มูลค่ารวม 48,200.00
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm">เปิดดู</Button>
              <Button size="sm" variant="outline">
                ประวัติ
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ยอดคงเหลือ</CardTitle>
              <CardDescription>คลังหลัก</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                1,248
              </p>
              <p className="text-micro-legal text-muted-foreground">
                อัปเดตล่าสุด 08:12
              </p>
            </CardContent>
          </Card>
        </div>
      </DsSection>

      <DsSection
        id="overlays"
        title="Dialog · Dropdown · Tooltip"
        description="สามอย่างนี้คือของที่ลอยจริง จึงเป็นที่เดียวที่ใช้เงาได้"
        usage={
          <>
            <b>เมนูของ Radix ไม่ตอบสนองการคลิกด้วยพิกัด</b> เวลาทดสอบด้วย
            browser automation ต้องเรียก <code>.click()</code> ผ่าน JS
            ไม่งั้น <code>onClick</code> จะไม่ยิง
          </>
        }
        code={`<Dialog>
  <DialogTrigger asChild><Button variant="outline">เปิด</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>ยืนยันการลบ</DialogTitle>
      <DialogDescription>ลบแล้วกู้คืนไม่ได้</DialogDescription>
    </DialogHeader>
    <DialogFooter>…</DialogFooter>
  </DialogContent>
</Dialog>`}
      >
        <DsRow label="Dialog">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                เปิด dialog
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ยืนยันการลบ</DialogTitle>
                <DialogDescription>
                  ลบใบขอซื้อ PR-2026-000142 แล้วกู้คืนไม่ได้
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" size="sm">
                  ยกเลิก
                </Button>
                <Button variant="destructive" size="sm">
                  ลบ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DsRow>

        <DsRow label="DropdownMenu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="เมนู">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>การกระทำ</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Pencil /> แก้ไข
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <Trash2 /> ลบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DsRow>

        <DsRow label="Tooltip">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  ชี้ค้างที่ปุ่มนี้
                </Button>
              </TooltipTrigger>
              <TooltipContent>คำอธิบายสั้น ๆ ไม่เกินหนึ่งบรรทัด</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DsRow>
      </DsSection>

      <DsSection
        id="tabs"
        title="Tabs & Separator"
        description="แบ่งเนื้อหาในหน้าเดียว — ไม่ใช่สำหรับการนำทางข้ามหน้า"
      >
        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">รายการ</TabsTrigger>
            <TabsTrigger value="budget">งบประมาณ</TabsTrigger>
            <TabsTrigger value="history">ประวัติ</TabsTrigger>
          </TabsList>
          <TabsContent value="items" className="pt-3 text-sm">
            12 รายการในใบขอซื้อนี้
          </TabsContent>
          <TabsContent value="budget" className="pt-3 text-sm">
            ใช้ไป 48,200 จากงบ 120,000
          </TabsContent>
          <TabsContent value="history" className="pt-3 text-sm">
            แก้ไขล่าสุดโดย สมชาย · 08:12
          </TabsContent>
        </Tabs>
        <Separator className="my-4" />
        <p className="text-micro-legal text-muted-foreground">
          Separator — เส้นคั่นแนวนอน/แนวตั้งที่ใช้ <code>--border</code>
        </p>
      </DsSection>
    </>
  );
}
