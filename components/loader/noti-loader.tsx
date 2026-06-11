import { Skeleton } from "../ui/skeleton";

export function NotificationLoader() {
  return (
    <div>
      <li className="px-4 py-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </li>
      <li className="px-4 py-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="mt-2 h-3 w-3/4" />
      </li>
      <li className="px-4 py-3">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </li>
      <li className="px-4 py-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-2 h-3 w-3/5" />
      </li>
      <li className="px-4 py-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </li>
      <li className="px-4 py-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </li>
    </div>
  );
}
