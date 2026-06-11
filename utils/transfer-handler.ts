import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";

export const transferPayloadSchema = z.object({
  add: z.array(z.object({ id: z.string() })),
  remove: z.array(z.object({ id: z.string() })),
});

export type TransferPayload = z.infer<typeof transferPayloadSchema>;

export function transferHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>,
  fieldName: string,
  moveKeys: string[],
  direction: "left" | "right",
) {
  const currentAdd: { id: string }[] = form.getValues(`${fieldName}.add`) ?? [];
  const currentRemove: { id: string }[] =
    form.getValues(`${fieldName}.remove`) ?? [];

  const newAdd = [...currentAdd];
  const newRemove = [...currentRemove];

  for (const key of moveKeys) {
    if (direction === "right") {
      const removeIndex = newRemove.findIndex((item) => item.id === key);
      if (removeIndex !== -1) {
        newRemove.splice(removeIndex, 1);
      } else if (!newAdd.some((item) => item.id === key)) {
        newAdd.push({ id: key });
      }
    } else {
      const addIndex = newAdd.findIndex((item) => item.id === key);
      if (addIndex !== -1) {
        newAdd.splice(addIndex, 1);
      } else if (!newRemove.some((item) => item.id === key)) {
        newRemove.push({ id: key });
      }
    }
  }

  form.setValue(`${fieldName}.add`, newAdd);
  form.setValue(`${fieldName}.remove`, newRemove);
}
