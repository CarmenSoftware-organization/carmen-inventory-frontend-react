import data from "@/changelog.json";

export interface ChangeItem {
  scope: string | null;
  summary: string;
  hash: string;
  author: string;
  pr: number | null;
}

export interface VersionEntry {
  version: string;
  build: string;
  date: string;
  commit: string;
  note?: string;
  changes: {
    added: ChangeItem[];
    fixed: ChangeItem[];
    changed: ChangeItem[];
  };
}

export interface Changelog {
  current: string;
  generated_at: string;
  versions: VersionEntry[];
}

export const CHANGELOG = data as Changelog;

export const LATEST: VersionEntry = CHANGELOG.versions[0];

export const CURRENT_VERSION: string = CHANGELOG.current;
