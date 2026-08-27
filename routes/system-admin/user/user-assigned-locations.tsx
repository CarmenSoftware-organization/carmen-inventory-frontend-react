import { lazy, Suspense, useMemo, useState, type ReactNode } from "react";
import { ListFilter, MapPin } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { HighlightText } from "@/components/ui/highlight-text";
import { lookupIcon } from "@/components/ui/status-icon-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchInput from "@/components/search-input";
import { LocationTypeLabel } from "@/components/ui/location-type-label";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TransferItem } from "@/components/ui/transfer";
import { INVENTORY_TYPE } from "@/constant/location";
import type { UserLocationItem } from "@/hooks/use-user";
import { AssignSection, EmptyState } from "./user-assigned-ui";

// แทน next/dynamic ด้วย React.lazy (code-split transfer chunk เหมือนเดิม)
const Transfer = lazy(() =>
  import("@/components/ui/transfer").then((m) => ({ default: m.Transfer })),
);

/* ------------------------------------------------------------------ */
/* Location type constants — local to this section                     */
/* ------------------------------------------------------------------ */

const LOCATION_TYPE_ORDER: INVENTORY_TYPE[] = [
  INVENTORY_TYPE.INVENTORY,
  INVENTORY_TYPE.CONSIGNMENT,
  INVENTORY_TYPE.DIRECT,
];

const LOCATION_TYPE_LABEL: Record<INVENTORY_TYPE, string> = {
  [INVENTORY_TYPE.INVENTORY]: "Inventory",
  [INVENTORY_TYPE.DIRECT]: "Direct",
  [INVENTORY_TYPE.CONSIGNMENT]: "Consignment",
};

/* ------------------------------------------------------------------ */
/* LocationsSection — view (grouped + filter) vs edit (Transfer)       */
/* ------------------------------------------------------------------ */

interface LocationsSectionProps {
  readonly isView: boolean;
  readonly isLoading: boolean;
  readonly isDisabled: boolean;
  readonly userLocations: UserLocationItem[];
  readonly locationSource: TransferItem[];
  readonly locationTargetKeys: string[];
  readonly onTargetKeysChange: (keys: string[]) => void;
  readonly transferLoading: boolean;
  readonly initialLocationCount: number;
}

export function LocationsSection({
  isView,
  isLoading,
  isDisabled,
  userLocations,
  locationSource,
  locationTargetKeys,
  onTargetKeysChange,
  transferLoading,
  initialLocationCount,
}: LocationsSectionProps) {
  const tu = useTranslations("systemAdmin.user");
  const tc = useTranslations("common");
  const [typeFilter, setTypeFilter] = useState<INVENTORY_TYPE | "all">("all");

  const groupedLocations = (() => {
    const m = new Map<INVENTORY_TYPE, UserLocationItem[]>();
    for (const loc of userLocations) {
      const arr = m.get(loc.location_type) ?? [];
      arr.push(loc);
      m.set(loc.location_type, arr);
    }
    return m;
  })();

  const locationCounts = {
    all: userLocations.length,
    [INVENTORY_TYPE.INVENTORY]:
      groupedLocations.get(INVENTORY_TYPE.INVENTORY)?.length ?? 0,
    [INVENTORY_TYPE.DIRECT]:
      groupedLocations.get(INVENTORY_TYPE.DIRECT)?.length ?? 0,
    [INVENTORY_TYPE.CONSIGNMENT]:
      groupedLocations.get(INVENTORY_TYPE.CONSIGNMENT)?.length ?? 0,
  };

  const visibleLocations =
    typeFilter === "all"
      ? userLocations
      : userLocations.filter((loc) => loc.location_type === typeFilter);

  // ตัวกรองชนิดคลังเป็น dropdown ตัวเดียว ไม่ใช่ชิปสี่อันเรียงกัน — สี่อันกินความ
  // กว้างจนแถวเดียวกับช่องค้นไม่พอบนจอแคบ และ dropdown บอกได้ในตัวว่าตอนนี้กรอง
  // อะไรอยู่โดยไม่ต้องไล่ดูว่าอันไหน active
  //
  // ใช้ **ไอคอน** ชุดเดียวกับ `LocationTypeLabel` ในตาราง (ผ่าน `lookupIcon`)
  // ไม่ใช่จุดสี — คนเลือกจาก dropdown แล้วเห็นไอคอนเดิมในคอลัมน์ประเภท โยงกันได้ทันที
  // และชนิดคลังเป็นคุณสมบัติ ไม่ใช่ความคืบหน้า จึงไม่ควรมีสีตั้งแต่แรก
  const filters =
    isView && userLocations.length > 0 ? (
      <Select
        value={typeFilter}
        onValueChange={(v) => setTypeFilter(v as INVENTORY_TYPE | "all")}
      >
        <SelectTrigger className="text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {/* ไอคอนกรองนำหน้าคำว่า "ทั้งหมด" — แถวนี้จะได้มีไอคอนเหมือนอีกสามแถว
              ที่เป็นชนิดคลัง ไม่ใช่แถวเดียวที่ตัวหนังสือเยื้องออกไป · ไม่ใส่จำนวน
              เพราะ "ทั้งหมด" คือค่าตั้งต้น ตัวเลขที่นี่ซ้ำกับ count ที่หัว section */}
          <SelectItem value="all">
            <span className="flex items-center gap-2">
              <ListFilter
                className="text-muted-foreground size-3.5 shrink-0"
                aria-hidden="true"
              />
              {tc("all")}
            </span>
          </SelectItem>
          {LOCATION_TYPE_ORDER.filter((t) => locationCounts[t] > 0).map((t) => {
            const Icon = lookupIcon(t)?.icon;
            return (
              <SelectItem key={t} value={t}>
                <span className="flex items-center gap-2">
                  {Icon && (
                    <Icon
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  {`${LOCATION_TYPE_LABEL[t]} (${locationCounts[t]})`}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    ) : undefined;

  return (
    <AssignSection
      wide
      title={tu("locationsTitle")}
      description={tu("locationsDesc")}
      count={isView ? initialLocationCount : locationTargetKeys.length}
    >
      {isView ? (
        <LocationsView
          isLoading={isLoading}
          userLocations={userLocations}
          visibleLocations={visibleLocations}
          filters={filters}
        />
      ) : (
        <Suspense fallback={null}>
          <Transfer
            dataSource={locationSource}
            targetKeys={locationTargetKeys}
            onChange={onTargetKeysChange}
            disabled={isDisabled}
            loading={transferLoading}
            titles={["Available Locations", "Assigned Locations"]}
          />
        </Suspense>
      )}
    </AssignSection>
  );
}

/* ------------------------------------------------------------------ */
/* LocationsView — sub-component to keep the parent cognitive          */
/* complexity below the SonarLint threshold                            */
/* ------------------------------------------------------------------ */

interface LocationsViewProps {
  readonly isLoading: boolean;
  /** ทั้งหมดที่ผูกกับผู้ใช้ — ใช้แยกว่า "ยังไม่ผูกเลย" กับ "กรองแล้วไม่เหลือ" */
  readonly userLocations: UserLocationItem[];
  /** เหลือหลังกรองตามชนิด — คือแถวที่แสดงจริง */
  readonly visibleLocations: UserLocationItem[];
  /** ชิปกรองตามชนิดคลัง — วางแถวเดียวกับช่องค้น */
  readonly filters?: ReactNode;
}

/**
 * ตารางคลังที่ผูกกับผู้ใช้ (โหมดดูอย่างเดียว)
 *
 * เดิมเป็นการ์ดรายแถวจัดกลุ่มตามชนิดคลัง พร้อมหัวกลุ่มและแถบสีซ้าย — ย้ายมาใช้
 * `DataGrid` ตัวเดียวกับตารางอื่นทั้งแอป ชนิดคลังจึงกลายเป็น **คอลัมน์** แทนการ
 * จัดกลุ่ม (ชิปกรองด้านบนยังกรองตามชนิดได้เหมือนเดิม) และใช้ `LocationTypeLabel`
 * ตัวเดียวกับหน้ารายการคลังกับแท็บคลังของสินค้า ข้อมูลเดียวกันจึงหน้าตาเดียวกันทุกที่
 */
function LocationsView({
  isLoading,
  userLocations,
  visibleLocations,
  filters,
}: LocationsViewProps) {
  "use no memo"; // TanStack table เป็น ref นิ่งแต่ mutate ตัวเอง — ดู routes/CLAUDE.md
  const tu = useTranslations("systemAdmin.user");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // กรองในหน่วยความจำ — คลังที่ผูกกับผู้ใช้คนหนึ่งมาทั้งก้อนอยู่แล้ว ไม่มี API
  // ให้ยิงต่อ · ค้นทั้งรหัสและชื่อ คนจำได้อย่างใดอย่างหนึ่ง
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleLocations;
    return visibleLocations.filter(
      (loc) =>
        loc.location_code.toLowerCase().includes(q) ||
        loc.location_name.toLowerCase().includes(q),
    );
  }, [visibleLocations, search]);

  const columns = useMemo<ColumnDef<UserLocationItem>[]>(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
        enableSorting: false,
        size: 32,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-muted-foreground",
        },
      },
      {
        // accessorKey ไม่ใช่แค่ id — sort ฝั่ง client ต้องมีค่าให้เทียบ ถ้ามีแต่
        // `cell` ตัว column จะไม่มีค่าอะไรเลยแล้วกดหัวคอลัมน์ก็ไม่ขยับ
        accessorKey: "location_code",
        id: "location_code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tfl("code")} />
        ),
        size: 120,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            <HighlightText text={row.original.location_code} query={search} />
          </span>
        ),
      },
      {
        accessorKey: "location_name",
        id: "location_name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tfl("name")} />
        ),
        size: 260,
        // ยังไม่ทำเป็นลิงก์ไป /config/location/:id — คนที่ดูหน้า user ไม่จำเป็นต้องมี
        // สิทธิ์เปิดหน้าตั้งค่าคลัง ต้องเช็ค permission ก่อนถึงจะให้กดได้
        cell: ({ row }) => (
          <span className="font-medium">
            <HighlightText text={row.original.location_name} query={search} />
          </span>
        ),
      },
      {
        accessorKey: "location_type",
        id: "location_type",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title={tfl("locationType")}
            className="justify-center"
          />
        ),
        size: 140,
        cell: ({ row }) => (
          <LocationTypeLabel type={row.original.location_type} />
        ),
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
      {
        accessorKey: "is_active",
        id: "status",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title={tfl("status")}
            className="justify-center"
          />
        ),
        size: 110,
        cell: ({ row }) => <StatusBadge active={row.original.is_active} />,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
    ],
    [tfl, search],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    // เรียงฝั่ง client ล้วน — ข้อมูลมาทั้งก้อนแล้ว ไม่ต้องยิงกลับไปเรียงที่ backend
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.location_id,
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          defaultValue={search}
          containerClassName="w-full sm:w-64"
          inputClassName="h-8 placeholder:text-xs"
          onInputChange={setSearch}
          onSearch={setSearch}
        />
        {filters && <div className="sm:ms-auto">{filters}</div>}
      </div>
      <DataGrid
        table={table}
        recordCount={rows.length}
        isLoading={isLoading}
        emptyMessage={
          // ยังไม่ผูกคลังเลย กับ กรองแล้วไม่เหลือ แก้คนละวิธี — ข้อความจึงต้องต่างกัน
          userLocations.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title={tu("noLocationsAssigned")}
              desc={tu("noLocationsAssignedDesc")}
            />
          ) : (
            <EmptyState
              icon={MapPin}
              title={tu("noLocationsMatchFilter")}
              desc={tu("noLocationsMatchFilterDesc")}
            />
          )
        }
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>
    </div>
  );
}
