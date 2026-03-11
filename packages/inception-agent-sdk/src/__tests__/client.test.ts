/**
 * inception-agent-sdk client tests
 * @package inception-agent-sdk
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InceptionAgentClient } from '../client.js';
import type { AgentManifest, TaskEnvelope, TaskResult } from '../types.js';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const testManifest: AgentManifest = {
  agentId: 'test/image-agent',
  name: 'Test Image Agent',
  version: '1.0.0',
  capabilities: ['image-gen', 'image-resize'],
  dispatchEndpoint: 'https://dispatch.example.com',
  cloudProvider: 'cloudflare',
  endpoint: 'https://my-agent.workers.dev',
  apiKey: 'test-api-key-123',
};

const testTask: TaskEnvelope = {
  taskId: 'task-abc-001',
  type: 'generate',
  capability: 'image-gen',
  payload: { prompt: 'a sunset over mountains' },
  priority: 3,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(response: { ok: boolean; status?: number; body: unknown }): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.ok ? 200 : (response.status ?? 400),
    json: async () => response.body,
    text: async () => JSON.stringify(response.body),
  });
}

// ─── Registration Tests ───────────────────────────────────────────────────────

describe('InceptionAgentClient — Registration', () => {
  afterEach((): void => { vi.restoreAllMocks(); });

  it('POSTs correct registration payload to dispatch', async () => {
    const fetchMock = mockFetch({
      ok: true,
      body: {
        success: true,
        agentId: testManifest.agentId,
        assignedDispatchId: 'dispatch-01',
        heartbeatIntervalMs: 30_000,
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new InceptionAgentClient(testManifest);
    const response = await client.register();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://dispatch.example.com/api/agents/register');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['agent_id']).toBe('test/image-agent');
    expect(body['capabilities']).toEqual(['image-gen', 'image-resize']);
    expect(body['cloud_provider']).toBe('cloudflare');

    expect(response.success).toBe(true);
    expect(client.isRegistered).toBe(true);
  });

  it('sends X-IE-API-Key header when apiKey is present', async () => {
    const fetchMock = mockFetch({ ok: true, body: { success: true, agentId: 'x', assignedDispatchId: 'y', heartbeatIntervalMs: 30_000 } });
    vi.stubGlobal('fetch', fetchMock);

    const client = new InceptionAgentClient(testManifest);
    await client.register();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['X-IE-API-Key']).toBe('test-api-key-123');
  });

  it('throws on non-OK registration response', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, status: 403, body: { error: 'Forbidden' } }));

    const client = new InceptionAgentClient(testManifest);
    await expect(client.register()).rejects.toThrow('HTTP 403');
  });
});

// ─── Heartbeat Tests ──────────────────────────────────────────────────────────

describe('InceptionAgentClient — Heartbeat', () => {
  afterEach((): void => { vi.restoreAllMocks(); });

  it('POSTs heartbeat to correct endpoint with correct shape', async () => {
    const fetchMock = mockFetch({ ok: true, body: { ok: true } });
    vi.stubGlobal('fetch', fetchMock);

    const client = new InceptionAgentClient(testManifest);
    await client.sendHeartbeat('busy', 'task-xyz');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://dispatch.example.com/api/agents/heartbeat');

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['agentId']).toBe('test/image-agent');
    expect(body['status']).toBe('busy');
    expect(body['currentTaskId']).toBe('task-xyz');
    expect(body['cloudProvider']).toBe('cloudflare');
  });

  it('does not throw when heartbeat fails (fire-and-forget)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));

    const client = new InceptionAgentClient(testManifest);
    // Should resolve without throwing
    await expect(client.sendHeartbeat('idle')).resolves.toBeUndefined();
  });
});

// ─── Task Handler Tests ───────────────────────────────────────────────────────

describe('InceptionAgentClient — Task Handling', () => {
  afterEach((): void => { vi.restoreAllMocks(); });

  it('routes incoming tasks to the registered handler', async () => {
    const completeFetch = mockFetch({ ok: true, body: { ok: true } });
    const heartbeatFetch = mockFetch({ ok: true, body: { ok: true } });
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementation(async (url: string): Promise<unknown> => {
        if (url.includes('heartbeat')) return heartbeatFetch();
        return completeFetch();
      }),
    );

    const handlerSpy = vi.fn().mockResolvedValue({
      taskId: testTask.taskId,
      agentId: testManifest.agentId,
      status: 'completed',
      output: { imageUrl: 'https://cdn.example.com/img.png' },
      durationMs: 1234,
    } satisfies TaskResult);

    const client = new InceptionAgentClient(testManifest);
    client.onTask(handlerSpy);

    const result = await client.handleWebhook(testTask);

    expect(handlerSpy).toHaveBeenCalledOnce();
    expect(handlerSpy).toHaveBeenCalledWith(testTask);
    expect(result.status).toBe('completed');
  });

  it('returns failed TaskResult when handler throws', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, body: { ok: true } }));

    const client = new InceptionAgentClient(testManifest);
    client.onTask(async () => { throw new Error('GPU out of memory') });

    const result = await client.handleWebhook(testTask);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('GPU out of memory');
  });

  it('throws when no handler is registered and handleWebhook is called', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, body: { ok: true } }));

    const client = new InceptionAgentClient(testManifest);
    const result = await client.handleWebhook(testTask);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('No task handler registered');
  });
});

// ─── Task Completion Tests ────────────────────────────────────────────────────

describe('InceptionAgentClient — Completion', () => {
  afterEach((): void => { vi.restoreAllMocks(); });

  it('POSTs result to correct complete endpoint', async () => {
    const fetchMock = mockFetch({ ok: true, body: { ok: true } });
    vi.stubGlobal('fetch', fetchMock);

    const client = new InceptionAgentClient(testManifest);
    const result: TaskResult = {
      taskId: 'task-abc-001',
      agentId: testManifest.agentId,
      status: 'completed',
      output: { done: true },
      durationMs: 500,
    };

    await client.complete(result);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://dispatch.example.com/api/tasks/task-abc-001/complete');
  });
});
