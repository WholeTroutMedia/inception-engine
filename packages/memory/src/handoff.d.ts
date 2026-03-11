/**
 * HandoffService — TRINITY-1 Protocol
 *
 * Reads and writes the HANDOFF.md file at repo root.
 * Maintains an append-only log in .agents/handoff-log/
 * VERA calls this on every boot to detect mid-task handoffs.
 */
export type HandoffPhase = 'PROBE' | 'PLAN' | 'SHIP' | 'VERIFY';
export type HandoffSource = 'PERPLEXITY' | 'ANTIGRAVITY' | 'CLAUDE-CODE';
export interface HandoffState {
    from: HandoffSource;
    phase: HandoffPhase;
    task: string;
    taskId?: string;
    outputs: string[];
    next: string;
    context: string;
    timestamp: string;
    veraMemoryRef?: string;
}
export declare class HandoffService {
    /**
     * Read HANDOFF.md and parse the current state.
     * Returns null if the file does not exist or cannot be parsed.
     */
    readHandoff(): Promise<HandoffState | null>;
    /**
     * Write a new state to HANDOFF.md (updates the JSON block in the file).
     * Also appends to the handoff-log directory.
     */
    writeHandoff(state: Omit<HandoffState, 'timestamp'> & {
        timestamp?: string;
    }): Promise<void>;
    /**
     * Get full history of HANDOFF.md transitions.
     */
    getHandoffHistory(): Promise<HandoffState[]>;
    /**
     * Check if there is a pending handoff that Creative Liberation Engine should auto-resume.
     * Returns the state if auto-resume is appropriate, null otherwise.
     */
    checkAutoResume(): Promise<HandoffState | null>;
    private logTransition;
}
export declare const handoffService: HandoffService;
