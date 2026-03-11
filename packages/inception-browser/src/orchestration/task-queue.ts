/**
 * Task Queue — in-memory priority queue for parallel browser task dispatch.
 * Agents submit tasks; the pool executor pulls from this queue.
 */

export type TaskPriority = "P1" | "P2" | "P3";

export interface BrowserTask {
    id: string;
    agentId: string;
    tool: string;
    args: Record<string, unknown>;
    priority: TaskPriority;
    status: "queued" | "running" | "done" | "failed";
    createdAt: Date;
    result?: unknown;
    error?: string;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { P1: 0, P2: 1, P3: 2 };

export class TaskQueue {
    private queue: BrowserTask[] = [];
    private counter = 0;

    enqueue(agentId: string, tool: string, args: Record<string, unknown>, priority: TaskPriority = "P2"): BrowserTask {
        const task: BrowserTask = {
            id: `btask-${++this.counter}`,
            agentId,
            tool,
            args,
            priority,
            status: "queued",
            createdAt: new Date(),
        };
        this.queue.push(task);
        this.queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        return task;
    }

    dequeue(): BrowserTask | null {
        const next = this.queue.find(t => t.status === "queued");
        if (!next) return null;
        next.status = "running";
        return next;
    }

    complete(id: string, result: unknown): void {
        const task = this.queue.find(t => t.id === id);
        if (task) { task.status = "done"; task.result = result; }
    }

    fail(id: string, error: string): void {
        const task = this.queue.find(t => t.id === id);
        if (task) { task.status = "failed"; task.error = error; }
    }

    status(): { queued: number; running: number; done: number; failed: number } {
        return {
            queued: this.queue.filter(t => t.status === "queued").length,
            running: this.queue.filter(t => t.status === "running").length,
            done: this.queue.filter(t => t.status === "done").length,
            failed: this.queue.filter(t => t.status === "failed").length,
        };
    }

    all(): BrowserTask[] { return [...this.queue]; }
}

export const taskQueue = new TaskQueue();
