/**
 * Wire Ingestion MCP — RSS/Atom Parser
 *
 * Fetches a feed URL and parses it into normalized WireEntry objects.
 */

import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'crypto';
import type { WireEntry, FeedSource } from './types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['item', 'entry'].includes(name),
});

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function parseDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  try {
    return new Date(raw).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function stripHtml(html: string | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function extractImageUrl(item: Record<string, unknown>): string | undefined {
  const enclosure = item['enclosure'] as Record<string, string> | undefined;
  if (enclosure?.['@_url'] && enclosure['@_type']?.startsWith('image/')) {
    return enclosure['@_url'];
  }
  const media = item['media:content'] as Record<string, string> | undefined;
  if (media?.['@_url']) return media['@_url'];
  return undefined;
}

/**
 * Fetch and parse a single RSS/Atom feed into WireEntry array.
 */
export async function parseFeed(source: FeedSource): Promise<WireEntry[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CreativeLiberationEngine/5.0 WireBot (+https://wholettroutmedia.com)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const doc = parser.parse(xml) as Record<string, unknown>;
    const now = new Date().toISOString();

    // RSS format
    const channel = (doc['rss'] as Record<string, unknown> | undefined)?.['channel'] as Record<string, unknown> | undefined;
    if (channel) {
      const items = (channel['item'] as Record<string, unknown>[] | undefined) ?? [];
      return items.slice(0, 50).map((item) => {
        const url = (item['link'] as string | undefined) ?? '';
        return {
          id: sha256(url || source.id + String(item['title'])),
          category: source.category,
          source: source.id,
          title: stripHtml(item['title'] as string | undefined) || 'Untitled',
          summary: stripHtml((item['description'] ?? item['content:encoded'] ?? item['summary']) as string | undefined),
          url,
          publishedAt: parseDate((item['pubDate'] ?? item['dc:date']) as string | undefined),
          ingestedAt: now,
          tags: [],
          author: (item['dc:creator'] ?? item['author']) as string | undefined,
          imageUrl: extractImageUrl(item),
        };
      }).filter(e => Boolean(e.url)) as WireEntry[];
    }

    // Atom format
    const feed = doc['feed'] as Record<string, unknown> | undefined;
    if (feed) {
      const entries = (feed['entry'] as Record<string, unknown>[] | undefined) ?? [];
      return entries.slice(0, 50).map((entry) => {
        const links = entry['link'];
        let url = '';
        if (Array.isArray(links)) {
          const htmlLink = (links as Array<Record<string, string>>).find(l => l['@_rel'] === 'alternate' || !l['@_rel']);
          url = htmlLink?.['@_href'] ?? '';
        } else if (typeof links === 'object' && links !== null) {
          url = (links as Record<string, string>)['@_href'] ?? '';
        }

        return {
          id: sha256(url || source.id + String(entry['title'])),
          category: source.category,
          source: source.id,
          title: stripHtml(
            typeof entry['title'] === 'object'
              ? (entry['title'] as Record<string, string>)['#text']
              : entry['title'] as string
          ) || 'Untitled',
          summary: stripHtml(
            typeof entry['summary'] === 'object'
              ? (entry['summary'] as Record<string, string>)['#text']
              : (entry['summary'] ?? entry['content']) as string
          ),
          url,
          publishedAt: parseDate((entry['published'] ?? entry['updated']) as string | undefined),
          ingestedAt: now,
          tags: [],
          author: (entry['author'] as Record<string, string> | undefined)?.['name'],
          imageUrl: extractImageUrl(entry),
        };
      }).filter(e => Boolean(e.url)) as WireEntry[];
    }

    return [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
