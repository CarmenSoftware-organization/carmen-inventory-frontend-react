import { useLocation } from "react-router";
import { moduleList, type ModuleDto } from "@/constant/module-list";

export function useModuleTile(): {
  name?: string;
  parentName?: string;
} {
  const pathname = useLocation().pathname;
  const parent = moduleList.find(
    (m) => pathname === m.path || pathname.startsWith(m.path + "/"),
  );
  if (!parent) return {};

  let best: ModuleDto | undefined;
  for (const sub of parent.subModules ?? []) {
    if (
      (pathname === sub.path || pathname.startsWith(sub.path + "/")) &&
      (!best || sub.path.length > best.path.length)
    ) {
      best = sub;
    }
  }
  return { name: best?.name, parentName: parent.name };
}
