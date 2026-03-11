import * as fs from 'fs';
import * as path from 'path';
import type { Task } from './types.js';

// The path where the JSONL training corpus accumulates
const CORPUS_DIR = path.join(process.cwd(), '../../.agents/scribe/training_corpus');
const CORPUS_FILE = path.join(CORPUS_DIR, 'baseline.jsonl');

interface ArchaeonTriple {
    system: string;
    instruction: string;
    input: any;
    chosen: string;
    rejected?: string;
    outcome_signal: 'success' | 'failure';
    execution_time_ms: number;
}

/**
 * Transforms a completed dispatch task into a formal LoRA training triple
 * and appends it to the SCRIBE JSONL corpus for future fine-tuning.
 */
export async function logArchaeonTrainingSample(task: Task, success: boolean, executionTimeMs: number = 0) {
    try {
        if (!fs.existsSync(CORPUS_DIR)) {
            fs.mkdirSync(CORPUS_DIR, { recursive: true });
        }

        const sample: ArchaeonTriple = {
            system: "You are AVERI, the dispatch orchestrator for the Creative Liberation Engine. Your constraints are Article IX (No MVPs) and Article XX (Zero-Day GTM automation).",
            instruction: "Evaluate the following task state and determine the next action and executing agent.",
            input: {
                task_id: task.id,
                workstream: task.workstream,
                priority: task.priority,
                description: task.title + (task.description ? ' - ' + task.description : ''),
                dependencies: task.dependencies,
                assigned_agent: task.claimed_by || 'unknown'
            },
            chosen: `Task claimed by ${task.claimed_by}. Resolution note: ${task.handoff_note || 'Completed without note'}. Artifacts: ${(task.artifacts || []).join(', ')}`,
            outcome_signal: success ? 'success' : 'failure',
            execution_time_ms: executionTimeMs
        };

        if (!success) {
            // For failed tasks, the action taken was 'rejected', and we leave 'chosen' empty for now 
            // until we have a formal DPO pipeline that provides the *correct* alternative.
            sample.rejected = sample.chosen;
            sample.chosen = "Escalate for human review or pivot strategy.";
        }

        fs.appendFileSync(CORPUS_FILE, JSON.stringify(sample) + '\n');
        console.log(`[archaeon] Logged training sample for ${task.id} -> ${sample.outcome_signal}`);
    } catch (err) {
        console.error(`[archaeon] Failed to write training sample:`, err);
    }
}
