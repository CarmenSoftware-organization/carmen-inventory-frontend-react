import { z } from "zod";

export const lastActionSchema = z.object({
  state: z.string().nullable(),
  at: z.string().nullable(),
  id: z.string().nullable(),
  name: z.string().nullable(),
});

export type LastAction = z.infer<typeof lastActionSchema>;
