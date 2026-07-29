
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC, CACHE_NORMAL } from "@/lib/cache-config";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import type { Notification } from "@/types/notification";
import { getRuntimeConfig } from "@/lib/runtime-config";

/**
 * อ่าน WS_URL จาก runtime config แบบ lazy — ห้ามอ่านระดับ module
 * (config ยังไม่โหลดตอน module evaluate; เดิมคือ process.env.NEXT_PUBLIC_WS_URL
 * ซึ่งไม่มีในเบราว์เซอร์และทำให้ boot พังทั้งแอป)
 */
const getWsUrl = (): string | undefined => {
  try {
    return getRuntimeConfig().WS_URL;
  } catch {
    return undefined; // config ยังไม่โหลด (เช่นใน unit tests) — ปิด real-time
  }
};

/**
 * Hook เชื่อมต่อ WebSocket เพื่อรับ notification แบบ real-time
 * รองรับ reconnect อัตโนมัติแบบ exponential backoff (สูงสุด 30 วินาที)
 * ฟัง custom event "notification-sent" เพื่ออัปเดตรายการ; mark as read (เดี่ยว/ทั้งหมด) ยิงผ่าน REST (PUT)
 * @param userId - id ของผู้ใช้สำหรับ register กับ WebSocket
 * @returns object ประกอบด้วย isConnected, notifications, markAsRead และ markAllAsRead
 * @example
 * const { notifications, isConnected, markAsRead, markAllAsRead } = useNotification(user?.id);
 */
export function useNotification(userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleNotificationSent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        setNotifications((prev) => [customEvent.detail, ...prev]);
      }
    };

    window.addEventListener("notification-sent", handleNotificationSent);

    return () => {
      window.removeEventListener("notification-sent", handleNotificationSent);
    };
  }, []);

  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const maybeWsUrl = getWsUrl();
    if (!userId || !maybeWsUrl) return;
    const wsUrl: string = maybeWsUrl; // narrow ก่อนใช้ใน hoisted connect()

    let unmounted = false;
    let activeWs: WebSocket | null = null;
    reconnectAttempt.current = 0;

    /**
     * สร้างการเชื่อมต่อ WebSocket และผูก event handler พร้อม reconnect logic
     */
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
        try {
          const message = JSON.parse(event.data);
          if (message.type === "notification") {
            setNotifications((prev) => [message.data, ...prev]);
          }
        } catch {
          // ignore malformed messages
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
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    const target = notifications.find((n) => n.id === notificationId);
    if (!target) return;
    const snapshot = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId)); // optimistic
    try {
      const res = await httpClient.put(
        API_ENDPOINTS.NOTIFICATION_MARK_READ(notificationId),
        { category: target.category },
      );
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to mark notification as read");
      }
    } catch (err) {
      setNotifications(snapshot); // rollback
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to mark notification as read",
      );
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    const snapshot = notifications;
    setNotifications([]); // optimistic clear
    try {
      const res = await httpClient.put(
        API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ,
      );
      if (!res.ok) {
        throw await ApiError.from(
          res,
          "Failed to mark all notifications as read",
        );
      }
    } catch (err) {
      setNotifications(snapshot); // rollback
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to mark all notifications as read",
      );
    }
  };

  return { isConnected, notifications, markAsRead, markAllAsRead };
}

/**
 * ดึงรายการ notification ทั้งหมดของ user ปัจจุบันผ่าน `GET /api/notifications`
 * (สำหรับหน้า `/notifications` — ต่างจาก `useNotification` ที่ใช้ WS realtime
 * บน popover navbar)
 *
 * @returns UseQueryResult ของ `Notification[]`
 * @example
 * const { data: items = [], isLoading } = useNotificationsList();
 */
export function useNotificationsList() {
  return useQuery<Notification[], ApiError>({
    queryKey: [QUERY_KEYS.NOTIFICATIONS],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.NOTIFICATIONS);
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to load notifications");
      }
      const json = await res.json();
      return json.data ?? json;
    },
    ...CACHE_DYNAMIC,
  });
}

/**
 * ดึงรายละเอียด notification ตาม id ผ่าน `GET /api/notifications/:id`
 *
 * Cache profile = NORMAL (รายละเอียดเปลี่ยนไม่บ่อยหลัง created) เปิด query
 * เฉพาะเมื่อ id ไม่ว่าง — caller ส่ง `null`/`undefined` ตอน dialog ปิดได้
 *
 * @param id - notification id (undefined/null = ปิด query)
 * @returns UseQueryResult ของ `Notification`
 * @example
 * const { data: detail, isLoading, error } = useNotificationDetail(detailId);
 */
export function useNotificationDetail(id: string | null | undefined) {
  return useQuery<Notification, ApiError>({
    queryKey: [QUERY_KEYS.NOTIFICATION_DETAIL, id],
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
