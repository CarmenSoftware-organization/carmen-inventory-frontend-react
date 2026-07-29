import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { ApiErrorToaster } from "@/components/api-error-toaster";
import { PermissionDeniedDialog } from "@/components/permission-denied-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  reportApiError,
  skipsGlobalErrorToast,
} from "@/lib/api-error-handler";

export const makeQueryClient = () =>
  new QueryClient({
    // ทุก mutation ที่ล้มเหลวเด้ง toast เองโดย default — ดู `<ApiErrorToaster />`
    // mutation ที่ต้องทำอย่างอื่นเพิ่ม (เช่นปิด dialog) ใส่ onError ของตัวเองได้
    // ทั้งสองตัวทำงาน อย่าเรียก toast ซ้ำใน onError นั้น — ถ้าต้องแสดง toast เอง
    // จริงๆ ให้ opt-out ด้วย `meta: { skipGlobalErrorToast: true }`
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (skipsGlobalErrorToast(mutation.meta)) return;
        reportApiError(error);
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

const getQueryClient = () => {
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};

export default function Providers({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          {children}
          <ApiErrorToaster />
          <PermissionDeniedDialog />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
