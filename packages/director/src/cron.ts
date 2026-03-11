import cron from 'node-cron';
import { auditWorkspace } from './auditor.js';
import { generateAndPostTasks } from './task-generator.js';

const DISPATCH_URL = process.env.DISPATCH_URL ?? 'http://127.0.0.1:5050';
const AGENT_ID = 'director';
const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? '0 */6 * * *'; // every 6 hours
const DEPLOY_WINDOW = process.env.DEPLOY_WINDOW; // e.g. "09:00-17:00"

function isOutsideDeployWindow(): boolean {
  if (!DEPLOY_WINDOW) return false;
  
  const [start, end] = DEPLOY_WINDOW.split('-');
  if (!start || !end) return false;
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  return currentTime < start || currentTime > end;
}

async function sendHeartbeat(currentTask: string): Promise<void> {
  try {
    await fetch(`${DISPATCH_URL}/api/agents/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: AGENT_ID,
                    window: process.env.DEPLOY_WINDOW ?? 'nas',
        workstream: 'infra',
        current_task: currentTask,
        tool: 'director',
      }),
    });
  } catch {
    // Fire-and-forget â€” never block on heartbeat
  }
}

async function runAuditCycle(): Promise<void> {
  const now = new Date().toISOString();
  console.log(`\n[director/cron] â–¶ Audit cycle started â€” ${now}`);
  
  if (isOutsideDeployWindow()) {
    console.log(`[director/cron] â¸ Outside deploy window (${DEPLOY_WINDOW}) â€” skipping audit cycle.`);
    return;
  }
  
  await sendHeartbeat('Running codebase audit');

  try {
    const audits = await auditWorkspace();
    console.log(`[director/cron] Audit complete â€” ${audits.length} findings`);

    if (audits.length > 0) {
      console.log('[director/cron] Findings:');
      for (const a of audits) {
        console.log(`  ${a.severity} [${a.category}] ${a.title}`);
      }
    }

    await generateAndPostTasks(audits);
    await sendHeartbeat('Idle â€” next run in 6h');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[director/cron] âŒ Audit cycle failed: ${message}`);
    await sendHeartbeat(`Error: ${message.slice(0, 80)}`);
  }

  console.log(`[director/cron] â¸ Cycle complete â€” next run: ${CRON_SCHEDULE}\n`);
}

// Boot â€” run immediately on start, then on schedule
console.log(`[director] ðŸš€ Director Agent starting â€” schedule: ${CRON_SCHEDULE}`);
console.log(`[director] Dispatch: ${DISPATCH_URL}`);
console.log(`[director] Workspace: ${process.env.WORKSPACE_ROOT ?? '/workspace'}`);

// Run immediately on startup
runAuditCycle().catch((err) => {
  console.error('[director] Fatal on startup:', err);
});

// Schedule recurring runs
cron.schedule(CRON_SCHEDULE, () => {
  runAuditCycle().catch((err) => {
    console.error('[director] Fatal in cron run:', err);
  });
});

console.log('[director] Scheduler active â€” standing by...');
