import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { Users, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import EmptyComponent from "@/components/empty-component";
import { Input } from "@/components/ui/input";
import { useTranslations } from "use-intl";

interface UserTableRow {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  telephone: string;
}

interface UserTableProps {
  readonly users: UserTableRow[];
  readonly className?: string;
}

const HighlightText = ({
  text,
  query,
}: {
  readonly text: string;
  readonly query: string;
}) => {
  "use no memo";
  if (!text) return null;
  if (!query.trim()) return <>{text}</>;

  const escaped = query.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={`${i}-${part}`}
            className="rounded-sm bg-warning/30 text-foreground font-bold"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
};

export function UserTable({ users, className }: UserTableProps) {
  "use no memo";
  const t = useTranslations("common");
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const fullName = `${u.firstname} ${u.lastname}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.telephone ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const columns: ColumnDef<UserTableRow>[] = useMemo(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.index + 1}</span>
        ),
        size: 50,
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <HighlightText
            text={`${row.original.firstname} ${row.original.lastname}`}
            query={search}
          />
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            <HighlightText text={row.original.email} query={search} />
          </span>
        ),
      },
      {
        accessorKey: "telephone",
        header: "Telephone",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            <HighlightText text={row.original.telephone} query={search} />
          </span>
        ),
      },
    ],
    [search],
  );

  const table = useReactTable({
    data: filteredUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative w-96">
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          size={12}
        />
        <Input
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-6 pl-8 text-[10px]"
        />
      </div>
      <DataGrid
        table={table}
        recordCount={filteredUsers.length}
        emptyMessage={
          <EmptyComponent
            icon={Users}
            title={t("noData")}
            description={search ? t("noSearchResult") : t("noDataFound")}
          />
        }
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>
    </div>
  );
}
