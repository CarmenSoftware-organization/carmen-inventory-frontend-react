import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { PermissionDeniedDialog } from "@/components/permission-denied-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";

const makeQueryClient = () =>
  new QueryClient({
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
          <PermissionDeniedDialog />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
