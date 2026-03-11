/**
 * @module dispatch/tests/TaskQueue.test
 * @description Comprehensive test suite for TaskQueue
 * Closes #80 (partial)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskQueue, TaskSchema, AgentCapabilitySchema } from '../src/TaskQueue';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    type: 'test-task',
    priority: 'medium' as const,
    payload: { action: 'test' },
    createdAt: now(),
    ...overrides,
  };
}

function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    agentId: `agent-${uuid().slice(0, 8)}`,
    capabilities: ['code', 'search'],
    currentLoad: 0,
    maxConcurrent: 5,
    activeTasks: 0,
    status: 'idle' as const,
    ...overrides,
  };
}

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  describe('enqueue', () => {
    it('should enqueue a valid task', () => {
      const task = queue.enqueue(makeTask());
      expect(task.status).toBe('queued');
      expect(queue.getQueueLength()).toBe(1);
    });

    it('should reject invalid priority', () => {
      expect(() => queue.enqueue(makeTask({ priority: 'invalid' }))).toThrow();
    });

    it('should sort by priority weight', () => {
      queue.enqueue(makeTask({ priority: 'low' }));
      queue.enqueue(makeTask({ priority: 'critical' }));
      queue.enqueue(makeTask({ priority: 'medium' }));
      const tasks = queue.getQueue();
      expect(tasks[0].priority).toBe('critical');
      expect(tasks[1].priority).toBe('medium');
      expect(tasks[2].priority).toBe('low');
    });
  });

  describe('dequeue', () => {
    it('should dequeue highest priority task for agent', () => {
      const agent = makeAgent();
      queue.registerAgent(agent);
      queue.enqueue(makeTask({ priority: 'low' }));
      const critical = queue.enqueue(makeTask({ priority: 'critical' }));
      const dequeued = queue.dequeue(agent.agentId);
      expect(dequeued?.id).toBe(critical.id);
      expect(dequeued?.status).toBe('assigned');
      expect(dequeued?.assignedAgent).toBe(agent.agentId);
    });

    it('should respect agent capabilities', () => {
      const agent = makeAgent({ capabilities: ['code'] });
      queue.registerAgent(agent);
      queue.enqueue(makeTask({ requiredCapabilities: ['art'] }));
      const dequeued = queue.dequeue(agent.agentId);
      expect(dequeued).toBeUndefined();
    });

    it('should not dequeue for offline agent', () => {
      const agent = makeAgent({ status: 'offline' });
      queue.registerAgent(agent);
      queue.enqueue(makeTask());
      expect(queue.dequeue(agent.agentId)).toBeUndefined();
    });

    it('should not exceed maxConcurrent', () => {
      const agent = makeAgent({ maxConcurrent: 1 });
      queue.registerAgent(agent);
      queue.enqueue(makeTask());
      queue.enqueue(makeTask());
      queue.dequeue(agent.agentId);
      expect(queue.dequeue(agent.agentId)).toBeUndefined();
    });
  });

  describe('complete', () => {
    it('should mark task completed and release agent', () => {
      const agent = makeAgent();
      queue.registerAgent(agent);
      queue.enqueue(makeTask());
      const task = queue.dequeue(agent.agentId)!;
      const ok = queue.complete(task.id, { output: 'done' });
      expect(ok).toBe(true);
      expect(queue.getCompleted(task.id)?.status).toBe('completed');
      expect(queue.getAgent(agent.agentId)?.activeTasks).toBe(0);
    });

    it('should return false for unknown task', () => {
      expect(queue.complete(uuid())).toBe(false);
    });
  });

  describe('fail + retry', () => {
    it('should requeue on failure if retries remain', () => {
      const agent = makeAgent();
      queue.registerAgent(agent);
      queue.enqueue(makeTask({ maxRetries: 2 }));
      const task = queue.dequeue(agent.agentId)!;
      queue.fail(task.id, 'timeout');
      expect(queue.getQueueLength()).toBe(1);
      const requeued = queue.getQueue()[0];
      expect(requeued.retries).toBe(1);
      expect(requeued.status).toBe('queued');
    });

    it('should mark failed when retries exhausted', () => {
      const agent = makeAgent();
      queue.registerAgent(agent);
      queue.enqueue(makeTask({ maxRetries: 0 }));
      const task = queue.dequeue(agent.agentId)!;
      queue.fail(task.id, 'fatal');
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.getCompleted(task.id)?.status).toBe('failed');
    });
  });

  describe('cancel', () => {
    it('should cancel a queued task', () => {
      const task = queue.enqueue(makeTask());
      expect(queue.cancel(task.id)).toBe(true);
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.getCompleted(task.id)?.status).toBe('cancelled');
    });

    it('should return false for non-existent task', () => {
      expect(queue.cancel(uuid())).toBe(false);
    });
  });

  describe('drainExpired', () => {
    it('should drain tasks past TTL', () => {
      const old = new Date(Date.now() - 60_000).toISOString();
      queue.enqueue(makeTask({ createdAt: old, ttlMs: 1000 }));
      const expired = queue.drainExpired();
      expect(expired.length).toBe(1);
      expect(expired[0].metadata).toHaveProperty('reason', 'ttl_expired');
      expect(queue.getQueueLength()).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit enqueue event', () => {
      const fn = vi.fn();
      queue.on('enqueue', fn);
      queue.enqueue(makeTask());
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should emit assigned event on dequeue', () => {
      const fn = vi.fn();
      queue.on('assigned', fn);
      const agent = makeAgent();
      queue.registerAgent(agent);
      queue.enqueue(makeTask());
      queue.dequeue(agent.agentId);
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('agent lifecycle', () => {
    it('should update agent status based on load', () => {
      const agent = makeAgent({ maxConcurrent: 2 });
      queue.registerAgent(agent);
      queue.enqueue(makeTask());
      queue.enqueue(makeTask());
      queue.dequeue(agent.agentId);
      expect(queue.getAgent(agent.agentId)?.status).toBe('busy');
      queue.dequeue(agent.agentId);
      expect(queue.getAgent(agent.agentId)?.status).toBe('overloaded');
    });

    it('should unregister agent and requeue tasks', () => {
      const agent = makeAgent();
      queue.registerAgent(agent);
      queue.enqueue(makeTask());
      queue.dequeue(agent.agentId);
      const requeued = queue.unregisterAgent(agent.agentId);
      expect(queue.getAgent(agent.agentId)).toBeUndefined();
    });
  });

  describe('schema validation', () => {
    it('should validate TaskSchema', () => {
      const valid = TaskSchema.safeParse({
        id: uuid(), type: 'x', priority: 'high',
        status: 'queued', payload: {}, createdAt: now(),
      });
      expect(valid.success).toBe(true);
    });

    it('should validate AgentCapabilitySchema', () => {
      const valid = AgentCapabilitySchema.safeParse({
        agentId: 'a1', capabilities: ['code'],
      });
      expect(valid.success).toBe(true);
    });
  });
});