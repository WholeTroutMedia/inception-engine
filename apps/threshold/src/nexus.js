/**
 * nexus.js — NEXUS bridge: SSE connection to Creative Liberation Engine dispatch server
 * Polls for task status, relays events, provides createTask API.
 * Zero Day: set window.__DISPATCH_URL__ to public Dispatch URL before loading (e.g. in index.html).
 */
const DISPATCH_BASE = (typeof window !== 'undefined' && window.__DISPATCH_URL__) || 'http://localhost:5050';

export function initNexus() {
  let lastStatus = null;
  let eventSource = null;
  let listeners = {};

  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  }

  function emit(event, data) {
    (listeners[event] || []).forEach(cb => cb(data));
  }

  // ─── SSE connection ───────────────────────────────────────────────────────
  function connect() {
    try {
      eventSource = new EventSource(`${DISPATCH_BASE}/api/events`);

      eventSource.onopen = () => {
        console.log('[NEXUS] SSE connected');
        emit('connected', true);
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          emit('event', data);
          if (data.type === 'task_update' || data.type === 'task_complete') {
            emit('task_update', data);
            fetchStatus();
          }
        } catch {}
      };

      eventSource.addEventListener('heartbeat', (e) => {
        try {
          const data = JSON.parse(e.data);
          emit('heartbeat', data);
        } catch {}
      });

      eventSource.onerror = () => {
        eventSource.close();
        eventSource = null;
        emit('disconnected', true);
        setTimeout(connect, 8000);
      };
    } catch (e) {
      console.warn('[NEXUS] SSE not available:', e.message);
    }
  }

  // ─── REST polling fallback ────────────────────────────────────────────────
  async function fetchStatus() {
    try {
      const res  = await fetch(`${DISPATCH_BASE}/api/status`, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      lastStatus = data;
      emit('status', data);
    } catch {
      // Dispatch server unreachable — that's okay, we operate offline gracefully
    }
  }

  // Poll every 15s as fallback
  fetchStatus();
  setInterval(fetchStatus, 15000);
  connect();

  // ─── Send heartbeat from The Threshold ───────────────────────────────────
  async function sendHeartbeat() {
    try {
      await fetch(`${DISPATCH_BASE}/api/agents/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: 'threshold-vr',
          window: 'VR0',
          workstream: 'threshold-spatial',
          tool: 'webxr',
          current_task: 'ambient-monitoring',
        }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {}
  }

  sendHeartbeat();
  setInterval(sendHeartbeat, 30000);

  return {
    on,
    getLastStatus: () => lastStatus,

    async createTask({ title, mode = 'SHIP', priority = 'high' }) {
      try {
        const res = await fetch(`${DISPATCH_BASE}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            mode,
            priority,
            source: 'threshold-vr',
            created_at: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        fetchStatus();
        return data;
      } catch (e) {
        console.warn('[NEXUS] createTask failed:', e.message);
        return null;
      }
    },
  };
}
