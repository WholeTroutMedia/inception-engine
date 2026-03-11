import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — Notion MCP Adapter ───────────────────────────────────────────
// Connects Creative Liberation Engine agents to Notion for knowledge base management,
// project documentation, client briefs, and content planning.

const NOTION_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const ENV_NOTION = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };

function notionHeaders() {
    const token = ENV_NOTION.process?.env?.['NOTION_API_KEY'];
    if (!token) throw new Error('NOTION_API_KEY not configured');
    return {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
    };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const SearchNotionSchema = z.object({
    query: z.string().describe('Search query across all Notion pages and databases'),
    filter_type: z.enum(['page', 'database', 'all']).default('all'),
    limit: z.number().min(1).max(20).default(10),
});

export const GetPageSchema = z.object({
    page_id: z.string().describe('Notion page ID (UUID format)'),
    include_blocks: z.boolean().default(true).describe('Include page body blocks'),
});

export const CreatePageSchema = z.object({
    parent_page_id: z.string().optional().describe('Parent page ID (for sub-pages)'),
    parent_database_id: z.string().optional().describe('Parent database ID (for database entries)'),
    title: z.string().describe('Page title'),
    content: z.string().optional().describe('Page body content (markdown-like text)'),
    properties: z.record(z.unknown()).optional().describe('Database properties (for database pages)'),
    icon: z.string().optional().describe('Emoji icon for the page'),
});

export const AppendBlocksSchema = z.object({
    page_id: z.string(),
    blocks: z.array(z.object({
        type: z.enum(['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'code', 'quote', 'divider', 'callout']),
        text: z.string().optional(),
        language: z.string().optional().describe('For code blocks'),
        emoji: z.string().optional().describe('For callout blocks'),
    })),
});

export const QueryDatabaseSchema = z.object({
    database_id: z.string(),
    filter: z.record(z.unknown()).optional().describe('Notion filter object'),
    sorts: z.array(z.object({ property: z.string(), direction: z.enum(['ascending', 'descending']) })).optional(),
    limit: z.number().min(1).max(100).default(20),
});

export const UpdatePageSchema = z.object({
    page_id: z.string(),
    title: z.string().optional(),
    properties: z.record(z.unknown()).optional(),
    archived: z.boolean().optional(),
    icon: z.string().optional(),
});

// ─── Block builders ───────────────────────────────────────────────────────────

type NotionBlock = Record<string, unknown>;

function makeRichText(text: string): Array<{ type: string; text: { content: string } }> {
    return [{ type: 'text', text: { content: text } }];
}

function textToBlocks(text: string): NotionBlock[] {
    return text.split('\n\n').filter(Boolean).map(p => ({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: makeRichText(p.trim()) },
    }));
}

function inputBlockToNotion(b: z.infer<typeof AppendBlocksSchema>['blocks'][0]): NotionBlock {
    const text = b.text ?? '';
    switch (b.type) {
        case 'heading_1': return { object: 'block', type: 'heading_1', heading_1: { rich_text: makeRichText(text) } };
        case 'heading_2': return { object: 'block', type: 'heading_2', heading_2: { rich_text: makeRichText(text) } };
        case 'heading_3': return { object: 'block', type: 'heading_3', heading_3: { rich_text: makeRichText(text) } };
        case 'bulleted_list_item': return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: makeRichText(text) } };
        case 'numbered_list_item': return { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: makeRichText(text) } };
        case 'quote': return { object: 'block', type: 'quote', quote: { rich_text: makeRichText(text) } };
        case 'divider': return { object: 'block', type: 'divider', divider: {} };
        case 'code': return { object: 'block', type: 'code', code: { rich_text: makeRichText(text), language: b.language ?? 'plain text' } };
        case 'callout': return { object: 'block', type: 'callout', callout: { rich_text: makeRichText(text), icon: { type: 'emoji', emoji: b.emoji ?? '💡' } } };
        default: return { object: 'block', type: 'paragraph', paragraph: { rich_text: makeRichText(text) } };
    }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function searchNotion(input: z.infer<typeof SearchNotionSchema>) {
    const v = SearchNotionSchema.parse(input);
    const response = await axios.post<{
        results: Array<{ id: string; object: string; url: string; properties?: Record<string, { title?: Array<{ plain_text: string }> }> }>
    }>(
        `${NOTION_BASE}/search`,
        {
            query: v.query,
            filter: v.filter_type !== 'all' ? { value: v.filter_type, property: 'object' } : undefined,
            page_size: v.limit,
        },
        { headers: notionHeaders() }
    );

    return {
        results: response.data.results.map(r => ({
            id: r.id,
            type: r.object,
            title: r.properties?.title?.title?.[0]?.plain_text ?? r.properties?.Name?.title?.[0]?.plain_text ?? 'Untitled',
            url: r.url,
        })),
        total: response.data.results.length,
    };
}

export async function getPage(input: z.infer<typeof GetPageSchema>) {
    const v = GetPageSchema.parse(input);
    const pageResponse = await axios.get<{
        id: string; url: string; icon?: { emoji?: string };
        properties: Record<string, { title?: Array<{ plain_text: string }>; rich_text?: Array<{ plain_text: string }> }>;
    }>(`${NOTION_BASE}/pages/${v.page_id}`, { headers: notionHeaders() });

    const page = pageResponse.data;
    const titleProp = Object.values(page.properties).find(p => p.title);
    const title = titleProp?.title?.[0]?.plain_text ?? 'Untitled';

    if (!v.include_blocks) return { id: page.id, title, url: page.url };

    const blocksResponse = await axios.get<{ results: NotionBlock[] }>(
        `${NOTION_BASE}/blocks/${v.page_id}/children?page_size=100`,
        { headers: notionHeaders() }
    );

    const content = blocksResponse.data.results
        .filter(b => {
            const bTyped = b as Record<string, Record<string, Array<{ plain_text: string }>>>;
            return bTyped[b.type as string]?.rich_text;
        })
        .map(b => {
            const bTyped = b as Record<string, Record<string, Array<{ plain_text: string }>>>;
            return bTyped[b.type as string]?.rich_text?.map((rt: { plain_text: string }) => rt.plain_text).join('');
        })
        .filter(Boolean)
        .join('\n\n');

    return { id: page.id, title, url: page.url, content, block_count: blocksResponse.data.results.length };
}

export async function createPage(input: z.infer<typeof CreatePageSchema>) {
    const v = CreatePageSchema.parse(input);
    console.log(`[PLUG/NOTION] 📄 Creating page: "${v.title}"`);

    const parent = v.parent_database_id
        ? { database_id: v.parent_database_id }
        : { page_id: v.parent_page_id ?? '' };

    const properties = v.parent_database_id
        ? { ...(v.properties ?? {}), Name: { title: [{ type: 'text', text: { content: v.title } }] } }
        : { title: { title: [{ type: 'text', text: { content: v.title } }] } };

    const children = v.content ? textToBlocks(v.content) : [];

    const response = await axios.post<{ id: string; url: string }>(
        `${NOTION_BASE}/pages`,
        {
            parent,
            properties,
            children,
            icon: v.icon ? { type: 'emoji', emoji: v.icon } : undefined,
        },
        { headers: notionHeaders() }
    );

    return { id: response.data.id, url: response.data.url, title: v.title };
}

export async function appendBlocks(input: z.infer<typeof AppendBlocksSchema>) {
    const v = AppendBlocksSchema.parse(input);
    const children = v.blocks.map(inputBlockToNotion);

    const response = await axios.patch<{ results: NotionBlock[] }>(
        `${NOTION_BASE}/blocks/${v.page_id}/children`,
        { children },
        { headers: notionHeaders() }
    );

    return { appended: response.data.results.length, page_id: v.page_id };
}

export async function queryDatabase(input: z.infer<typeof QueryDatabaseSchema>) {
    const v = QueryDatabaseSchema.parse(input);
    const response = await axios.post<{
        results: Array<{ id: string; url: string; properties: Record<string, unknown> }>;
        has_more: boolean;
    }>(
        `${NOTION_BASE}/databases/${v.database_id}/query`,
        { filter: v.filter, sorts: v.sorts, page_size: v.limit },
        { headers: notionHeaders() }
    );

    return {
        entries: response.data.results.map(r => ({ id: r.id, url: r.url, properties: r.properties })),
        total: response.data.results.length,
        has_more: response.data.has_more,
    };
}

export async function updatePage(input: z.infer<typeof UpdatePageSchema>) {
    const v = UpdatePageSchema.parse(input);
    const body: Record<string, unknown> = {};
    if (v.title) body.properties = { ...(v.properties ?? {}), title: { title: [{ type: 'text', text: { content: v.title } }] } };
    if (v.properties && !v.title) body.properties = v.properties;
    if (v.archived !== undefined) body.archived = v.archived;
    if (v.icon) body.icon = { type: 'emoji', emoji: v.icon };

    const response = await axios.patch<{ id: string; url: string }>(
        `${NOTION_BASE}/pages/${v.page_id}`,
        body,
        { headers: notionHeaders() }
    );
    return { id: response.data.id, url: response.data.url };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const NOTION_MCP_TOOLS = [
    {
        name: 'notion_search',
        description: 'Search Notion workspace for pages and databases by keyword.',
        inputSchema: SearchNotionSchema,
        handler: searchNotion,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'notion_get_page',
        description: 'Get a Notion page including its full body content.',
        inputSchema: GetPageSchema,
        handler: getPage,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'notion_create_page',
        description: 'Create a Notion page or database entry with title, content, and icon.',
        inputSchema: CreatePageSchema,
        handler: createPage,
        agentPermissions: ['ORACLE', 'STUDIO', 'RELAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'notion_append_blocks',
        description: 'Append blocks (paragraphs, headings, code, callouts, lists) to a Notion page.',
        inputSchema: AppendBlocksSchema,
        handler: appendBlocks,
        agentPermissions: ['ORACLE', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'notion_query_database',
        description: 'Query a Notion database with filters and sorting.',
        inputSchema: QueryDatabaseSchema,
        handler: queryDatabase,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'notion_update_page',
        description: 'Update an existing Notion page title, properties, icon, or archive status.',
        inputSchema: UpdatePageSchema,
        handler: updatePage,
        agentPermissions: ['ORACLE', 'STUDIO'],
        estimatedCost: 'Free',
    },
];
