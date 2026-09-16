import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";

export default function LoaderProfile() {
  return (
    <div className="space-y-4">
      <section>
        <Skeleton className="h-3 w-32" />
        <Separator className="my-2" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`user-${i}`} className="space-y-1">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <Separator className="my-2" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`bu-${i}`} className="space-y-1">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
