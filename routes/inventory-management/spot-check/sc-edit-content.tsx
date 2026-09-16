import { ScEntryComponent } from "./sc-entry-component";

export function ScEditContent({ id }: Readonly<{ id: string }>) {
  return <ScEntryComponent spotCheckId={id} />;
}
