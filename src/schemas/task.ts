import { z } from "zod";

export const TaskSchema = z.object({
    id: z.string().uuid().optional(),
    type: z.string().min(1),
    payload: z.record(z.string(), z.any()),
    runAt: z.string().datetime().optional(),
    maxAttempt: z.number().int().positive().optional(),
    dependsOn: z.array(z.string().uuid()).optional()
});

export type TaskSchema = z.infer<typeof TaskSchema>;