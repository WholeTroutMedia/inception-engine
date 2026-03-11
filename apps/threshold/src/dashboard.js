/**
 * dashboard.js — Spatial dispatch dashboard
 * Pull-up panel showing live tasks, agent roster, and metrics.
 * Activated by voice ("Hey COMET, show dashboard") or keyboard (D).
 */

const AGENTS = [
  'SCRIBE','ATHENA','VERA','IRIS','Warren Buffett','Buddha','Sun Tzu',
  'LEONARDO','COSMOS','SAGE','AURORA','BOLT','COMET','COMMERCE','BROWSER',
  'LEX','COMPASS','KEEPER','ARCH','ECHO','CODEX','ATLAS','CONTROL_ROOM',
  'SHOWRUNNER','SIGNAL','GRAPHICS','STUDIO','SYSTEMS','SWITCHBOARD','RELAY',
  'RAM_CREW','FORGE','BEACON','PRISM','FLUX','SENTINEL','ARCHON','PROOF','HARBOR',
];

export function initDashboard(nexus) {
  const panel    = document.getElementById('dashboard');
  const closeBtn = document.getElementById('close-dash');
  let isOpen     = false;

  // ─── Agent grid ───────────────────────────────────────────────────────────
  const grid = document.getElementById('agent-grid');
  AGENTS.forEach(name => {
    const el = document.createElement('div');
    el.className = 'hive-agent';
    el.innerHTML = `<div class="dot"></div>${name}`;
    grid.appendChild(el);
  });

  // ─── Close button ─────────────────────────────────────────────────────────
  closeBtn.addEventListener('click', () => close());

  // ─── Keyboard shortcut ────────────────────────────────────────────────────
  window.addEventListener('keydown', e => {
    if (e.key === 'd' || e.key === 'D') toggle();
    if (e.key === 'Escape' && isOpen) close();
  });

  // ─── Live data from NEXUS ─────────────────────────────────────────────────
  nexus.on('status', updateFromStatus);

  function updateFromStatus(data) {
    const tasks   = Array.isArray(data.tasks)  ? data.tasks  : [];
    const agents  = data.agents ?? {};
    const active  = tasks.filter(t => t.status === 'active');
    const queued  = tasks.filter(t => t.status === 'queued');
    const done    = tasks.filter(t => t.status === 'done' || t.status === 'completed');

    // Metric cards
    setMetric('metric-active', active.length);
    setMetric('metric-queued', queued.length);
    setMetric('metric-done',   done.length);

    // Status headline
    const statusEl = document.getElementById('dash-status-text');
    if (statusEl) {
      if (active.length === 0 && queued.length === 0) {
        statusEl.textContent = 'Engine quiet. Queue empty.';
      } else {
        statusEl.textContent = `${active.length} running · ${queued.length} queued`;
      }
    }

    // Task list — show top 8
    const listEl = document.getElementById('task-list');
    if (listEl) {
      const shown = [...active, ...queued].slice(0, 8);
      if (shown.length === 0) {
        listEl.innerHTML = `<div class="task-row">
          <div class="task-status-dot done"></div>
          <div class="task-name" style="color:rgba(255,255,255,0.35)">No active tasks</div>
          <div class="task-agent">—</div>
        </div>`;
      } else {
        listEl.innerHTML = shown.map(t => `
          <div class="task-row">
            <div class="task-status-dot ${t.status === 'active' ? 'active' : 'queued'}"></div>
            <div class="task-name">${escHtml(t.title ?? t.id)}</div>
            <div class="task-agent">${escHtml(t.agent_id ?? t.mode ?? '—')}</div>
          </div>
        `).join('');
      }
    }
  }

  // ─── Open / close ─────────────────────────────────────────────────────────
  function open() {
    isOpen = true;
    panel.classList.add('open');
    // Refresh data on open
    const status = nexus.getLastStatus();
    if (status) updateFromStatus(status);
  }

  function close() {
    isOpen = false;
    panel.classList.remove('open');
  }

  function toggle() {
    isOpen ? close() : open();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function setMetric(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? '—';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { open, close, toggle, isOpen: () => isOpen };
}
