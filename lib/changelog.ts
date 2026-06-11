import data from "@/changelog.json";

/** รายการเปลี่ยนแปลงหนึ่งรายการ (parse จาก conventional commit) */
export interface ChangeItem {
  scope: string | null;
  summary: string;
  hash: string;
  author: string;
  pr: number | null;
}

/** entry หนึ่งเวอร์ชันใน changelog */
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

/** โครงสร้างไฟล์ changelog.json ทั้งไฟล์ */
export interface Changelog {
  current: string;
  generated_at: string;
  versions: VersionEntry[];
}

/** ข้อมูล changelog ทั้งหมด (bundle จาก changelog.json ตอน build) */
export const CHANGELOG = data as Changelog;

/** entry เวอร์ชันล่าสุด (อยู่บนสุดของ versions) */
export const LATEST: VersionEntry = CHANGELOG.versions[0];

/** เลข semver ปัจจุบัน (ใช้เทียบ last-seen ใน What's New) */
export const CURRENT_VERSION: string = CHANGELOG.current;
