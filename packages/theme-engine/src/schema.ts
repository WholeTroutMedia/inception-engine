import { z } from 'zod';

export const ThemeTokenOverridesSchema = z.object({
    color: z.record(z.string(), z.string()).optional(),
    spacing: z.record(z.string(), z.string()).optional(),
    fontFamily: z.record(z.string(), z.string()).optional(),
});

export const ThemeSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    description: z.string(),
    overrides: ThemeTokenOverridesSchema,
    metadata: z.object({
        author: z.string(),
        createdAt: z.string(),
        validated: z.boolean(),
        score: z.number().optional(),
    }),
});
