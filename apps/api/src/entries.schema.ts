import { z } from "zod";

export const PROJECTS = ["Viso Internal", "Client A", "Client B", "Personal Development"] as const;
export const MAX_HOURS_PER_DAY = 24;

export const CreateEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  project: z.enum(PROJECTS),
  hours: z.number().positive(),
  description: z.string().min(1),
});

export type CreateEntryInput = z.infer<typeof CreateEntrySchema>;
