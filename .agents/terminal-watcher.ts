import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const REPO_ROOT = process.env.INCEPTION_REPO_ROOT || process.cwd();
const QUEUE_DIR = join(REPO_ROOT, '.agents', 'terminal_queue');

console.log(`[Terminal Watcher] ◉ Booting Creative Liberation Engine terminal handoff daemon...`);
console.log(`[Terminal Watcher]   Watching → ${QUEUE_DIR}`);

async function ensureQueueDir(): Promise<void> {
    try {
        await fs.mkdir(QUEUE_DIR, { recursive: true });
    } catch (e: any) {
        if (e.code !== 'EEXIST') throw e;
    }
}

async function processRequest(filePath: string, taskId: string): Promise<void> {
    console.log(`\n[Terminal Watcher] ▶ Picked up terminal request: ${taskId}`);
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const req = JSON.parse(raw);

        console.log(`[Terminal Watcher]   Command: ${req.command}`);
        if (req.cwd) console.log(`[Terminal Watcher]   CWD: ${req.cwd}`);

        const execOptions = {
            cwd: req.cwd ? join(REPO_ROOT, req.cwd) : REPO_ROOT
        };

        let stdout = '';
        let stderr = '';
        let exitCode = 0;

        try {
            const { stdout: out, stderr: err } = await execAsync(req.command, execOptions);
            stdout = out;
            stderr = err;
        } catch (execErr: any) {
            stdout = execErr.stdout || '';
            stderr = execErr.stderr || execErr.message;
            exitCode = execErr.code || 1;
        }

        console.log(`[Terminal Watcher] ✔ Completed ${taskId} (Exit: ${exitCode})`);

        const responsePayload = {
            id: taskId,
            stdout,
            stderr,
            exitCode
        };

        await fs.writeFile(
            join(QUEUE_DIR, `response-${taskId}.json`),
            JSON.stringify(responsePayload, null, 2)
        );

    } catch (err: any) {
        console.error(`[Terminal Watcher] ✖ Failed to process request ${taskId}:`, err.message);
        // Write a failure response so the MCP tool doesn't hang until timeout
        try {
            await fs.writeFile(
                join(QUEUE_DIR, `response-${taskId}.json`),
                JSON.stringify({
                    id: taskId,
                    stdout: '',
                    stderr: `Watcher Internal Error: ${err.message}`,
                    exitCode: 1
                }, null, 2)
            );
        } catch (writeErr) {
            // Give up
        }
    }
}

async function pollQueue() {
    try {
        await ensureQueueDir();
        const files = await fs.readdir(QUEUE_DIR);
        
        for (const file of files) {
            if (file.startsWith('request-') && file.endsWith('.json')) {
                const taskId = file.replace('request-', '').replace('.json', '');
                
                // Only process if we haven't already processed it (avoid race conditions if exec takes a while)
                // We rename or delete it to claim it. Instead of locking, let's just claim by renaming it.
                const originalPath = join(QUEUE_DIR, file);
                const claimedPath = join(QUEUE_DIR, `claimed-${taskId}.json`);
                
                try {
                    await fs.rename(originalPath, claimedPath);
                    // Successfully claimed, process it
                    await processRequest(claimedPath, taskId);
                    // Clean up the claimed file after responding
                    await fs.unlink(claimedPath).catch(() => {});
                } catch (e: any) {
                    // If rename fails, another watcher instance might have grabbed it.
                    if (e.code !== 'ENOENT') {
                        console.error(`[Terminal Watcher] Failed to claim ${taskId}:`, e.message);
                    }
                }
            }
        }
    } catch (err: any) {
        if (err.code !== 'ENOENT') {
            console.error('[Terminal Watcher] Polling error:', err.message);
        }
    }
}

// Start polling every 1000ms
setInterval(pollQueue, 1000);
pollQueue(); // Initial run
