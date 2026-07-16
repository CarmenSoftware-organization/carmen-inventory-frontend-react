import type { ComponentType, SVGProps } from "react";
import {
  Activity,
  BellRing,
  Calendar,
  Database,
  Folder,
  Gauge,
  Mail,
  Shield,
  Terminal,
  Users,
  Workflow,
} from "lucide-react";

export type LucideIcon = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string }
>;

export type VisualKey =
  | "roles"
  | "assign"
  | "period"
  | "workflows"
  | "docs"
  | "userActivity"
  | "monitor"
  | "email"
  | "notify"
  | "code"
  | "query"
  | "dataset";

export type ModuleDef = {
  readonly key: string;
  readonly visualKey: VisualKey;
  readonly href: string;
  readonly icon: LucideIcon;
};

export type ChapterDef = {
  readonly num: string;
  readonly key: "access" | "process" | "observe" | "config" | "data";
  readonly modules: readonly ModuleDef[];
};

export const CHAPTERS: readonly ChapterDef[] = [
  {
    num: "01",
    key: "access",
    modules: [
      {
        key: "roles",
        visualKey: "roles",
        href: "/system-admin/role",
        icon: Shield,
      },
      {
        key: "assign",
        visualKey: "assign",
        href: "/system-admin/user",
        icon: Users,
      },
    ],
  },
  {
    num: "02",
    key: "process",
    modules: [
      {
        key: "period",
        visualKey: "period",
        href: "/system-admin/period",
        icon: Calendar,
      },
      {
        key: "workflows",
        visualKey: "workflows",
        href: "/system-admin/workflow",
        icon: Workflow,
      },
      {
        key: "docs",
        visualKey: "docs",
        href: "/system-admin/document",
        icon: Folder,
      },
    ],
  },
  {
    num: "03",
    key: "observe",
    modules: [
      {
        key: "userActivity",
        visualKey: "userActivity",
        href: "/system-admin/user-activity",
        icon: Activity,
      },
      {
        key: "monitor",
        visualKey: "monitor",
        href: "/system-admin/activity-log",
        icon: Gauge,
      },
    ],
  },
  {
    num: "04",
    key: "config",
    modules: [
      {
        key: "email",
        visualKey: "email",
        href: "/system-admin/config-email",
        icon: Mail,
      },
      {
        key: "notifyTemplate",
        visualKey: "notify",
        href: "/system-admin/notification-template",
        icon: BellRing,
      },
      {
        key: "code",
        visualKey: "code",
        href: "/system-admin/running-code",
        icon: Terminal,
      },
    ],
  },
  {
    num: "05",
    key: "data",
    modules: [
      {
        key: "dataset",
        visualKey: "dataset",
        href: "/system-admin/dashboard-dataset",
        icon: Database,
      },
    ],
  },
];

export const KPI_KEYS = ["uptime", "users", "jobs", "health"] as const;
export type KpiKey = (typeof KPI_KEYS)[number];

export type TFn = (key: string) => string;
