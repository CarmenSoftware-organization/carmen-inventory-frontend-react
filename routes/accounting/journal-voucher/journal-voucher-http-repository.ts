import type { PaginatedResponse, ParamsDto } from "@/types/params";
import type {
  JournalVoucher,
  JournalVoucherAction,
  JournalVoucherInput,
} from "@/types/journal-voucher";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type {
  JournalVoucherCommand,
  JournalVoucherRepository,
} from "./journal-voucher-repository";
import { journalVoucherMockRepository } from "./journal-voucher-mock-repository";
import { journalVoucherCapabilities } from "./journal-voucher-source";

export const httpJournalVoucherRepository: JournalVoucherRepository = {
  async list(
    buCode: string,
    params?: ParamsDto,
  ): Promise<PaginatedResponse<JournalVoucher>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", String(params.page));
      if (params?.perpage) queryParams.set("limit", String(params.perpage));
      if (params?.search) queryParams.set("search", params.search);

      const queryStr = queryParams.toString();
      const url = `${API_ENDPOINTS.GL_JV_LIST(buCode)}${queryStr ? `?${queryStr}` : ""}`;
      const res = await httpClient.get(url);

      if (!res.ok) {
        return journalVoucherMockRepository.list(buCode, params);
      }

      const json = await res.json();
      const items: JournalVoucher[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : [];

      if (items.length === 0) {
        return journalVoucherMockRepository.list(buCode, params);
      }

      const total =
        typeof json?.total === "number"
          ? json.total
          : typeof json?.paginate?.total === "number"
            ? json.paginate.total
            : typeof json?.meta?.total === "number"
              ? json.meta.total
              : items.length;

      const pageNum = Number(params?.page) || 1;
      const perPageNum = Number(params?.perpage) || 20;

      return {
        data: items.map((item) => ({
          ...item,
          capabilities: journalVoucherCapabilities(item),
        })),
        paginate: {
          total,
          page: pageNum,
          perpage: perPageNum,
          pages: Math.ceil(total / perPageNum) || 1,
        },
      };
    } catch {
      return journalVoucherMockRepository.list(buCode, params);
    }
  },

  async get(buCode: string, id: string): Promise<JournalVoucher | null> {
    if (id.startsWith("mock-")) {
      return journalVoucherMockRepository.get(buCode, id);
    }
    try {
      const res = await httpClient.get(API_ENDPOINTS.GL_JV_DETAIL(buCode, id));
      if (!res.ok) {
        return journalVoucherMockRepository.get(buCode, id);
      }
      const data: JournalVoucher = await res.json();
      return {
        ...data,
        capabilities: journalVoucherCapabilities(data),
      };
    } catch {
      return journalVoucherMockRepository.get(buCode, id);
    }
  },

  async create(
    buCode: string,
    input: JournalVoucherInput,
  ): Promise<JournalVoucher> {
    try {
      const res = await httpClient.post(API_ENDPOINTS.GL_JV_LIST(buCode), input);
      if (!res.ok) {
        return journalVoucherMockRepository.create(buCode, input);
      }
      const data: JournalVoucher = await res.json();
      return {
        ...data,
        capabilities: journalVoucherCapabilities(data),
      };
    } catch {
      return journalVoucherMockRepository.create(buCode, input);
    }
  },

  async update(
    buCode: string,
    id: string,
    docVersion: number,
    input: JournalVoucherInput,
  ): Promise<JournalVoucher> {
    if (id.startsWith("mock-")) {
      return journalVoucherMockRepository.update(buCode, id, docVersion, input);
    }
    try {
      const res = await httpClient.put(API_ENDPOINTS.GL_JV_DETAIL(buCode, id), {
        doc_version: docVersion,
        ...input,
      });
      if (!res.ok) {
        return journalVoucherMockRepository.update(buCode, id, docVersion, input);
      }
      const data: JournalVoucher = await res.json();
      return {
        ...data,
        capabilities: journalVoucherCapabilities(data),
      };
    } catch {
      return journalVoucherMockRepository.update(buCode, id, docVersion, input);
    }
  },

  async action(
    buCode: string,
    id: string,
    action: JournalVoucherCommand,
    input: JournalVoucherAction,
  ): Promise<JournalVoucher> {
    if (id.startsWith("mock-")) {
      return journalVoucherMockRepository.action(buCode, id, action, input);
    }
    try {
      let endpoint: string | null = null;
      if (action === "submit") endpoint = API_ENDPOINTS.GL_JV_SUBMIT(buCode, id);
      else if (action === "approve") endpoint = API_ENDPOINTS.GL_JV_APPROVE(buCode, id);
      else if (action === "reject") endpoint = API_ENDPOINTS.GL_JV_REJECT(buCode, id);
      else if (action === "retry-post") endpoint = API_ENDPOINTS.GL_POSTING_POST(buCode, id);
      else if (action === "void") endpoint = API_ENDPOINTS.GL_POSTING_VOID(buCode, id);
      else if (action === "reverse") endpoint = API_ENDPOINTS.GL_POSTING_REVERSE(buCode, id);

      if (endpoint) {
        const res = await httpClient.post(endpoint, input);
        if (res.ok) {
          const data: JournalVoucher = await res.json();
          return {
            ...data,
            capabilities: journalVoucherCapabilities(data),
          };
        }
      }
      return journalVoucherMockRepository.action(buCode, id, action, input);
    } catch {
      return journalVoucherMockRepository.action(buCode, id, action, input);
    }
  },

  async copy(buCode: string, id: string): Promise<JournalVoucher> {
    return journalVoucherMockRepository.copy(buCode, id);
  },
};
