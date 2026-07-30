/**
 * UI telemetry — ดัก click + page view ทั้งแอป, batch แล้วส่งเข้า POST /api/analytics-events
 *
 * กฎเหล็ก: analytics ห้ามทำแอปพัง — ทุกทางเข้า fail เงียบ ไม่มี error UI
 * ห้ามเก็บค่าจาก input/form (กัน PII) — เก็บเฉพาะ identity ของ element / path / label
 */
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { tokenStore } from "@/lib/auth/token-store";
import { httpClient } from "@/lib/http-client";
import { getSessionItem, setSessionItem } from "@/lib/safe-storage";

const SESSION_KEY = "carmen.analytics.session";
const FLUSH_THRESHOLD = 20;
const FLUSH_INTERVAL_MS = 10_000;
/** เพดานต่อ request — payload ของ keepalive fetch จำกัด ~64KB และ backend รับ ≤100 */
const MAX_BATCH_SIZE = 50;
/** เพดานคิวในหน่วยความจำ — เกินแล้วทิ้งของเก่าสุด */
const MAX_QUEUE_SIZE = 500;
const MAX_ID_LENGTH = 100;
const MAX_TEXT_LENGTH = 200;
const CLICKABLE_SELECTOR = '[data-track], button, a, [role="button"]';

type AnalyticsEventType = "click" | "page_view";

interface AnalyticsEvent {
  event_id: string;
  session_id: string;
  bu_code?: string;
  event_type: AnalyticsEventType;
  page_path: string;
  element_id?: string;
  element_text?: string;
  props?: Record<string, unknown>;
  client_ts: string;
}

let queue: AnalyticsEvent[] = [];
let currentBuCode: string | undefined;
let flushTimer: ReturnType<typeof setInterval> | undefined;
let started = false;
let flushing = false;

/** session ต่อแท็บ รอด reload (sessionStorage) — จบเมื่อปิดแท็บ */
function getSessionId(): string {
  let id = getSessionItem<string>(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    setSessionItem(SESSION_KEY, id);
  }
  return id;
}

/** ป้อน bu_code ปัจจุบันจาก React (AnalyticsBridge) — module นี้อ่าน TanStack Query เองไม่ได้ */
export function setAnalyticsBuCode(buCode: string | undefined): void {
  currentBuCode = buCode;
}

function enqueue(event_type: AnalyticsEventType, fields: Partial<AnalyticsEvent>): void {
  try {
    // เก็บเฉพาะหลัง login — event ก่อนมี token ทิ้ง (endpoint ต้องการ auth)
    if (!started || !tokenStore.get()) return;
    queue.push({
      event_id: crypto.randomUUID(),
      session_id: getSessionId(),
      bu_code: currentBuCode,
      event_type,
      page_path: fields.page_path ?? window.location.pathname,
      element_id: fields.element_id,
      element_text: fields.element_text,
      props: fields.props,
      client_ts: new Date().toISOString(),
    });
    if (queue.length > MAX_QUEUE_SIZE) queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
    if (queue.length >= FLUSH_THRESHOLD) void flush();
  } catch {
    // analytics ห้ามทำแอปพัง
  }
}

export function trackPageView(pathname: string, routePattern: string): void {
  enqueue("page_view", { page_path: pathname, props: { route_pattern: routePattern } });
}

/** identity ของ element: data-track → id → aria-label → text (ตัด 100 ตัวอักษร) */
function deriveElementId(el: HTMLElement): string | undefined {
  const explicit = el.dataset.track;
  if (explicit) return explicit.slice(0, MAX_ID_LENGTH);
  if (el.id) return el.id.slice(0, MAX_ID_LENGTH);
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.slice(0, MAX_ID_LENGTH);
  const text = (el.textContent ?? "").trim();
  return text ? text.slice(0, MAX_ID_LENGTH) : undefined;
}

/** เก็บเฉพาะ data-track-* extras (ไม่กวาด dataset ทั้งก้อน — กัน radix state/ข้อมูลไม่เกี่ยวปนเข้ามา) */
function collectTrackProps(el: HTMLElement): Record<string, unknown> | undefined {
  const entries = Object.entries(el.dataset).filter(([key]) => key !== "track" && key.startsWith("track"));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function handleDocumentClick(event: MouseEvent): void {
  try {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const el = target.closest<HTMLElement>(CLICKABLE_SELECTOR);
    if (!el) return;
    const text = (el.textContent ?? "").trim();
    enqueue("click", {
      element_id: deriveElementId(el),
      element_text: text ? text.slice(0, MAX_TEXT_LENGTH) : undefined,
      props: collectTrackProps(el),
    });
  } catch {
    // analytics ห้ามทำแอปพัง
  }
}

async function flush(useKeepalive = false): Promise<void> {
  if (flushing || queue.length === 0) return;
  if (!tokenStore.get()) {
    queue = [];
    return;
  }
  flushing = true;
  const batch = queue.slice(0, MAX_BATCH_SIZE);
  queue = queue.slice(batch.length);
  try {
    // ได้ response กลับมา (รวม 4xx/5xx): ถือว่าจบ — ทิ้ง batch ไม่ retry กัน storm
    await httpClient.post(
      API_ENDPOINTS.ANALYTICS_EVENTS,
      { events: batch },
      useKeepalive ? { keepalive: true } : undefined,
    );
  } catch {
    // network/timeout/client-rate-limit: คืน batch เข้าคิวรอรอบหน้า (cap คิวกันบวม)
    queue = batch.concat(queue).slice(0, MAX_QUEUE_SIZE);
  } finally {
    flushing = false;
  }
}

function handleVisibilityChange(): void {
  // แท็บกำลังหาย — flush ทันทีด้วย keepalive (fetch keepalive แนบ Bearer ได้ ต่างจาก sendBeacon)
  if (document.visibilityState === "hidden") void flush(true);
}

/** เริ่มดัก event — idempotent, เรียกจาก AnalyticsBridge ตอน mount (ใน ProtectedShell เท่านั้น) */
export function startAnalytics(): void {
  if (started) return;
  started = true;
  // capture phase — ให้ได้ event แม้ component ข้างในจะ stopPropagation
  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
}

export function stopAnalytics(): void {
  if (!started) return;
  started = false;
  document.removeEventListener("click", handleDocumentClick, true);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = undefined;
  void flush();
}

/**
 * แปลง pathname เป็น route pattern สำหรับ funnel ข้ามเอกสาร
 * เช่น ("/procurement/purchase-request/1a2b", {id:"1a2b"}) → "/procurement/purchase-request/:id"
 * เทียบทีละ segment เต็ม ๆ (ไม่ substring-replace) กันชนกรณีค่า param ไปพ้องกับ segment อื่น
 */
export function toRoutePattern(pathname: string, params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([key, value]) => key !== "*" && !!value);
  return pathname
    .split("/")
    .map((segment) => {
      const hit = entries.find(([, value]) => value === segment);
      return hit ? `:${hit[0]}` : segment;
    })
    .join("/");
}
