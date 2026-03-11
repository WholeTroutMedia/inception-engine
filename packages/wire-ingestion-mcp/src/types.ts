/**
 * Wire Ingestion MCP — Shared Types
 * Universal schema for all wire feed entries across every category.
 */

import { z } from 'zod';

export const WireCategory = z.enum([
  'news',
  'sports',
  'financial',
  'science',
  'literary',
  'tech',
  'government',
  'entertainment',
  'health',
  'business',
]);

export type WireCategory = z.infer<typeof WireCategory>;

export const WireEntrySchema = z.object({
  id: z.string(),                        // sha256 of url
  category: WireCategory,
  source: z.string(),                    // e.g. 'ap-news', 'espn', 'arxiv'
  title: z.string(),
  summary: z.string().optional(),
  url: z.string().url(),
  publishedAt: z.string().datetime(),    // ISO 8601
  ingestedAt: z.string().datetime(),
  tags: z.array(z.string()).default([]),
  author: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export type WireEntry = z.infer<typeof WireEntrySchema>;

export const WireQuerySchema = z.object({
  topic: z.string().optional().describe('Free-text search across title + summary'),
  category: WireCategory.optional().describe('Filter by wire category'),
  source: z.string().optional().describe('Filter by specific source'),
  limit: z.number().int().min(1).max(100).default(20),
  since: z.string().optional().describe('ISO 8601 — only entries after this time'),
});

export type WireQuery = z.infer<typeof WireQuerySchema>;

export const WireLatestSchema = z.object({
  category: WireCategory.optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type WireLatest = z.infer<typeof WireLatestSchema>;

export interface FeedSource {
  id: string;
  name: string;
  category: WireCategory;
  url: string;
  type: 'rss' | 'atom' | 'api';
  intervalSeconds: number;
}
