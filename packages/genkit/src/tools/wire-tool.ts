/**
 * Wire Ingestion â€” Genkit Tool
 *
 * Exposes wire.query and wire.latest as callable Genkit tools
 * so AVERI can look up real-time news, sports, financials, etc.
 * mid-conversation without leaving the flow.
 *
 * Usage in any Genkit flow:
 *   import { wireQueryTool, wireLatestTool } from './wire-tool.js';
 *   const result = await wireQueryTool({ topic: 'bitcoin', category: 'financial' });
 */

import { z } from 'genkit';
import { ai } from '../index.js';

// Tool: wire_query â€” search all wires
export const wireQueryTool = ai.defineTool(
  {
    name: 'wire_query',
    description:
      'Search live real-time wire feeds for current events, breaking news, sports scores, financial data, science discoveries, and more. Use this whenever the user asks about anything that could have changed recently. Covers 100+ feeds across: news, sports, financial, science, literary, tech, government, entertainment, health, business.',
    inputSchema: z.object({
      topic: z.string().optional().describe('Keyword to search (e.g. "bitcoin", "Lakers", "earthquake")'),
      category: z
        .enum(['news','sports','financial','science','literary','tech','government','entertainment','health','business'])
        .optional()
        .describe('Filter to a specific wire category'),
      limit: z.number().int().min(1).max(30).default(10),
      since: z.string().optional().describe('ISO 8601 â€” only entries after this time'),
    }),
    outputSchema: z.object({
      count: z.number(),
      entries: z.array(z.object({
        title: z.string(),
        source: z.string(),
        category: z.string(),
        url: z.string(),
        publishedAt: z.string(),
        summary: z.string().optional(),
      })),
    }),
  },
  async (input) => {
    const WIRE_URL = process.env['WIRE_MCP_URL'] ?? 'http://127.0.0.1:4200';
    try {
      const res = await fetch(`${WIRE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Wire MCP returned ${res.status}`);
      return res.json() as Promise<{ count: number; entries: Array<{ title: string; source: string; category: string; url: string; publishedAt: string; summary?: string }> }>;
    } catch {
      // Fallback: direct Redis query via shared cache module
      // @ts-ignore
      const { queryEntries } = await import('@creative-liberation-engine/wire-ingestion-mcp');
      const entries = await queryEntries({ ...input, source: undefined });
      return { count: entries.length, entries };
    }
  },
);

// Tool: wire_latest â€” grab newest headlines
export const wireLatestTool = ai.defineTool(
  {
    name: 'wire_latest',
    description:
      'Get the latest breaking headlines from any or all wire categories. Use for morning briefings, live event monitoring, or when the user wants "what\'s happening right now".',
    inputSchema: z.object({
      category: z
        .enum(['news','sports','financial','science','literary','tech','government','entertainment','health','business'])
        .optional(),
      limit: z.number().int().min(1).max(30).default(10),
    }),
    outputSchema: z.object({
      count: z.number(),
      entries: z.array(z.object({
        title: z.string(),
        source: z.string(),
        category: z.string(),
        url: z.string(),
        publishedAt: z.string(),
        summary: z.string().optional(),
      })),
    }),
  },
  async (input) => {
    // @ts-ignore
    const { latestEntries } = await import('@creative-liberation-engine/wire-ingestion-mcp');
    const entries = await latestEntries(input.category, input.limit);
    return { count: entries.length, entries };
  },
);
