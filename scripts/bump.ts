import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { recordRelease } from "./changelog";

const LEVELS = ["patch", "minor", "major"] as const;
type Level = (typeof LEVELS)[number];

/**
 * ไฟล์ที่ประกอบเป็น release commit — `git add` รับเฉพาะลิสต์นี้ ไฟล์แปลกปลอมที่
 * โผล่มาระหว่าง guard กับ commit จึงติดเข้า release ไปด้วยไม่ได้
 */
const RELEASE_FILES = ["package.json", "changelog.json", "CHANGELOG.md"];

const RESTORE_HINT = `  กู้คืนด้วย: git restore --staged --worktree ${RELEASE_FILES.join(" ")}`;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function git(...args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return fail(`เรียก git ล้มเหลว: git ${args.join(" ")}`);
  }
}

/**
 * `git()` variant that returns `null` instead of exiting. Needed for checks
 * that can fail legitimately — e.g. `@{upstream}` when no upstream is
 * configured — where that failure must not abort the script. stderr is
 * suppressed (unlike `git()`): failing here is an expected path with its own
 * printed message, not an exceptional one worth showing git's raw error for.
 */
function tryGit(...args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * `git()` variant ที่คืน false แทนการ exit — ใช้กับขั้นตอนหลังจากเริ่มเขียนไฟล์แล้ว
 * ซึ่งความล้มเหลวแต่ละจุดมีวิธีกู้คืนคนละแบบ ต้องพิมพ์ให้ตรงจุดก่อนตาย
 */
function gitTry(...args: string[]): boolean {
  return spawnSync("git", args, { stdio: "inherit" }).status === 0;
}

/**
 * เขียนเวอร์ชันลง package.json แบบ in-place
 *
 * ตรวจรูปแบบก่อนเขียนเป็นด่านสุดท้าย ไม่ใช่ด่านแรก: ถ้ามีบั๊กที่ต้นทางส่งค่าที่ไม่ใช่
 * string มาถึงตรงนี้ `JSON.stringify` จะ **ทิ้งคีย์ version ทั้งคีย์เงียบ ๆ**
 * ได้ package.json ที่พังโดยไม่มี error ที่ไหนเลย
 */
function writePackageVersion(version: string): void {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`เวอร์ชันไม่ถูกรูปแบบ MAJOR.MINOR.PATCH: ${version}`);
  }
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as Record<
    string,
    unknown
  >;
  pkg.version = version;
  writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
}

/**
 * stage เฉพาะ RELEASE_FILES แล้ว commit ก่อน จึงค่อย tag — แยกเป็นสองหน้าต่างเพราะ
 * วิธีกู้คืนไม่เหมือนกัน: ก่อน commit สำเร็จคือคืนไฟล์ทิ้ง หลัง commit สำเร็จแล้ว
 * tag พังคือเลือกว่าจะ tag ต่อหรือถอย commit
 */
function commitAndTag(target: string): void {
  const tag = `v${target}`;
  if (
    !gitTry("add", ...RELEASE_FILES) ||
    !gitTry("commit", "-m", `chore(release): ${tag}`)
  ) {
    console.error("✗ commit ไม่สำเร็จ");
    console.error(RESTORE_HINT);
    process.exit(1);
  }
  if (
    !gitTry("tag", "-a", tag, "-m", tag) ||
    tryGit("tag", "--list", tag) !== tag
  ) {
    console.error(
      `✗ สร้าง tag ${tag} ไม่สำเร็จ — release commit ถูกสร้างไปแล้ว`,
    );
    console.error(`  ไปต่อ: git tag -a ${tag} -m "${tag}"`);
    console.error("  ถอย  : git reset --hard HEAD~1");
    process.exit(1);
  }
}

/** Pure. `null` when `current` is not MAJOR.MINOR.PATCH. */
function nextVersions(current: string): Record<Level, string> | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) return null;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]);
  return {
    patch: `${major}.${minor}.${patch + 1}`,
    minor: `${major}.${minor + 1}.0`,
    major: `${major + 1}.0.0`,
  };
}

function readVersion(): string {
  const raw = readFileSync("package.json", "utf8");
  let pkg: { version?: unknown };
  try {
    pkg = JSON.parse(raw) as { version?: unknown };
  } catch {
    return fail("package.json อ่านเป็น JSON ไม่ได้");
  }
  if (typeof pkg.version !== "string") fail("package.json ไม่มีฟิลด์ version");
  return pkg.version;
}

function parseLevelArg(): Level | null {
  // Annotated explicitly: `noUncheckedIndexedAccess` is off, so `process.argv[2]`
  // is plain `string` and comparing it to `undefined` is a TS2367 error.
  const arg: string | undefined = process.argv[2];
  if (arg === undefined) return null;
  const level = LEVELS.find((candidate) => candidate === arg);
  if (!level) fail("ระดับต้องเป็น patch|minor|major");
  return level;
}

async function promptLevel(
  current: string,
  next: Record<Level, string>,
): Promise<Level | null> {
  console.log("");
  console.log(`  current: ${current}`);
  console.log("  ? เลือกระดับ bump");
  console.log(`    1) patch  → ${next.patch}`);
  console.log(`    2) minor  → ${next.minor}`);
  console.log(`    3) major  → ${next.major}`);
  console.log("    q) ยกเลิก (หรือกด Enter)");

  const answers: Record<string, Level> = {
    "1": "patch",
    "2": "minor",
    "3": "major",
    patch: "patch",
    minor: "minor",
    major: "major",
  };

  // Async-iterated rather than rl.question(): with piped stdin readline buffers
  // every line at once, and a line emitted while no question() is pending is
  // dropped. Iterating queues them. Exhausting the iterator means EOF (Ctrl-D).
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    process.stdout.write("  > ");
    for await (const line of rl) {
      const input = line.trim().toLowerCase();
      if (input === "q" || input === "") return null;
      const level = answers[input];
      if (level) return level;
      console.log("  ✗ เลือก 1, 2, 3 หรือ q");
      process.stdout.write("  > ");
    }
    return null;
  } finally {
    rl.close();
  }
}

function assertBranchAndTree(): void {
  const branch = git("branch", "--show-current");
  if (branch !== "main") {
    fail(`build:bump ต้องรันบน main (ตอนนี้อยู่ ${branch || "detached HEAD"})`);
  }
  console.log("▸ branch ........... main ✓");

  const dirty = git("status", "--porcelain");
  if (dirty !== "") {
    console.error("✗ working tree ไม่สะอาด — commit หรือ stash ก่อน");
    console.error(dirty);
    process.exit(1);
  }
  console.log("▸ working tree ..... clean ✓");
}

/**
 * Uses only already-fetched remote-tracking refs — never runs `git fetch`.
 * No upstream configured is not an error and is skipped, not aborted. Being
 * *ahead* of upstream is normal and does not abort either. Being *behind*
 * means the tag would land on a commit that `git push` will reject as
 * non-fast-forward — and the intuitive fix, `git pull --rebase`, moves the
 * release commit out from under the already-created annotated tag. So this
 * runs before the prompt, alongside the other instant guards.
 */
function assertUpToDate(): void {
  const upstream = tryGit(
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{upstream}",
  );
  if (upstream === null) {
    console.log("▸ upstream ......... skip (ไม่มี upstream) ✓");
    return;
  }

  const behind = Number(git("rev-list", "--count", "HEAD..@{upstream}"));
  if (behind !== 0) {
    fail(`local อยู่หลัง ${upstream} ${behind} commit — git pull ก่อนรันซ้ำ`);
  }
  console.log(`▸ upstream ......... up to date (${upstream}) ✓`);
}

/**
 * Checks only the chosen version — an existing v0.1.1 must not block a minor
 * bump to v0.2.0. Runs before any write because `commitAndTag()` commits first
 * and tags second: on a tag collision it exits 1 having already committed the
 * bump, leaving a release commit with no tag.
 */
function assertTagFree(version: string): void {
  const tag = `v${version}`;
  if (git("tag", "--list", tag) !== "") fail(`tag ${tag} มีอยู่แล้ว`);
}

/**
 * Runs `bun run --silent <script>`, forwarding its output. Exits with its code
 * on failure. `--silent` suppresses bun's own `$ tsc --noEmit` echo line.
 *
 * A gate must never write a git-tracked file. The release commit is built from
 * an exact list of paths (`RELEASE_FILES`), so a gate that dirtied a tracked
 * file outside that list would not fail the release — it would silently leave
 * the file dirty in the tree afterwards; one inside the list would ride along
 * into the release commit. Today that is safe only because `tsconfig.json`'s
 * `"incremental": true` writes `tsconfig.tsbuildinfo`, which `.gitignore`
 * excludes.
 */
function gate(script: string, done: string): void {
  const result = spawnSync("bun", ["run", "--silent", script], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`✗ ${script} ไม่ผ่าน`);
    process.exit(result.status ?? 1);
  }
  console.log(done);
}

async function main(): Promise<void> {
  const current = readVersion();
  const next = nextVersions(current);
  if (!next) fail(`อ่านเวอร์ชันจาก package.json ไม่ได้: ${current}`);

  assertBranchAndTree();
  assertUpToDate();

  const level = parseLevelArg() ?? (await promptLevel(current, next));
  if (level === null) {
    console.log("ยกเลิก — ไม่มีอะไรเปลี่ยน");
    return;
  }

  const target = next[level];
  assertTagFree(target);

  gate("typecheck", "▸ typecheck ........ ✓");
  gate("lint", "▸ lint ............. ✓");
  gate("test:run", "▸ tests ............ ✓");

  // hash ตรงนี้คือ HEAD **ก่อน** release commit เพราะ changelog ต้องถูกเขียนก่อน
  // จึงจะ commit ได้ — ส่งเข้า recordRelease() ตรง ๆ เป็นฟิลด์ `commit` ของ entry
  // (ไม่ผ่านการ parse จาก fullVersion อีกต่อไป กัน format ของ fullVersion เปลี่ยนแล้ว
  // commit เพี้ยนไปเงียบ ๆ)
  const shortHash = git("rev-parse", "--short", "HEAD");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fullVersion = `${target}-build.${stamp}.${shortHash}`;

  try {
    writePackageVersion(target);
    recordRelease({ target, fullVersion, commit: shortHash });
  } catch (err) {
    console.error(`✗ เขียน package.json / changelog ไม่สำเร็จ: ${String(err)}`);
    console.error(RESTORE_HINT);
    process.exit(1);
  }

  commitAndTag(target);

  console.log(`✓ v${target}`);
  console.log(`  version  ${fullVersion}`);
  console.log(`  commit  chore(release): v${target}`);
  console.log(`  tag     v${target} (annotated)`);
  console.log("");
  console.log(
    `→ ขั้นต่อไป: git push origin main && git push origin v${target}`,
  );
}

await main();
