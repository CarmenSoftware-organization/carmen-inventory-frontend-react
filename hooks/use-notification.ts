import { useEffect, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC, CACHE_NORMAL } from "@/lib/cache-config";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import { getRuntimeConfig } from "@/lib/runtime-config";
import type {
  Notification,
  NotificationListResponse,
  NotificationSource,
} from "@/types/notification";

/** แท็บของหน้ารายการ — กำหนด endpoint และ cache key ที่ใช้ */
export type NotificationTab = "all" | "unread";

const PAGE_SIZE = 20;
const POPOVER_SIZE = 10;

/**
 * คีย์ของรายการทุกตัวแตกจาก prefix `all` เดียวกัน WS จึง invalidate ครั้งเดียวสดทั้งหมด
 * แคชฝั่ง "ยังไม่อ่าน" ทั้งสองตัว (popover กับแท็บ) อยู่ใต้ `unreadAll` เพื่อให้
 * optimistic update ของ mark-read เขียนถึงพร้อมกันด้วยคำสั่งเดียว
 *
 * ข้อยกเว้น: `detail` อยู่คนละ prefix (`QUERY_KEYS.NOTIFICATION_DETAIL`) จึงไม่ถูก
 * invalidate ตามรายการ — ตั้งใจ เพราะเนื้อหาของแจ้งเตือนหนึ่งใบไม่เปลี่ยนหลังสร้าง
 * มีแต่ `is_read` ที่เปลี่ยน ซึ่ง dialog ไม่ได้แสดง
 */
export const notificationKeys = {
  all: [QUERY_KEYS.NOTIFICATIONS] as const,
  unreadAll: [QUERY_KEYS.NOTIFICATIONS, "unread"] as const,
  unreadPopover: (perpage: number) =>
    [QUERY_KEYS.NOTIFICATIONS, "unread", "popover", perpage] as const,
  list: (tab: NotificationTab) =>
    tab === "unread"
      ? ([QUERY_KEYS.NOTIFICATIONS, "unread", "list"] as const)
      : ([QUERY_KEYS.NOTIFICATIONS, "all", "list"] as const),
  detail: (id: string) => [QUERY_KEYS.NOTIFICATION_DETAIL, id] as const,
};

/**
 * อ่าน WS_URL จาก runtime config แบบ lazy — ห้ามอ่านระดับ module
 * (config ยังไม่โหลดตอน module evaluate เช่นใน unit test)
 */
const getWsUrl = (): string | undefined => {
  try {
    return getRuntimeConfig().WS_URL;
  } catch {
    return undefined;
  }
};

/**
 * ดึงรายการหนึ่งหน้าจาก endpoint ที่กำหนด แล้วทำซองให้เป็นรูปเดียวเสมอ
 * `paginate` เติมค่าตั้งต้นเมื่อ backend ไม่ส่งมา ส่วน `summary` ปล่อยเป็น undefined
 * ตามสัญญา — การไม่มีแปลว่า "สร้างค่าสรุปไม่ได้" ไม่ใช่ศูนย์
 *
 * @param url - endpoint ฐาน (`NOTIFICATIONS` หรือ `NOTIFICATIONS_UNREAD`)
 * @param page - เลขหน้าเริ่มที่ 1
 * @param perpage - จำนวนต่อหน้า (backend จำกัดไม่เกิน 100)
 * @returns ซองรายการที่ normalize แล้ว
 */
async function fetchNotificationPage(
  url: string,
  page: number,
  perpage: number,
): Promise<NotificationListResponse> {
  const res = await httpClient.get(`${url}?page=${page}&perpage=${perpage}`);
  if (!res.ok) {
    throw await ApiError.from(res, "Failed to load notifications");
  }
  const json = await res.json();
  const data: Notification[] = Array.isArray(json?.data) ? json.data : [];
  return {
    data,
    paginate: json?.paginate ?? {
      total: data.length,
      page,
      perpage,
      pages: 1,
    },
    summary: json?.summary,
  };
}

type InfiniteShape = { pages: NotificationListResponse[]; pageParams: unknown[] };

/** แยกแคชแบบ infinite ออกจากแคชหน้าเดียว — ทั้งสองอยู่ใต้ prefix `unreadAll` */
function isInfinite(value: unknown): value is InfiniteShape {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as InfiniteShape).pages)
  );
}

/** ตัดแถวตาม id ออกจากหนึ่งหน้า พร้อมลด total ให้สอดคล้อง */
function dropRows(
  page: NotificationListResponse,
  ids: Set<string> | "all",
): NotificationListResponse {
  const kept = ids === "all" ? [] : page.data.filter((n) => !ids.has(n.id));
  const removed = page.data.length - kept.length;
  return {
    ...page,
    data: kept,
    paginate: {
      ...page.paginate,
      total:
        ids === "all" ? 0 : Math.max(0, page.paginate.total - removed),
    },
  };
}

/**
 * เขียน optimistic ลงทุกแคชฝั่ง "ยังไม่อ่าน" — ครอบทั้งแคชหน้าเดียวของ popover
 * และแคช infinite ของแท็บยังไม่อ่าน แคชฝั่ง "ทั้งหมด" ไม่แตะ เพราะแถวยังอยู่ที่นั่น
 * (แค่เปลี่ยนเป็นอ่านแล้ว) และจะถูก invalidate ตามหลังอยู่แล้ว
 *
 * @param queryClient - client ปัจจุบัน
 * @param ids - เซตของ id ที่จะตัด หรือ "all" เพื่อล้างทั้งหมด
 */
function dropFromUnreadCaches(
  queryClient: QueryClient,
  ids: Set<string> | "all",
): void {
  queryClient.setQueriesData<unknown>(
    { queryKey: notificationKeys.unreadAll },
    (old: unknown) => {
      if (!old) return old;
      if (isInfinite(old)) {
        return { ...old, pages: old.pages.map((p) => dropRows(p, ids)) };
      }
      return dropRows(old as NotificationListResponse, ids);
    },
  );
}

/**
 * เชื่อม WebSocket เพื่อรับสัญญาณว่ามีการแจ้งเตือนใหม่ แล้ว invalidate ทั้งกลุ่ม
 * **hook นี้ไม่ถือรายการเอง** — payload บน WS มีไม่ครบ (ไม่มี created_at/is_read/source)
 * REST เป็นแหล่งความจริงเดียว ดึงใหม่แล้วได้ครบทุกฟิลด์และตัวเลขที่ตรงกันเสมอ
 * reconnect แบบ exponential backoff เพดาน 30 วินาที
 *
 * @param userId - id ผู้ใช้สำหรับ register กับ gateway (undefined = ไม่เชื่อมต่อ)
 * @returns สถานะการเชื่อมต่อ
 * @example
 * useNotificationRealtime(userId);
 */
export function useNotificationRealtime(userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const maybeWsUrl = getWsUrl();
    if (!userId || !maybeWsUrl) return;
    const wsUrl: string = maybeWsUrl;

    let unmounted = false;
    let activeWs: WebSocket | null = null;
    reconnectAttempt.current = 0;

    /** สร้างการเชื่อมต่อและผูก handler พร้อม reconnect */
    function connect() {
      const ws = new WebSocket(wsUrl);
      activeWs = ws;

      ws.onopen = () => {
        if (unmounted) {
          ws.close();
          return;
        }
        reconnectAttempt.current = 0;
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "register", user_id: userId }));
      };

      ws.onmessage = (event) => {
        let message: unknown;
        try {
          message = JSON.parse(event.data);
        } catch {
          return; // ignore malformed messages
        }
        if (
          message !== null &&
          typeof message === "object" &&
          (message as { type?: unknown }).type === "notification"
        ) {
          void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!unmounted) {
          const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30000);
          reconnectAttempt.current += 1;
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        // Connection will be retried via the onclose handler.
      };
    }

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer.current);
      activeWs?.close();
    };
  }, [userId, queryClient]);

  return { isConnected };
}

/**
 * รายการที่ยังไม่ได้อ่านสำหรับ popover บน navbar — คำขอเดียวได้ทั้งแถวที่จะแสดง
 * และเลข badge จาก `paginate.total` (จำนวนยังไม่อ่านทั้งหมด ไม่ใช่แค่หน้านี้)
 *
 * @param perpage - จำนวนแถวที่ popover แสดง
 * @returns แถว จำนวนรวม สถานะโหลด และ error
 * @example
 * const { notifications, unreadCount } = useUnreadNotifications();
 */
export function useUnreadNotifications(perpage: number = POPOVER_SIZE) {
  const query = useQuery<NotificationListResponse, ApiError>({
    queryKey: notificationKeys.unreadPopover(perpage),
    queryFn: () =>
      fetchNotificationPage(API_ENDPOINTS.NOTIFICATIONS_UNREAD, 1, perpage),
    ...CACHE_DYNAMIC,
  });
  return {
    notifications: query.data?.data ?? [],
    unreadCount: query.data?.paginate.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * รายการของหน้า `/notifications` แบบโหลดเพิ่มทีละหน้า
 * `tab="all"` → `GET /api/notifications` (มี `summary`)
 * `tab="unread"` → `GET /api/notifications/unread` (ไม่มี `summary` โดยตั้งใจ
 * เพราะจำนวนยังไม่อ่านเท่ากับ `paginate.total` ของ endpoint นั้นพอดี)
 *
 * @param tab - แท็บที่กำลังแสดง
 * @returns แถวที่ต่อกันทุกหน้า ตัวเลขรวม ค่าสรุป และตัวควบคุมการโหลดเพิ่ม
 * @example
 * const { items, total, summary, fetchNextPage, hasNextPage } = useNotificationsList("all");
 */
export function useNotificationsList(tab: NotificationTab) {
  const url =
    tab === "unread"
      ? API_ENDPOINTS.NOTIFICATIONS_UNREAD
      : API_ENDPOINTS.NOTIFICATIONS;
  const query = useInfiniteQuery<NotificationListResponse, ApiError>({
    queryKey: notificationKeys.list(tab),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchNotificationPage(url, pageParam as number, PAGE_SIZE),
    getNextPageParam: (last) =>
      last.paginate.page < last.paginate.pages
        ? last.paginate.page + 1
        : undefined,
    ...CACHE_DYNAMIC,
  });
  const pages = query.data?.pages ?? [];
  return {
    items: pages.flatMap((p) => p.data),
    total: pages[0]?.paginate.total ?? 0,
    summary: pages[0]?.summary,
    isLoading: query.isLoading,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
  };
}

/**
 * ทำเครื่องหมายว่าอ่านแล้วหนึ่งใบ — ต้องส่ง `source` ของแถวนั้นกลับไป
 * เพื่อให้ backend เขียนลงตารางที่ถูก (`broadcast` → tb_user_broadcast_action)
 * ไม่ส่ง = backend ถือว่า personal ซึ่งจะทำให้ประกาศกดอ่านไม่ติด
 *
 * @returns mutation ที่รับ `{ id, source }`
 * @example
 * const markRead = useMarkNotificationRead();
 * markRead.mutate({ id: n.id, source: n.source });
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    ApiError,
    { id: string; source?: NotificationSource },
    { previous: [readonly unknown[], unknown][] }
  >({
    mutationFn: async ({ id, source }) => {
      const res = await httpClient.put(
        API_ENDPOINTS.NOTIFICATION_MARK_READ(id),
        source ? { source } : undefined,
      );
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to mark notification as read");
      }
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadAll });
      const previous = queryClient.getQueriesData({
        queryKey: notificationKeys.unreadAll,
      });
      dropFromUnreadCaches(queryClient, new Set([id]));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * ทำเครื่องหมายว่าอ่านแล้วทั้งหมดของผู้ใช้ปัจจุบัน
 *
 * @returns mutation ที่ไม่รับ argument
 * @example
 * const markAll = useMarkAllNotificationsRead();
 * markAll.mutate();
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    ApiError,
    void,
    { previous: [readonly unknown[], unknown][] }
  >({
    mutationFn: async () => {
      const res = await httpClient.put(
        API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ,
      );
      if (!res.ok) {
        throw await ApiError.from(
          res,
          "Failed to mark all notifications as read",
        );
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadAll });
      const previous = queryClient.getQueriesData({
        queryKey: notificationKeys.unreadAll,
      });
      dropFromUnreadCaches(queryClient, "all");
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * รายละเอียดการแจ้งเตือนตาม id ผ่าน `GET /api/notifications/:id`
 * เปิด query เฉพาะเมื่อ id ไม่ว่าง — caller ส่ง null ได้ตอน dialog ปิด
 *
 * @param id - notification id (undefined/null = ปิด query)
 * @returns UseQueryResult ของ `Notification`
 * @example
 * const { data: detail, isLoading, error } = useNotificationDetail(detailId);
 */
export function useNotificationDetail(id: string | null | undefined) {
  return useQuery<Notification, ApiError>({
    queryKey: notificationKeys.detail(id ?? ""),
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.NOTIFICATION_BY_ID(id!));
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to load notification detail");
      }
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!id,
    ...CACHE_NORMAL,
  });
}
