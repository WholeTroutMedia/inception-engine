/**
 * Research Ambassador Site — Interactive Layer
 * Neural particle canvas + live EON bio-status polling
 *
 * Sovereign: zero CDN deps, zero external scripts.
 * Canvas-based 60fps neural animation inspired by connectome visualization.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Neural Particle Canvas
// ─────────────────────────────────────────────────────────────────────────────

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('neural-canvas'));
const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

const TEAL = '0, 229, 204';
const AMBER = '255, 149, 0';

let W = 0, H = 0;
const NODES = [];
const NODE_COUNT = 80;
const MAX_DIST = 140;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function createNodes() {
  NODES.length = 0;
  for (let i = 0; i < NODE_COUNT; i++) {
    NODES.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.8 ? AMBER : TEAL,
      pulse: Math.random() * Math.PI * 2,
    });
  }
}

function drawFrame(time) {
  ctx.clearRect(0, 0, W, H);

  for (const node of NODES) {
    node.x += node.vx;
    node.y += node.vy;
    node.pulse += 0.02;

    if (node.x < 0 || node.x > W) node.vx *= -1;
    if (node.y < 0 || node.y > H) node.vy *= -1;
  }

  // Draw connections
  for (let i = 0; i < NODES.length; i++) {
    for (let j = i + 1; j < NODES.length; j++) {
      const a = NODES[i];
      const b = NODES[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < MAX_DIST) {
        const alpha = (1 - dist / MAX_DIST) * 0.4;
        const pulseAlpha = alpha * (0.6 + Math.sin(a.pulse) * 0.4);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${a.color}, ${pulseAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // Draw nodes
  for (const node of NODES) {
    const alpha = 0.5 + Math.sin(node.pulse) * 0.4;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${node.color}, ${alpha})`;
    ctx.fill();
  }

  requestAnimationFrame(drawFrame);
}

window.addEventListener('resize', () => { resize(); createNodes(); });
resize();
createNodes();
requestAnimationFrame(drawFrame);

// ─────────────────────────────────────────────────────────────────────────────
// Live EON Bio-Status Poll
// ─────────────────────────────────────────────────────────────────────────────

const statusDot  = document.getElementById('bio-status-dot');
const statusText = document.getElementById('bio-status-text');
const statStatus = document.getElementById('stat-status');

async function fetchBioStatus() {
  try {
    const res = await fetch('http://localhost:4100/flows/eon-bio/status', {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();

    const status = data.status ?? 'offline';
    statusDot.className  = `status-dot ${status}`;
    statusText.textContent = `eon-bio: ${status}`;
    if (statStatus) statStatus.textContent = status.toUpperCase();
  } catch {
    statusDot.className  = 'status-dot offline';
    statusText.textContent = 'eon-bio: engine offline';
  }
}

fetchBioStatus();
setInterval(fetchBioStatus, 30_000);

// ─────────────────────────────────────────────────────────────────────────────
// Count-up animation for neuron stat
// ─────────────────────────────────────────────────────────────────────────────

function animateCount(el, end, suffix = '') {
  let start = 0;
  const duration = 1800;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(eased * end);

    if (value >= 1000) {
      el.textContent = `${(value / 1000).toFixed(0)}K${suffix}`;
    } else {
      el.textContent = `${value}${suffix}`;
    }

    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

const neuronStat = document.getElementById('stat-neurons');
if (neuronStat) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      animateCount(neuronStat, 140000);
      observer.disconnect();
    }
  });
  observer.observe(neuronStat);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scroll-triggered section reveals
// ─────────────────────────────────────────────────────────────────────────────

const sections = document.querySelectorAll('.section');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

sections.forEach(section => {
  section.style.opacity = '0';
  section.style.transform = 'translateY(24px)';
  section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  revealObserver.observe(section);
});
