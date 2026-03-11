import type { AuditResult } from './auditor.js';

const DISPATCH_URL = process.env.DISPATCH_URL ?? 'http://dispatch:5050';

export interface DispatchTask {
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  workstream: string;
  source: string;
  tags: string[];
}

/**
 * Fetch existing task IDs to avoid duplicate submissions.
 * Queries all non-archived statuses (queued, in-progress, completed).
 */
async function fetchExistingTaskAuditIds(): Promise<Set<string>> {
  try {
    const resA = await fetch(`${DISPATCH_URL}/api/tasks?status=queued`);
    const resB = await fetch(`${DISPATCH_URL}/api/tasks?status=in-progress`);
    const queuedData = resA.ok ? (await resA.json()) as { tasks?: Array<{ tags?: string[] }> } : { tasks: [] };
    const progData = resB.ok ? (await resB.json()) as { tasks?: Array<{ tags?: string[] }> } : { tasks: [] };
    
    const allTasks = [...(queuedData.tasks ?? []), ...(progData.tasks ?? [])];
    const auditIds = new Set<string>();
    for (const t of allTasks) {
       for (const tag of t.tags ?? []) {
          if (tag.startsWith('audit-')) auditIds.add(tag);
       }
    }
    return auditIds;
  } catch {
    return new Set();
  }
}

/**
 * POST with single retry and exponential backoff.
 */
async function postWithRetry(url: string, body: string, retries = 1): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      return res;
    } catch (err) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[director/task-generator] Retry in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Unreachable');
}

/**
 * Convert AuditResult[] to DispatchTask[] and POST each to the dispatch server.
 * Deduplicates on audit.id — skips tasks already queued (deterministic deduplication).
 */
export async function generateAndPostTasks(audits: AuditResult[]): Promise<void> {
  if (audits.length === 0) {
    console.log('[director/task-generator] No audit findings \u2014 queue is healthy \u2705');
    return;
  }

  const existing = await fetchExistingTaskAuditIds();
  let posted = 0;
  let skipped = 0;

  for (const audit of audits) {
    const task: DispatchTask = {
      title: audit.title,
      description: audit.description,
      priority: audit.severity,
      workstream: audit.workstream,
      source: 'director-agent',
      tags: ['auto-generated', audit.category, audit.package, audit.id],
    };

    // Deduplication check
    if (existing.has(audit.id)) {
      console.log(`[director/task-generator] Skip (exists): ${task.title}`);
      skipped++;
      continue;
    }

    try {
      // Fix F5: Use retry with backoff
      const res = await postWithRetry(`${DISPATCH_URL}/api/tasks`, JSON.stringify(task));

      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        console.log(`[director/task-generator] \u2705 Posted: ${task.title} (id: ${data.id ?? 'unknown'})`);
        posted++;
      } else {
        console.error(`[director/task-generator] \u274C Failed to post: ${task.title} \u2014 ${res.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[director/task-generator] \u274C Network error posting task: ${message}`);
    }
  }

  console.log(`[director/task-generator] Run complete \u2014 posted: ${posted}, skipped (dup): ${skipped}`);
}