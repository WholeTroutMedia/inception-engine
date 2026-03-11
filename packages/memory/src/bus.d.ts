/**
 * MemoryBus — Unified Agent Memory Interface (v2)
 * Pillar 3: Live Compound Intelligence
 *
 * Hierarchical CLS-inspired memory taxonomy:
 *   operational/  → PROCEDURAL  (sessions, agents, projects)
 *   cognitive/    → SEMANTIC    (decisions, patterns, learnings)
 *   contextual/   → EPISODIC    (users, events)
 *
 * Every write uses the universal envelope:
 *   { id, ts, surface, trace_id, agent, level, payload }
 *
 * Fan-out: Local JSONL (always) → ChromaDB (when online) → Git sync queue
 *
 * Constitutional: Article VII (Knowledge Compounding) — every execution
 * must contribute to the system's knowledge base.
 */
import { z } from 'genkit';
import 'dotenv/config';
export interface MemoryEnvelope {
    id: string;
    ts: string;
    surface: string;
    trace_id: string;
    agent: string;
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    payload: Record<string, unknown>;
}
declare class GitSyncQueue {
    private pendingCount;
    private flushTimer;
    private readonly flushIntervalMs;
    constructor(flushIntervalMs?: number);
    start(): void;
    mark(): void;
    flush(reason?: string): Promise<void>;
    stop(): void;
}
export declare const MemoryEntrySchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    agentName: z.ZodString;
    task: z.ZodString;
    outcome: z.ZodString;
    pattern: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    sessionId: z.ZodString;
    durationMs: z.ZodOptional<z.ZodNumber>;
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    agentName: string;
    tags: string[];
    id: string;
    timestamp: string;
    task: string;
    outcome: string;
    sessionId: string;
    success: boolean;
    pattern?: string | undefined;
    durationMs?: number | undefined;
}, {
    agentName: string;
    id: string;
    timestamp: string;
    task: string;
    outcome: string;
    sessionId: string;
    success: boolean;
    tags?: string[] | undefined;
    pattern?: string | undefined;
    durationMs?: number | undefined;
}>;
export declare const MemoryQuerySchema: z.ZodObject<{
    query: z.ZodString;
    agentName: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    successOnly: z.ZodDefault<z.ZodBoolean>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    successOnly: boolean;
    agentName?: string | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
}, {
    query: string;
    agentName?: string | undefined;
    limit?: number | undefined;
    successOnly?: boolean | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
}>;
export declare const MemoryWriteSchema: z.ZodObject<{
    agentName: z.ZodString;
    task: z.ZodString;
    outcome: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    sessionId: z.ZodString;
    durationMs: z.ZodOptional<z.ZodNumber>;
    success: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    agentName: string;
    tags: string[];
    task: string;
    outcome: string;
    sessionId: string;
    success: boolean;
    metadata?: Record<string, unknown> | undefined;
    durationMs?: number | undefined;
}, {
    agentName: string;
    task: string;
    outcome: string;
    sessionId: string;
    metadata?: Record<string, unknown> | undefined;
    tags?: string[] | undefined;
    durationMs?: number | undefined;
    success?: boolean | undefined;
}>;
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;
export type MemoryWrite = z.infer<typeof MemoryWriteSchema>;
export type PatternExtractor = (task: string, outcome: string) => Promise<string>;
export declare class MemoryBus {
    private sessionId;
    private chroma;
    private chromaOnline;
    readonly gitSync: GitSyncQueue;
    private patternExtractor?;
    constructor(sessionId?: string);
    setPatternExtractor(extractor: PatternExtractor): void;
    private _attachSignalHandlers;
    writeToSurface(surface: string, agent: string, payload: Record<string, unknown>, options?: {
        level?: MemoryEnvelope['level'];
        traceId?: string;
        subKey?: string;
    }): MemoryEnvelope;
    private isChromaAvailable;
    recall(query: MemoryQuery): Promise<MemoryEntry[]>;
    commit(write: MemoryWrite): Promise<MemoryEntry>;
    withMemory<T>(agentName: string, task: string, tags: string[], fn: (context: MemoryEntry[]) => Promise<T>): Promise<T>;
    scribeSessionSummary(): Promise<string>;
    logBoot(system: string, version: string, bootDurationMs: number, meta?: Record<string, unknown>): void;
    logShutdown(system: string, reason?: string): void;
    logDecision(agent: string, decision: string, rationale: string, tags?: string[]): void;
    logUserInteraction(userId: string, summary: string, mode?: string): void;
}
export declare const memoryBus: MemoryBus;
export {};
