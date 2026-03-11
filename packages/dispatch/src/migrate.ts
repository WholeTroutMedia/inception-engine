// Creative Liberation Engine Dispatch — First-Boot Migration
// Auto-imports tasks from .agents/dispatch/task-queue.md on first run
// Runs once: if tasks.json already has data, skips silently.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTasks, saveTask } from './store.js';
import type { Task } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MARKDOWN_QUEUE = path.resolve(
    __dirname,
    '../../../../.agents/dispatch/task-queue.md'
);

export async function migrateFromMarkdown(): Promise<void> {
    // Skip if we already have tasks in the JSON store
    const existing = await getTasks();
    if (existing.length > 0) {
        console.log(`[migrate] Store has ${existing.length} tasks — skipping migration`);
        return;
    }

    try {
        await fs.access(MARKDOWN_QUEUE);
    } catch {
        console.log('[migrate] No task-queue.md found — starting fresh');
        return;
    }

    const content = await fs.readFile(MARKDOWN_QUEUE, 'utf-8');
    const lines = content.split('\n');

    // Find the Active Tasks table rows (skip header rows)
    // Format: | ID | Task | Workstream | Priority | Owner | Status | Added |
    const tableRows = lines.filter(l =>
        l.startsWith('|') &&
        !l.startsWith('| ID') &&
        !l.startsWith('|---') &&
        !l.includes('—')
    );

    let migrated = 0;
    for (const row of tableRows) {
        const cols = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length < 5) continue;

        const [id, title, workstream, priority, , status, added] = cols;
        if (!id?.startsWith('T') || !title) continue;

        const task: Task = {
            id,
            org: 'Creative Liberation Engine Community',
            project: 'brainchild-v5',
            workstream: workstream?.replace(/`/g, '') ?? 'free',
            title,
            priority: (['P0', 'P1', 'P2', 'P3'].includes(priority) ? priority : 'P2') as Task['priority'],
            status: (status === 'active' ? 'queued' : 'queued') as Task['status'], // reset all to queued
            dependencies: [],
            parent_task_id: null,
            spawned_by: null,
            assigned_to_agent: null,
            assigned_to_capability: null,
            claimed_by: null,
            claimed_at: null,
            completed_at: null,
            handoff_note: null,
            artifacts: [],
            created: added ? new Date(added).toISOString() : new Date().toISOString(),
            created_by: 'migration',
            updated: new Date().toISOString(),
        };

        await saveTask(task);
        migrated++;
    }

    console.log(`[migrate] ✅ Migrated ${migrated} tasks from task-queue.md`);
}
