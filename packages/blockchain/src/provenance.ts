/**
 * C2PA-Compatible Provenance
 * Records creation metadata for every IE creative asset.
 * Phase 1: local JSON manifest (no on-chain write yet).
 * Phase 2: anchor manifest hash to blockchain.
 * T-IECR-BC-001
 */

import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// ── C2PA Manifest ─────────────────────────────────────────────────

export interface C2PAAssertion {
    label: string;
    data: Record<string, unknown>;
}

export interface C2PAManifest {
    manifestId: string;
    assetId: string;
    assetType: string;
    title: string;
    createdAt: string;
    creator: {
        name: string;
        identifier: string; // wallet address or DID, optional in P1
    };
    engines: string[];   // Which IE engines touched this asset
    sessionId: string;
    assertions: C2PAAssertion[];
    contentHash?: string;
    chainAnchor?: {      // Phase 2: on-chain anchor
        chain: string;
        txHash: string;
        blockNumber: number;
        anchoredAt: string;
    };
}

// ── Provenance Store ─────────────────────────────────────────────

const STORE_DIR = process.env.PROVENANCE_STORE ?? "./data/provenance";

export async function recordProvenance(params: {
    assetId: string;
    assetType: string;
    title: string;
    engines: string[];
    sessionId: string;
    creatorIdentifier?: string;
    content?: Buffer;
    extra?: Record<string, unknown>;
}): Promise<C2PAManifest> {
    await mkdir(STORE_DIR, { recursive: true });

    const contentHash = params.content
        ? createHash("sha256").update(params.content).digest("hex")
        : undefined;

    const manifest: C2PAManifest = {
        manifestId: `IE-${randomUUID()}`,
        assetId: params.assetId,
        assetType: params.assetType,
        title: params.title,
        createdAt: new Date().toISOString(),
        creator: {
            name: "Creative Liberation Engine IECR",
            identifier: params.creatorIdentifier ?? "anonymous",
        },
        engines: params.engines,
        sessionId: params.sessionId,
        assertions: [
            {
                label: "c2pa.creative.workflow",
                data: {
                    enginePipeline: params.engines,
                    sessionId: params.sessionId,
                    platform: "Creative Liberation Engine v5 GENESIS",
                },
            },
            ...(params.extra ? [{ label: "ie.metadata", data: params.extra }] : []),
        ],
        contentHash,
    };

    const filePath = join(STORE_DIR, `${manifest.manifestId}.json`);
    await writeFile(filePath, JSON.stringify(manifest, null, 2), "utf-8");

    return manifest;
}

export async function getProvenance(manifestId: string): Promise<C2PAManifest | null> {
    try {
        const filePath = join(STORE_DIR, `${manifestId}.json`);
        const raw = await readFile(filePath, "utf-8");
        return JSON.parse(raw) as C2PAManifest;
    } catch {
        return null;
    }
}

export function generateProvenanceMetadataBlock(manifest: C2PAManifest): Record<string, string> {
    return {
        "ie:manifestId": manifest.manifestId,
        "ie:sessionId": manifest.sessionId,
        "ie:engines": manifest.engines.join(","),
        "ie:createdAt": manifest.createdAt,
        "ie:contentHash": manifest.contentHash ?? "",
        "xmp:CreatorTool": "Creative Liberation Engine v5 GENESIS",
    };
}
