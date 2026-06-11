import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { ApiError } from "@/lib/api-error";

/**
 * Helper สำหรับ optimistic update: ลบ item ตาม id ออกจาก paginated list cache
 *
 * ใช้ร่วมกับ `optimisticList.updater` ของ `useApiMutation`
 * ปรับ `paginate.total` ลง 1 แต่ไม่น้อยกว่า 0 ถ้า shape ไม่ match จะคืน old เดิม
 *
 * @param old - ข้อมูลเดิมใน cache
 * @param id - id ของ item ที่ต้องการลบ
 * @returns ข้อมูลใหม่หลังลบ item แล้ว
 * @example
 * ```ts
 * useApiMutation({
 *   mutationFn: (id, bu) => api.remove(bu, id),
 *   optimisticList: { queryKeyPrefix: ["vendors"], updater: removeFromListById },
 * });
 * ```
 */
export function removeFromListById<T extends { id: string }>(
  old: unknown,
  id: string,
): unknown {
  const data = old as
    | { data?: T[]; paginate?: { total?: number } }
    | undefined;
  if (!data?.data) return old;
  return {
    ...data,
    data: data.data.filter((item) => item.id !== id),
    paginate: data.paginate
      ? { ...data.paginate, total: Math.max(0, (data.paginate.total ?? 1) - 1) }
      : data.paginate,
  };
}

interface UseApiMutationOptions<TVariables> {
  mutationFn: (variables: TVariables, buCode: string) => Promise<Response>;
  invalidateKeys?: readonly unknown[];
  errorMessage?: string;
  optimistic?: {
    queryKey: readonly unknown[];
    updater: (old: unknown, variables: TVariables) => unknown;
  };
  /**
   * Optimistically update all list queries whose key starts with the given prefix.
   * Useful for list mutations (delete/approve) where the full key includes dynamic params.
   * Snapshots and rolls back on error.
   */
  optimisticList?: {
    queryKeyPrefix: readonly unknown[];
    updater: (old: unknown, variables: TVariables) => unknown;
  };
}

/**
 * Hook ห่อ `useMutation` สำหรับเรียก API พร้อมจัดการ error, optimistic update และ invalidate cache
 *
 * Normalize error ให้เป็น `ApiError` เสมอ (parse server message ถ้ามี)
 * เช็ค `{ success: false }` ใน response body เพื่อ throw validation error ด้วย
 * รองรับ optimistic 2 แบบ: single-key (`optimistic`) และ prefix-match (`optimisticList`)
 * snapshot + rollback อัตโนมัติเมื่อ error invalidate `invalidateKeys` ทุกตัวใน onSettled
 *
 * @param options - ตัวเลือก mutationFn, invalidateKeys, errorMessage และ optimistic update
 * @returns UseMutationResult พร้อม ApiError handling
 * @example
 * ```ts
 * const mutation = useApiMutation<CreateVendorDto>({
 *   mutationFn: (data, bu) => api.create(bu, data),
 *   invalidateKeys: [QUERY_KEYS.VENDORS],
 *   errorMessage: "Failed to create vendor",
 * });
 * mutation.mutate({ code: "V01", name: "ABC" });
 * ```
 */
export function useApiMutation<TVariables, TResponse = unknown>({
  mutationFn,
  invalidateKeys,
  errorMessage = "Request failed",
  optimistic,
  optimisticList,
}: UseApiMutationOptions<TVariables>) {
  const buCode = useBuCode();
  const queryClient = useQueryClient();

  return useMutation<
    TResponse,
    ApiError,
    TVariables,
    { previous?: unknown; previousList?: [readonly unknown[], unknown][] }
  >({
    mutationFn: async (variables) => {
      if (!buCode)
        throw new ApiError("MISSING_REQUIRED_FIELD", "Missing buCode");
      const res = await mutationFn(variables, buCode);
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed — use fallback
        }
        throw ApiError.fromResponse(res, serverMessage || errorMessage);
      }
      const data = await res.json();
      if (
        data != null &&
        typeof data === "object" &&
        "success" in data &&
        data.success === false
      ) {
        throw new ApiError(
          "VALIDATION_ERROR",
          data.message || errorMessage,
          data.status,
        );
      }
      return data;
    },

    onMutate:
      optimistic || optimisticList
        ? async (variables) => {
            const context: {
              previous?: unknown;
              previousList?: [readonly unknown[], unknown][];
            } = {};
            if (optimistic) {
              await queryClient.cancelQueries({
                queryKey: optimistic.queryKey,
              });
              context.previous = queryClient.getQueryData(optimistic.queryKey);
              queryClient.setQueryData(optimistic.queryKey, (old: unknown) =>
                optimistic.updater(old, variables),
              );
            }
            if (optimisticList) {
              await queryClient.cancelQueries({
                queryKey: optimisticList.queryKeyPrefix,
              });
              const matches = queryClient.getQueriesData({
                queryKey: optimisticList.queryKeyPrefix,
              });
              context.previousList = matches.map(([key, data]) => [key, data]);
              for (const [key] of matches) {
                queryClient.setQueryData(key, (old: unknown) =>
                  optimisticList.updater(old, variables),
                );
              }
            }
            return context;
          }
        : undefined,

    onError:
      optimistic || optimisticList
        ? (_err, _vars, context) => {
            if (optimistic && context?.previous !== undefined) {
              queryClient.setQueryData(optimistic.queryKey, context.previous);
            }
            if (optimisticList && context?.previousList) {
              for (const [key, data] of context.previousList) {
                queryClient.setQueryData(key, data);
              }
            }
          }
        : undefined,

    onSettled: () => {
      invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({
          queryKey: Array.isArray(key) ? key : [key],
        });
      });
    },
  });
}
