/**
 * CONTINUITY ENGINE — Project-Specific Context Ingestion
 *
 * The IE equivalent of InterPositive's "daily footage" model training.
 * Instead of training on film dailies, the Continuity Engine ingests
 * a project's files, commits, brand assets, and design tokens —
 * building a project-scoped memory that makes agents smarter about
 * YOUR specific work, not generic templates.
 *
 * Supports: text files, code, markdown, JSON, PDFs (text extract),
 *           images (description via Gemini Vision), brand docs.
 *
 * Constitutional: Article X (Compound Learning), Article XX (Zero Day GTM)
 * Netflix/InterPositive validation: domain-specific fine-tuning from your data.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { chromaWrite } from './chromadb-retriever.js';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const AssetType = z.enum([
    'code',          // TypeScript, JS, Python, etc.
    'markdown',      // Docs, README, specs
    'json',          // Config, tokens, schemas
    'image',         // PNG, JPG, WebP — described via Gemini Vision
    'pdf',           // PDFs — text extracted
    'brand_doc',     // Brand guidelines, style guides
    'commit_log',    // Git commit messages as narrative
    'design_token',  // CSS vars, Figma tokens, theme files
    'unknown',
]);

export const ContinuityIngestInputSchema = z.object({
    projectId: z.string().describe(
        'Unique project identifier — becomes the ChromaDB collection namespace (project_{id}). ' +
        'Example: "zero-day", "nbc-nexus", "andgather"'
    ),
    projectName: z.string().describe('Human-readable project name'),
    assets: z.array(z.object({
        type: AssetType,
        content: z.string().describe('Text content OR base64-encoded binary for images/PDFs'),
        filename: z.string().describe('Original filename or path for metadata'),
        isBase64: z.boolean().default(false).describe('True if content is base64-encoded binary'),
    })).describe('Assets to ingest into the project memory'),
    extractDesignDNA: z.boolean().default(true).describe(
        'If true, AURORA analyzes ingested assets for visual DNA (palette, typography, motion rules)'
    ),
});

export const ContinuityIngestOutputSchema = z.object({
    projectId: z.string(),
    ingested: z.number().describe('Number of chunks successfully written'),
    collectionName: z.string().describe('ChromaDB collection name used'),
    designDNA: z.object({
        palette: z.array(z.string()).default([]),
        typography: z.array(z.string()).default([]),
        motionRules: z.array(z.string()).default([]),
        brandVoice: z.string().optional(),
        consistencyScore: z.number().min(0).max(100).optional(),
    }).optional().describe('Extracted visual DNA (if extractDesignDNA is true)'),
    warnings: z.array(z.string()).default([]),
    continuitySignature: z.literal('CONTINUITY_ENGINE').default('CONTINUITY_ENGINE'),
});

// ---------------------------------------------------------------------------
// Asset Processor
// ---------------------------------------------------------------------------

async function processAsset(
    asset: z.infer<typeof ContinuityIngestInputSchema>['assets'][number],
    projectId: string
): Promise<{ chunks: string[]; metadatas: Record<string, unknown>[]; warnings: string[] }> {
    const warnings: string[] = [];
    const chunks: string[] = [];
    const metadatas: Record<string, unknown>[] = [];

    const baseMetadata = {
        projectId,
        filename: asset.filename,
        assetType: asset.type,
        ingested_at: new Date().toISOString(),
        source: 'continuity_engine',
    };

    if (asset.isBase64 && asset.type === 'image') {
        // Gemini Vision: describe the image for semantic storage
        try {
            const { text } = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                prompt: [
                    {
                        media: {
                            url: `data:image/webp;base64,${asset.content}`,
                            contentType: 'image/webp',
                        },
                    },
                    {
                        text: `You are analyzing a creative asset for the "${projectId}" project. 
Describe: 1) Visual style and aesthetic 2) Color palette (hex values if identifiable) 
3) Typography (if visible) 4) Mood/tone 5) How this fits a brand system.
Be specific and technical. This description will be used for semantic search.`,
                    },
                ],
            });
            chunks.push(`[IMAGE: ${asset.filename}]\n${text}`);
            metadatas.push({ ...baseMetadata, contentType: 'image_description' });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            warnings.push(`Vision analysis failed for ${asset.filename}: ${msg}`);
        }
        return { chunks, metadatas, warnings };
    }

    // Text content — chunk by ~512 chars with overlap for better RAG
    const text = asset.content;
    if (!text || text.trim().length === 0) {
        warnings.push(`Empty content for ${asset.filename}, skipping`);
        return { chunks, metadatas, warnings };
    }

    const CHUNK_SIZE = 512;
    const OVERLAP = 64;
    if (text.length <= CHUNK_SIZE) {
        chunks.push(`[${asset.type.toUpperCase()}: ${asset.filename}]\n${text}`);
        metadatas.push({ ...baseMetadata, chunkIndex: 0, totalChunks: 1 });
    } else {
        let i = 0;
        let chunkIndex = 0;
        while (i < text.length) {
            const chunk = text.slice(i, i + CHUNK_SIZE);
            chunks.push(`[${asset.type.toUpperCase()}: ${asset.filename} chunk ${chunkIndex}]\n${chunk}`);
            metadatas.push({ ...baseMetadata, chunkIndex, totalChunks: Math.ceil(text.length / CHUNK_SIZE) });
            i += CHUNK_SIZE - OVERLAP;
            chunkIndex++;
        }
    }

    return { chunks, metadatas, warnings };
}

// ---------------------------------------------------------------------------
// Design DNA Extractor
// ---------------------------------------------------------------------------

async function extractDesignDNA(
    projectId: string,
    sampleContent: string
): Promise<z.infer<typeof ContinuityIngestOutputSchema>['designDNA']> {
    const AURORA_DESIGN_DNA_SCHEMA = z.object({
        palette: z.array(z.string()).describe('Color values found (hex, hsl, named)'),
        typography: z.array(z.string()).describe('Font families, sizes, weights found'),
        motionRules: z.array(z.string()).describe('Animation/transition rules or principles'),
        brandVoice: z.string().optional().describe('Brand tone/voice summary'),
        consistencyScore: z.number().min(0).max(100).describe(
            'How consistent is the visual language across this project (0-100)'
        ),
    });

    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        system: `You are AURORA — Lead Architect, extracting the Visual DNA of the "${projectId}" project. 
Analyze the provided content and identify the project's aesthetic fingerprint.
This DNA will be used to enforce consistency across all future AI-generated assets for this project.`,
        prompt: `Extract the Visual DNA from this project content:\n\n${sampleContent.slice(0, 3000)}`,
        output: { schema: AURORA_DESIGN_DNA_SCHEMA },
        config: { temperature: 0.1 },
    });

    return output ?? { palette: [], typography: [], motionRules: [], consistencyScore: 0 };
}

// ---------------------------------------------------------------------------
// Flow Definition
// ---------------------------------------------------------------------------

type ContinuityIngestOutput = z.infer<typeof ContinuityIngestOutputSchema>;
type ContinuityIngestInput = z.infer<typeof ContinuityIngestInputSchema>;

export const ContinuityEngineFlow = ai.defineFlow(
    {
        name: 'ContinuityEngine',
        inputSchema: ContinuityIngestInputSchema,
        outputSchema: ContinuityIngestOutputSchema,
    },
    async (input): Promise<ContinuityIngestOutput> => {
        console.log(
            `[CONTINUITY] 🎬 Ingesting ${input.assets.length} assets for project "${input.projectId}" (${input.projectName})`
        );

        const allWarnings: string[] = [];
        const allChunks: string[] = [];
        const allMetadatas: Record<string, unknown>[] = [];

        // Process all assets
        for (const asset of input.assets) {
            const { chunks, metadatas, warnings } = await processAsset(asset, input.projectId);
            allChunks.push(...chunks);
            allMetadatas.push(...metadatas);
            allWarnings.push(...warnings);
        }

        let ingested = 0;
        let collectionName = `project_${input.projectId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;

        if (allChunks.length > 0) {
            const result = await chromaWrite({
                texts: allChunks,
                metadatas: allMetadatas,
                projectId: input.projectId,
            });
            ingested = result.written;
            collectionName = result.collection;
        }

        // Extract Design DNA from a sample of the text content
        let designDNA: ContinuityIngestOutput['designDNA'] | undefined;
        if (input.extractDesignDNA && allChunks.length > 0) {
            try {
                const sampleChunks = allChunks.slice(0, 10).join('\n\n');
                designDNA = await extractDesignDNA(input.projectId, sampleChunks);
                console.log(`[CONTINUITY] 🎨 Design DNA extracted — consistency score: ${designDNA?.consistencyScore ?? 'N/A'}`);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                allWarnings.push(`Design DNA extraction failed: ${msg}`);
            }
        }

        console.log(
            `[CONTINUITY] ✅ ${ingested} chunks → "${collectionName}" | ${allWarnings.length} warnings`
        );

        return {
            projectId: input.projectId,
            ingested,
            collectionName,
            designDNA,
            warnings: allWarnings,
            continuitySignature: 'CONTINUITY_ENGINE',
        };
    }
);

// ---------------------------------------------------------------------------
// Filesystem Batch Helper — ingest a local directory
// ---------------------------------------------------------------------------

const SUPPORTED_EXTENSIONS: Record<string, z.infer<typeof AssetType>> = {
    '.ts': 'code', '.tsx': 'code', '.js': 'code', '.jsx': 'code', '.py': 'code',
    '.md': 'markdown', '.mdx': 'markdown',
    '.json': 'json', '.jsonc': 'json',
    '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.webp': 'image',
    '.css': 'design_token', '.scss': 'design_token',
};

export async function ingestDirectory(
    dirPath: string,
    projectId: string,
    projectName: string,
    opts: { maxFiles?: number; excludePatterns?: RegExp[] } = {}
): Promise<ContinuityIngestOutput> {
    const maxFiles = opts.maxFiles ?? 50;
    const excludePatterns = opts.excludePatterns ?? [/node_modules/, /\.git/, /dist/, /build/];

    const assets: ContinuityIngestInput['assets'] = [];

    function walk(dir: string): void {
        if (assets.length >= maxFiles) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const skip = excludePatterns.some(p => p.test(fullPath));
            if (skip) continue;
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                const assetType = SUPPORTED_EXTENSIONS[ext];
                if (!assetType) continue;

                if (assetType === 'image') {
                    const buffer = fs.readFileSync(fullPath);
                    assets.push({
                        type: 'image',
                        content: buffer.toString('base64'),
                        filename: fullPath,
                        isBase64: true,
                    });
                } else {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        if (content.length > 0 && content.length < 100_000) {
                            assets.push({ type: assetType, content, filename: fullPath, isBase64: false });
                        }
                    } catch { /* unreadable file, skip */ }
                }

                if (assets.length >= maxFiles) break;
            }
        }
    }

    walk(dirPath);
    console.log(`[CONTINUITY] 📂 Found ${assets.length} assets in "${dirPath}"`);

    // Run the flow
    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: 'placeholder', // flow invoked directly below
    });
    void output;

    return ContinuityEngineFlow({ projectId, projectName, assets, extractDesignDNA: true });
}

