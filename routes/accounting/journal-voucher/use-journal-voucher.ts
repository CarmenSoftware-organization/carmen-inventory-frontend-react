import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import type { ParamsDto } from "@/types/params";
import type {
  JournalVoucherAction,
  JournalVoucherInput,
} from "@/types/journal-voucher";
import { journalVoucherMockRepository } from "./journal-voucher-mock-repository";
import type { JournalVoucherCommand } from "./journal-voucher-repository";

export { MOCK_SETTINGS_KEY } from "./journal-voucher-mock-repository";

// Swap this implementation for an HTTP JournalVoucherRepository when the
// gateway contract is deployed; page components remain unchanged.
const repository = journalVoucherMockRepository;

export const JOURNAL_VOUCHER_QUERY_KEYS = {
  root: (buCode: string) => ["journal-vouchers", buCode] as const,
  list: (buCode: string, params?: ParamsDto) =>
    [...JOURNAL_VOUCHER_QUERY_KEYS.root(buCode), "list", params] as const,
  detail: (buCode: string, id?: string) =>
    [...JOURNAL_VOUCHER_QUERY_KEYS.root(buCode), "detail", id] as const,
  settings: (buCode: string) =>
    [...JOURNAL_VOUCHER_QUERY_KEYS.root(buCode), "settings"] as const,
};

function useRepositoryContext() {
  return { buCode: useBuCode() ?? "BU-MOCK", repository };
}

export function useJournalVouchers(params?: ParamsDto) {
  const context = useRepositoryContext();
  return useQuery({
    queryKey: JOURNAL_VOUCHER_QUERY_KEYS.list(context.buCode, params),
    queryFn: () => context.repository.list(context.buCode, params),
  });
}

export function useJournalVoucherSettings() {
  const context = useRepositoryContext();
  return useQuery({
    queryKey: JOURNAL_VOUCHER_QUERY_KEYS.settings(context.buCode),
    queryFn: () => context.repository.settings(context.buCode),
  });
}

export function useJournalVoucher(id?: string) {
  const context = useRepositoryContext();
  return useQuery({
    queryKey: JOURNAL_VOUCHER_QUERY_KEYS.detail(context.buCode, id),
    queryFn: () => context.repository.get(context.buCode, id!),
    enabled: Boolean(id && id !== "new"),
  });
}

function useMutationContext() {
  const context = useRepositoryContext();
  const queryClient = useQueryClient();
  return {
    ...context,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: JOURNAL_VOUCHER_QUERY_KEYS.root(context.buCode),
      }),
  };
}

export function useCreateJournalVoucher() {
  const context = useMutationContext();
  return useMutation({
    mutationFn: async (input: JournalVoucherInput) => ({
      data: await context.repository.create(context.buCode, input),
    }),
    onSuccess: context.invalidate,
  });
}

export function useUpdateJournalVoucher() {
  const context = useMutationContext();
  return useMutation({
    mutationFn: async ({
      id,
      doc_version,
      ...input
    }: JournalVoucherInput & { id: string; doc_version: number }) => ({
      data: await context.repository.update(
        context.buCode,
        id,
        doc_version,
        input,
      ),
    }),
    onSuccess: context.invalidate,
  });
}

export function useJournalVoucherAction(command: JournalVoucherCommand) {
  const context = useMutationContext();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: JournalVoucherAction & { id: string }) => ({
      data: await context.repository.action(context.buCode, id, command, input),
    }),
    onSuccess: context.invalidate,
  });
}

export function useCopyJournalVoucher() {
  const context = useMutationContext();
  return useMutation({
    mutationFn: async (id: string) => ({
      data: await context.repository.copy(context.buCode, id),
    }),
    onSuccess: context.invalidate,
  });
}
