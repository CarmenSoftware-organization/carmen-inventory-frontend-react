import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChangePasswordDto,
  UpdateProfileDto,
  UserProfile,
} from "@/types/profile";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { BU_SWITCH_CHANNEL, QUERY_KEYS } from "@/constant/query-keys";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";

export const profileQueryKey = [QUERY_KEYS.PROFILE] as const;

export function useProfile() {
  const queryClient = useQueryClient();

  // Listen for BU switch from other tabs
  useEffect(() => {
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(BU_SWITCH_CHANNEL);
      channel.onmessage = () => {
        queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] !== profileQueryKey[0],
        });
        queryClient.invalidateQueries({ queryKey: profileQueryKey });
      };
    } catch {
      // BroadcastChannel not supported
    }
    return () => {
      try {
        channel?.close();
      } catch {
        // already closed
      }
    };
  }, [queryClient]);

  const query = useQuery<UserProfile>({
    queryKey: profileQueryKey,
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.PROFILE);

      if (!res.ok) throw new Error("Failed to fetch profile");

      const json = await res.json();
      return json.data;
    },
    staleTime: Infinity,
    retry: 1,
  });

  const defaultBu =
    query.data?.business_unit.find((b) => b.is_default) ??
    query.data?.business_unit[0];

  const userId = query.data?.id;
  const aliasName = query.data?.alias_name;
  const userInfo = query.data?.user_info;
  const fullName = userInfo
    ? [userInfo.firstname, userInfo.middlename, userInfo.lastname]
        .map((p) => p?.trim())
        .filter((p): p is string => !!p)
        .join(" ")
    : "";
  const avatarUrl = query.data?.avatar_url ?? null;
  const buCode = defaultBu?.code;
  const buLogoUrl = defaultBu?.logo_url ?? null;

  const defaultCurrencyId = defaultBu?.config?.default_currency_id;
  const defaultCurrencyCode =
    defaultBu?.config?.default_currency?.code ?? "THB";
  const defaultCurrencyDecimalPlaces =
    defaultBu?.config?.default_currency?.decimal_places ?? 2;
  const dateFormat = defaultBu?.config?.date_format ?? "DD/MM/YYYY";
  const dateTimeFormat =
    defaultBu?.config?.date_time_format ?? "DD/MM/YYYY HH:mm";
  const amountFormat = defaultBu?.config?.amount_format;

  const allBuCode = query.data?.business_unit.map((b) => b.code);
  const currentPeriod = defaultBu?.current_period;
  const hasDepartment = defaultBu?.department != null;
  const isProfileReady = query.isSuccess && !!buCode && !!defaultBu;

  if (process.env.NODE_ENV === "development" && query.isSuccess && query.data) {
    if (query.data.business_unit.length === 0) {
      console.warn("[useProfile] business_unit array is empty");
    }
    if (defaultBu && !defaultBu.config) {
      console.warn(
        "[useProfile] Default BU config is missing:",
        defaultBu.code,
      );
    }
  }

  return {
    ...query,
    defaultBu,
    buCode,
    defaultCurrencyId,
    defaultCurrencyCode,
    defaultCurrencyDecimalPlaces,
    dateFormat,
    dateTimeFormat,
    amountFormat,
    allBuCode,
    userId,
    hasDepartment,
    aliasName,
    fullName,
    avatarUrl,
    buLogoUrl,
    currentPeriod,
    isProfileReady,
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, UpdateProfileDto>({
    mutationFn: async (data) => {
      const res = await httpClient.patch(API_ENDPOINTS.PROFILE_UPDATE, data);
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed
        }
        throw ApiError.fromResponse(
          res,
          serverMessage || "Failed to update profile",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

export function useUploadUserAvatar() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, File>({
    mutationFn: async (file) => {
      // Field name follows the BU-logo precedent (resource name = `avatar`).
      // Adjust if backend rejects with a different field-name expectation.
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(API_ENDPOINTS.PROFILE_AVATAR, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed
        }
        throw ApiError.fromResponse(
          res,
          serverMessage || "Failed to upload avatar",
        );
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

export function useDeleteUserAvatar() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, void>({
    mutationFn: async () => {
      const res = await fetch(API_ENDPOINTS.PROFILE_AVATAR, {
        method: "DELETE",
      });
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed
        }
        throw ApiError.fromResponse(
          res,
          serverMessage || "Failed to remove avatar",
        );
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

export function useUploadBuLogo() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, { buId: string; file: File }>({
    mutationFn: async ({ buId, file }) => {
      // Backend expects `UploadLogoBodyDto` — field name is `logo` (not `file`),
      // accepts jpeg/png/webp.
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(API_ENDPOINTS.BUSINESS_UNIT_LOGO(buId), {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed
        }
        throw ApiError.fromResponse(
          res,
          serverMessage || "Failed to upload BU logo",
        );
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

export function useDeleteBuLogo() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: async (buId) => {
      const res = await fetch(API_ENDPOINTS.BUSINESS_UNIT_LOGO(buId), {
        method: "DELETE",
      });
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed
        }
        throw ApiError.fromResponse(
          res,
          serverMessage || "Failed to remove BU logo",
        );
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

export function useUploadBuAvatar() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, { buId: string; file: File }>({
    mutationFn: async ({ buId, file }) => {
      // Backend expects field name `avatar` — mirrors `useUploadUserAvatar`.
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(API_ENDPOINTS.BUSINESS_UNIT_AVATAR(buId), {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed
        }
        throw ApiError.fromResponse(
          res,
          serverMessage || "Failed to upload BU avatar",
        );
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

export function useDeleteBuAvatar() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: async (buId) => {
      const res = await fetch(API_ENDPOINTS.BUSINESS_UNIT_AVATAR(buId), {
        method: "DELETE",
      });
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed
        }
        throw ApiError.fromResponse(
          res,
          serverMessage || "Failed to remove BU avatar",
        );
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

export function useChangePassword() {
  return useMutation<unknown, ApiError, ChangePasswordDto>({
    mutationFn: async (data) => {
      const res = await httpClient.post(
        API_ENDPOINTS.PROFILE_CHANGE_PASSWORD,
        data,
      );
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed
        }
        throw ApiError.fromResponse(
          res,
          serverMessage || "Failed to change password",
        );
      }
      return res.json();
    },
  });
}
