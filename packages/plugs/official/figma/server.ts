import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — Figma MCP Adapter ────────────────────────────────────────────
// Connects Creative Liberation Engine agents to Figma for design token extraction,
// component inspection, and brand asset generation.

const FIGMA_BASE = 'https://api.figma.com/v1';

const ENV_FIGMA = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };

function figmaHeaders() {
    const token = ENV_FIGMA.process?.env?.['FIGMA_ACCESS_TOKEN'];
    if (!token) throw new Error('FIGMA_ACCESS_TOKEN not configured');
    return { 'X-Figma-Token': token };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const FigmaFileInputSchema = z.object({
    file_key: z.string().describe('Figma file key from the URL (figma.com/file/KEY/...)'),
    node_ids: z.array(z.string()).optional().describe('Specific node IDs to inspect'),
});

export const FigmaDesignTokensInputSchema = z.object({
    file_key: z.string(),
    export_format: z.enum(['css_variables', 'json', 'style_dictionary']).default('css_variables'),
});

export const FigmaExportInputSchema = z.object({
    file_key: z.string(),
    node_ids: z.array(z.string()).min(1),
    format: z.enum(['png', 'svg', 'pdf', 'jpg']).default('svg'),
    scale: z.number().min(0.5).max(4).default(2).describe('Export scale (for raster formats)'),
});

export const FigmaCommentInputSchema = z.object({
    file_key: z.string(),
    message: z.string(),
    x: z.number().optional(),
    y: z.number().optional(),
    node_id: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface FigmaColor { r: number; g: number; b: number; a?: number }
interface FigmaStyle { name: string; styleType: string; description: string }

function rgbaToHex(color: FigmaColor): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = Math.round((color.a ?? 1) * 255);
    const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    return a < 255 ? `#${hex}${a.toString(16).padStart(2, '0')}` : `#${hex}`;
}

function toCSSVar(name: string): string {
    return `--${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function getFigmaFile(input: z.infer<typeof FigmaFileInputSchema>) {
    const v = FigmaFileInputSchema.parse(input);
    console.log(`[PLUG/FIGMA] 📐 Fetching file: ${v.file_key}`);

    const params = v.node_ids?.length ? `?ids=${v.node_ids.join(',')}` : '';
    const endpoint = v.node_ids?.length
        ? `${FIGMA_BASE}/files/${v.file_key}/nodes${params}`
        : `${FIGMA_BASE}/files/${v.file_key}`;

    const response = await axios.get(endpoint, { headers: figmaHeaders() });
    const data = response.data as {
        name: string;
        lastModified: string;
        thumbnailUrl: string;
        styles: Record<string, FigmaStyle>;
        components: Record<string, { name: string; description: string }>;
    };

    return {
        name: data.name,
        last_modified: data.lastModified,
        thumbnail_url: data.thumbnailUrl,
        styles_count: Object.keys(data.styles ?? {}).length,
        components_count: Object.keys(data.components ?? {}).length,
        styles: Object.values(data.styles ?? {}).map((s: FigmaStyle) => ({
            name: s.name,
            type: s.styleType,
            description: s.description,
        })),
    };
}

export async function extractDesignTokens(input: z.infer<typeof FigmaDesignTokensInputSchema>) {
    const v = FigmaDesignTokensInputSchema.parse(input);
    console.log(`[PLUG/FIGMA] 🎨 Extracting design tokens from ${v.file_key}`);

    const response = await axios.get(`${FIGMA_BASE}/files/${v.file_key}/styles`, {
        headers: figmaHeaders(),
    });

    interface FigmaStyleMeta {
        node_id: string;
        style_type: string;
        name: string;
        description: string;
    }

    const styles = (response.data as { meta: { styles: FigmaStyleMeta[] } }).meta.styles;

    // Fetch node details for colors
    const nodeIds = styles.slice(0, 100).map((s: FigmaStyleMeta) => s.node_id);
    let nodesData: Record<string, { document?: { fills?: Array<{ color: FigmaColor }> } }> = {};

    if (nodeIds.length > 0) {
        const nodesResp = await axios.get(
            `${FIGMA_BASE}/files/${v.file_key}/nodes?ids=${nodeIds.join(',')}`,
            { headers: figmaHeaders() }
        );
        nodesData = (nodesResp.data as { nodes: typeof nodesData }).nodes ?? {};
    }

    const colorTokens: Record<string, string> = {};
    const textTokens: Record<string, string> = {};

    styles.forEach((style: FigmaStyleMeta) => {
        const nodeData = nodesData[style.node_id];
        const cssVarName = toCSSVar(style.name);

        if (style.style_type === 'FILL' && nodeData?.document?.fills?.[0]?.color) {
            colorTokens[cssVarName] = rgbaToHex(nodeData.document.fills[0].color);
        } else if (style.style_type === 'TEXT') {
            textTokens[cssVarName] = style.name;
        }
    });

    if (v.export_format === 'css_variables') {
        const css = [
            ':root {',
            ...Object.entries(colorTokens).map(([k, v]) => `  ${k}: ${v};`),
            ...Object.entries(textTokens).map(([k, v]) => `  /* ${k}: ${v}; */`),
            '}',
        ].join('\n');
        return { format: 'css_variables', output: css, color_count: Object.keys(colorTokens).length };
    }

    if (v.export_format === 'json') {
        return {
            format: 'json',
            output: JSON.stringify({ colors: colorTokens, text: textTokens }, null, 2),
            color_count: Object.keys(colorTokens).length,
        };
    }

    return {
        format: 'raw',
        colors: colorTokens,
        text: textTokens,
        color_count: Object.keys(colorTokens).length,
    };
}

export async function exportNodes(input: z.infer<typeof FigmaExportInputSchema>) {
    const v = FigmaExportInputSchema.parse(input);
    console.log(`[PLUG/FIGMA] 📦 Exporting ${v.node_ids.length} nodes as ${v.format}`);

    const params = new URLSearchParams({
        ids: v.node_ids.join(','),
        format: v.format,
        scale: String(v.scale),
    });

    const response = await axios.get(
        `${FIGMA_BASE}/images/${v.file_key}?${params}`,
        { headers: figmaHeaders() }
    );

    const images = (response.data as { images: Record<string, string> }).images;
    return {
        exports: Object.entries(images).map(([nodeId, url]) => ({ node_id: nodeId, url, format: v.format })),
        count: Object.keys(images).length,
    };
}

export async function postComment(input: z.infer<typeof FigmaCommentInputSchema>) {
    const v = FigmaCommentInputSchema.parse(input);
    const payload: Record<string, unknown> = { message: v.message };
    if (v.x !== undefined && v.y !== undefined) payload.client_meta = { x: v.x, y: v.y };
    if (v.node_id) payload.client_meta = { ...(payload.client_meta as object), node_id: v.node_id };

    const response = await axios.post(`${FIGMA_BASE}/files/${v.file_key}/comments`, payload, {
        headers: { ...figmaHeaders(), 'Content-Type': 'application/json' },
    });

    return { comment_id: (response.data as { id: string }).id, message: v.message };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const FIGMA_MCP_TOOLS = [
    {
        name: 'figma_get_file',
        description: 'Get metadata, style count, and component count from a Figma file.',
        inputSchema: FigmaFileInputSchema,
        handler: getFigmaFile,
        agentPermissions: ['ORACLE', 'GOD_PROMPT', 'NOVA'],
        estimatedCost: 'Free',
    },
    {
        name: 'figma_extract_design_tokens',
        description: 'Extract color and typography design tokens from a Figma file, formatted as CSS variables, JSON, or raw.',
        inputSchema: FigmaDesignTokensInputSchema,
        handler: extractDesignTokens,
        agentPermissions: ['GOD_PROMPT', 'NOVA', 'ORACLE'],
        estimatedCost: 'Free',
    },
    {
        name: 'figma_export_nodes',
        description: 'Export Figma nodes as PNG, SVG, PDF, or JPG. Returns download URLs.',
        inputSchema: FigmaExportInputSchema,
        handler: exportNodes,
        agentPermissions: ['GOD_PROMPT', 'NOVA', 'ORACLE', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'figma_post_comment',
        description: 'Post a comment on a Figma file, optionally pinned to specific coordinates or a node.',
        inputSchema: FigmaCommentInputSchema,
        handler: postComment,
        agentPermissions: ['ORACLE', 'STUDIO', 'RELAY'],
        estimatedCost: 'Free',
    },
];
