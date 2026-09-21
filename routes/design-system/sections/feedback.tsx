import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Filter,
  Download,
  Upload,
  RefreshCw,
  ChevronRight,
  Package,
  FileText,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ErrorState } from "@/components/ui/error-state";
import { DsSection, DsRow } from "../ds-kit";

const ICONS = [
  { Icon: Search, name: "Search" },
  { Icon: Plus, name: "Plus" },
  { Icon: Pencil, name: "Pencil" },
  { Icon: Trash2, name: "Trash2" },
  { Icon: Check, name: "Check" },
  { Icon: X, name: "X" },
  { Icon: Filter, name: "Filter" },
  { Icon: Download, name: "Download" },
  { Icon: Upload, name: "Upload" },
  { Icon: RefreshCw, name: "RefreshCw" },
  { Icon: ChevronRight, name: "ChevronRight" },
  { Icon: Package, name: "Package" },
  { Icon: FileText, name: "FileText" },
  { Icon: Inbox, name: "Inbox" },
];

export function FeedbackSection() {
  return (
    <>
      <DsSection
        id="loading"
        title="Loading"
        description={
          <>
            <code>Skeleton</code> ใช้เมื่อรู้รูปร่างของสิ่งที่กำลังจะมา ·{" "}
            <code>Spinner</code> ใช้เมื่อไม่รู้ หรือเมื่อรออยู่ในปุ่ม
          </>
        }
        usage={
          <>
            ทั้งคู่ถูก <b>ยกเว้น</b> จากกฎ <code>prefers-reduced-motion</code>{" "}
            โดยตั้งใจ — spinner ที่หยุดนิ่งอ่านเป็นคำขอที่ค้าง
          </>
        }
        code={`<Skeleton className="h-8 w-full" />
<Button size="sm" disabled><Spinner className="size-4" /> กำลังบันทึก</Button>`}
      >
        <DsRow label="Skeleton" hint="รู้รูปร่างปลายทาง">
          <div className="w-72 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </DsRow>
        <DsRow label="Spinner" hint="ไม่รู้ว่าจะได้อะไร">
          <Spinner />
          <Spinner className="size-4" />
          <Button size="sm" disabled>
            <Spinner className="size-4" /> กำลังบันทึก
          </Button>
        </DsRow>
      </DsSection>

      <DsSection
        id="empty-error"
        title="Empty & Error"
        description="สองสถานะที่หน้าลิสต์ทุกหน้าต้องมี — ว่างเพราะยังไม่มีข้อมูล กับพังเพราะเรียก API ไม่สำเร็จ ไม่ใช่เรื่องเดียวกัน"
        usage={
          <>
            <code>ErrorState</code> รับ <code>error</code> ดิบแล้วแปลเป็นข้อความ
            ตาม locale ให้เอง — <b>อย่าส่ง <code>message=&#123;error.message&#125;</code></b>{" "}
            เพราะนั่นคือสตริงอังกฤษที่ dev เขียน fallback ไว้ พนักงานหน้างาน
            อ่านไม่รู้เรื่อง · สีในสถานะ error ต้องมีสัญญาณเดียว (ไอคอนแดง
            กล่องกลาง ป้ายสีจาง)
          </>
        }
        code={`<ErrorState error={error} onRetry={refetch} />
<ErrorState notFoundMessage="ไม่พบใบขอซื้อ" backTo="/procurement/purchase-request" />`}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border-subtle p-3">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Inbox />
                </EmptyMedia>
                <EmptyTitle>ยังไม่มีใบขอซื้อ</EmptyTitle>
                <EmptyDescription>
                  สร้างใบแรกเพื่อเริ่มกระบวนการจัดซื้อ
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm">
                  <Plus /> สร้างใบขอซื้อ
                </Button>
              </EmptyContent>
            </Empty>
          </div>
          <div className="rounded-lg border border-border-subtle p-3">
            <ErrorState
              message="โหลดข้อมูลไม่สำเร็จ"
              onRetry={() => undefined}
            />
          </div>
        </div>
      </DsSection>

      <DsSection
        id="iconography"
        title="Iconography"
        description={
          <>
            <code>lucide-react</code> ทั้งแอป — ปุ่มบีบไอคอนให้เป็น{" "}
            <code>size-4</code> เองผ่าน{" "}
            <code>[&_svg:not([class*=size-])]:size-4</code> จึง{" "}
            <b>ไม่ต้องกำหนดขนาดไอคอนใน Button</b>
          </>
        }
        usage={
          <>
            ไอคอนเดี่ยวที่กดได้ต้องมี <code>aria-label</code> เสมอ ·
            อย่าผสมไลบรารีไอคอนอื่นเข้ามา เส้นหนาจะไม่ตรงกัน
          </>
        }
        code={`<Button size="icon-sm" variant="ghost" aria-label="ลบ">
  <Trash2 />
</Button>`}
      >
        <div className="flex flex-wrap gap-3">
          {ICONS.map(({ Icon, name }) => (
            <div
              key={name}
              className="flex w-24 flex-col items-center gap-1.5 rounded-md border border-border-subtle py-2.5"
            >
              <Icon className="size-4 text-foreground" />
              <span className="truncate text-micro-legal text-muted-foreground">
                {name}
              </span>
            </div>
          ))}
        </div>
      </DsSection>
    </>
  );
}
