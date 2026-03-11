/**
 * Process Post — Creative Timeline Model
 * Records the creative history of a project as an interactive timeline.
 * Each "diff" entry captures what changed across which engine.
 * T-IECR-SOC-001
 */

// ── Types ─────────────────────────────────────────────────────────

export type ProcessPostEntryType =
    | "engine_task"      // IE engine completed a subtask
    | "user_prompt"      // User issued a directive
    | "asset_created"    // New asset generated
    | "asset_revised"    // Asset was revised
    | "collaboration"    // Another user joined / contributed
    | "milestone"        // Project milestone reached
    | "provenance"       // Blockchain provenance recorded
    | "snapshot";        // Full project state snapshot

export interface ProcessPostEntry {
    id: string;
    type: ProcessPostEntryType;
    timestamp: string;
    engine?: string;           // Which IE engine (VIDEO, AUDIO, etc.)
    author?: string;           // User/agent handle
    title: string;
    description: string;
    assetId?: string;
    assetUrl?: string;
    thumbnailUrl?: string;
    metadata: Record<string, unknown>;
    parentId?: string;         // For threaded context
    tags: string[];
}

export interface ProcessPost {
    id: string;
    projectId: string;
    projectTitle: string;
    createdAt: string;
    updatedAt: string;
    owner: {
        handle: string;
        identifier?: string;     // Wallet address / DID in Phase 2
    };
    collaborators: string[];
    entries: ProcessPostEntry[];
    totalEngineTime: Record<string, number>; // engine → ms
    tags: string[];
    isPublic: boolean;
    provenanceManifestId?: string;
}

// ── Factory ───────────────────────────────────────────────────────

export function createProcessPost(params: {
    projectId: string;
    projectTitle: string;
    ownerHandle: string;
    isPublic?: boolean;
    tags?: string[];
}): ProcessPost {
    const now = new Date().toISOString();
    return {
        id: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        projectId: params.projectId,
        projectTitle: params.projectTitle,
        createdAt: now,
        updatedAt: now,
        owner: { handle: params.ownerHandle },
        collaborators: [],
        entries: [],
        totalEngineTime: {},
        tags: params.tags ?? [],
        isPublic: params.isPublic ?? false,
    };
}

export function addEntry(post: ProcessPost, entry: Omit<ProcessPostEntry, "id" | "timestamp">): ProcessPost {
    const newEntry: ProcessPostEntry = {
        ...entry,
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
    };

    // Track engine time (if entry carries durationMs in metadata)
    if (entry.engine && typeof entry.metadata.durationMs === "number") {
        const current = post.totalEngineTime[entry.engine] ?? 0;
        post.totalEngineTime[entry.engine] = current + entry.metadata.durationMs;
    }

    return {
        ...post,
        entries: [...post.entries, newEntry],
        updatedAt: new Date().toISOString(),
    };
}

export function getTimeline(post: ProcessPost): ProcessPostEntry[] {
    return [...post.entries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
}
