// CORTEX Mobile App â€” Full JS
// â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GENKIT = 'http://127.0.0.1:4100';
const DISPATCH = 'http://127.0.0.1:5050';

// â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentClient = { id: 'e-is-for-eat', label: 'E Is For Eat', icon: 'ðŸ½ï¸' };
let chatHistory = [];
let isThinking = false;
let captures = JSON.parse(localStorage.getItem('cortex_captures') || '[]');
let recognition = null;

// â”€â”€ Boot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('DOMContentLoaded', () => {
    applyGreeting();
    loadIEStats();
    renderCaptures();
    checkIEConnection();
    setClientDisplay();
    // Restore client preference
    const saved = localStorage.getItem('cortex_client');
    if (saved) {
        const c = JSON.parse(saved);
        currentClient = c;
        setClientDisplay();
        document.querySelectorAll('.so-check').forEach(el => el.textContent = '');
        const chk = document.getElementById(`chk-${c.id}`);
        if (chk) chk.textContent = 'âœ“';
    }
    // Service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('cortex-sw.js').catch(() => { });
    }
});

// â”€â”€ Greeting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function applyGreeting() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning.' : h < 17 ? 'Good afternoon.' : 'Good evening.';
    const el = document.getElementById('welcome-title');
    if (el) el.textContent = g;
}

// â”€â”€ Screen navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function switchScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`screen-${name}`)?.classList.add('active');
    document.getElementById(`tab-${name}`)?.classList.add('active');
    if (name === 'studio') loadIEStats();
}

// â”€â”€ Client switcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openClientSheet() {
    document.getElementById('client-overlay').classList.add('open');
    document.getElementById('client-sheet').classList.add('open');
}
function closeClientSheet() {
    document.getElementById('client-overlay').classList.remove('open');
    document.getElementById('client-sheet').classList.remove('open');
}
function selectClient(id, label, icon) {
    currentClient = { id, label, icon };
    localStorage.setItem('cortex_client', JSON.stringify(currentClient));
    setClientDisplay();
    document.querySelectorAll('.so-check').forEach(el => el.textContent = '');
    const chk = document.getElementById(`chk-${id}`);
    if (chk) chk.textContent = 'âœ“';
    closeClientSheet();
}
function setClientDisplay() {
    const hc = document.getElementById('header-client-name');
    if (hc) hc.textContent = currentClient.label;
    const pc = document.getElementById('profile-client-name');
    if (pc) pc.textContent = currentClient.label;
    const cb = document.getElementById('client-switch-btn');
    if (cb) cb.title = `Context: ${currentClient.label}`;
}

// â”€â”€ Switch client and open chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setClientAndChat(id, label) {
    const icons = { 'e-is-for-eat': 'ðŸ½ï¸', barnstorm: 'ðŸ“¸', inception: 'âš¡', 'wtm-internal': 'ðŸŒŠ' };
    selectClient(id, label, icons[id] || 'ðŸŒŠ');
    switchScreen('chat');
    sendMsg(`I just switched to ${label} context. Show me what's most relevant right now â€” active work, priorities, anything I should know.`);
}

// â”€â”€ Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function handleEnter(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); triggerSend(); }
}
function triggerSend() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text || isThinking) return;
    input.value = '';
    input.style.height = 'auto';
    hideSuggestions();
    sendMsg(text);
}
function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function sendOnScreen(screen, msg) {
    switchScreen(screen);
    setTimeout(() => sendMsg(msg), 80);
}

async function sendMsg(text) {
    if (isThinking) return;
    isThinking = true;
    document.getElementById('send-btn').disabled = true;

    // Hide welcome, add user bubble
    const welcome = document.getElementById('welcome-state');
    if (welcome) welcome.style.display = 'none';
    appendBubble('user', text);
    chatHistory.push({ role: 'user', content: text });

    addThinking();
    scrollBottom();

    try {
        const res = await fetch(`${GENKIT}/cortexChat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: chatHistory.slice(-12),
                clientId: currentClient.id,
                userId: 'jaymeesire',
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const reply = data?.response ?? 'â€¦';
        const suggestions = data?.suggestions ?? [];

        removeThinking();
        appendBubble('cortex', reply);
        chatHistory.push({ role: 'model', content: reply });
        if (suggestions.length) showSuggestions(suggestions);

    } catch (err) {
        removeThinking();
        appendBubble('cortex', `**Can't reach IE right now.**\n\nMake sure you're on the home network.\n\n_${err.message}_`);
    }

    isThinking = false;
    document.getElementById('send-btn').disabled = false;
    scrollBottom();
}

function appendBubble(role, text) {
    const thread = document.getElementById('msg-thread');
    const wrap = document.createElement('div');
    wrap.className = `msg ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = role === 'cortex' ? formatMd(text) : escHtml(text);

    const time = document.createElement('div');
    time.className = 'msg-time';
    time.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    wrap.appendChild(bubble);
    wrap.appendChild(time);
    thread.appendChild(wrap);
}

function addThinking() {
    const thread = document.getElementById('msg-thread');
    const wrap = document.createElement('div');
    wrap.className = 'msg cortex thinking';
    wrap.id = '_thinking';
    wrap.innerHTML = `<div class="bubble"><div class="td"></div><div class="td"></div><div class="td"></div></div>`;
    thread.appendChild(wrap);
}
function removeThinking() { document.getElementById('_thinking')?.remove(); }

function showSuggestions(list) {
    const row = document.getElementById('suggestion-row');
    row.innerHTML = '';
    list.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'sug-pill';
        btn.textContent = s;
        btn.onclick = () => { hideSuggestions(); sendMsg(s); };
        row.appendChild(btn);
    });
}
function hideSuggestions() { document.getElementById('suggestion-row').innerHTML = ''; }

function scrollBottom() {
    const wrap = document.querySelector('.messages-wrap');
    if (wrap) setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 50);
}

function formatMd(text) {
    return escHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
}
function escHtml(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// â”€â”€ Voice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function toggleVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert('Voice input not available in this browser. Try Chrome or Safari.');
        return;
    }
    const btn = document.getElementById('voice-btn');
    if (recognition) {
        recognition.stop();
        recognition = null;
        btn.classList.remove('recording');
        return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = e => {
        const transcript = e.results[0][0].transcript;
        document.getElementById('msg-input').value = transcript;
        btn.classList.remove('recording');
        recognition = null;
        triggerSend();
    };
    recognition.onerror = () => { btn.classList.remove('recording'); recognition = null; };
    recognition.onend = () => { btn.classList.remove('recording'); recognition = null; };
    recognition.start();
    btn.classList.add('recording');
}

// â”€â”€ Capture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function captureAndProcess() {
    const input = document.getElementById('capture-input');
    const text = input.value.trim();
    if (!text) return;

    const item = { text, time: new Date().toISOString(), processed: false };
    captures.unshift(item);
    localStorage.setItem('cortex_captures', JSON.stringify(captures.slice(0, 50)));
    input.value = '';
    input.style.height = 'auto';
    renderCaptures();

    // Hand off to CORTEX
    switchScreen('chat');
    setTimeout(() => sendMsg(`I just captured this thought: "${text}"\n\nHelp me develop it. What could this become? What's the first concrete action?`), 100);
}

function renderCaptures() {
    const list = document.getElementById('capture-history');
    if (!list) return;
    if (!captures.length) {
        list.innerHTML = '<div class="capture-empty">Your quick captures will appear here.</div>';
        return;
    }
    list.innerHTML = captures.map(c => `
    <div class="capture-item">
      <div class="ci-text">${escHtml(c.text)}</div>
      <div class="ci-time">${new Date(c.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
    </div>
  `).join('');
}

// â”€â”€ IE Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadIEStats() {
    try {
        const res = await fetch(`${DISPATCH}/api/status`);
        const data = await res.json();
        const s = data?.summary ?? {};
        setEl('stat-agents', s.total_agents ?? 'â€”');
        setEl('stat-queued', s.queued ?? 'â€”');
        setEl('stat-done', s.done ?? 'â€”');
        setEl('agent-count', `${s.total_agents ?? '?'} live`);
        setEl('ie-conn-status', 'Connected');
        document.querySelector('.status-orb')?.setAttribute('style',
            'background:var(--green);box-shadow:0 0 8px var(--green)');
    } catch {
        setEl('ie-conn-status', 'Offline');
        document.querySelector('.ie-conn-status')?.classList.remove('connected');
    }
}

async function checkIEConnection() {
    try {
        const res = await fetch(`${GENKIT}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            setEl('ie-conn-status', 'Connected');
        }
    } catch { /* update orb to amber for degraded */ }
}

function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// â”€â”€ URL param â†’ client auto-select â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const urlParams = new URLSearchParams(window.location.search);
const clientParam = urlParams.get('client');
if (clientParam) {
    const map = {
        'e-is-for-eat': { id: 'e-is-for-eat', label: 'E Is For Eat', icon: 'ðŸ½ï¸' },
        barnstorm: { id: 'barnstorm', label: 'Barnstorm', icon: 'ðŸ“¸' },
        inception: { id: 'inception', label: 'Creative Liberation Engine', icon: 'âš¡' },
        wtm: { id: 'wtm-internal', label: 'WTM Studio', icon: 'ðŸŒŠ' },
    };
    if (map[clientParam]) currentClient = map[clientParam];
}

// â”€â”€ Native Creation Tools â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function openPipeline(title, steps) {
    switchScreen('pipeline');
    document.getElementById('pl-title').textContent = title;
    const container = document.getElementById('pl-steps-container');
    container.innerHTML = '';

    steps.forEach((step, i) => {
        const div = document.createElement('div');
        div.className = 'pl-step';
        div.id = `pl-step-${i}`;
        div.innerHTML = `
            <div class="pl-step-icon">${i + 1}</div>
            <div class="pl-step-info">
                <div class="pl-step-name">${step}</div>
                <div class="pl-step-sub" id="pl-step-sub-${i}">Queued</div>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('pl-actions').style.display = 'none';
    document.getElementById('pl-pct').textContent = '0%';
    document.getElementById('pl-bar-fill').style.width = '0%';
    document.getElementById('pl-status-text').textContent = 'Initializing engine...';

    // Simulate pipeline run
    let currentStep = 0;
    const totalSteps = steps.length;

    const runNext = () => {
        if (currentStep >= totalSteps) {
            document.getElementById('pl-status-text').textContent = 'Pipeline Completed';
            document.getElementById('pl-status-text').style.color = 'var(--green)';
            document.getElementById('pl-actions').style.display = 'block';
            return;
        }

        // Mark active
        document.getElementById(`pl-step-${currentStep}`).classList.add('active');
        document.getElementById(`pl-step-sub-${currentStep}`).textContent = 'Processing...';
        document.getElementById('pl-status-text').textContent = `Running ${steps[currentStep]}...`;

        // Progress bar simulation per step
        let stepProgress = 0;
        const stepInterval = setInterval(() => {
            stepProgress += Math.random() * 15;
            if (stepProgress > 100) stepProgress = 100;

            const overallPct = Math.round(((currentStep * 100) + stepProgress) / totalSteps);
            document.getElementById('pl-pct').textContent = `${overallPct}%`;
            document.getElementById('pl-bar-fill').style.width = `${overallPct}%`;

            if (stepProgress === 100) {
                clearInterval(stepInterval);
                document.getElementById(`pl-step-${currentStep}`).classList.remove('active');
                document.getElementById(`pl-step-${currentStep}`).classList.add('done');
                document.getElementById(`pl-step-sub-${currentStep}`).textContent = 'Done âœ“';
                currentStep++;
                setTimeout(runNext, 500);
            }
        }, 300);
    };

    setTimeout(runNext, 800);
}

function openEditor(title, promptContext, type) {
    switchScreen('editor');
    document.getElementById('doc-title').value = title;

    document.getElementById('doc-loading').style.display = 'flex';
    document.getElementById('doc-content-wrapper').style.display = 'none';
    document.getElementById('doc-editor').value = '';

    const sub = document.getElementById('doc-loading-sub');
    let dots = 0;
    sub.textContent = promptContext;

    setTimeout(() => {
        document.getElementById('doc-loading').style.display = 'none';
        document.getElementById('doc-content-wrapper').style.display = 'flex';

        let content = "";
        if (type === 'hooks') {
            content = "1. \"The viral 2-ingredient dough everyone is making, but with a secret twist...\"\n2. \"Stop making your pasta water like this if you want the sauce to actually stick.\"\n3. \"This 5-minute meal prep sequence changed how I eat lunch forever.\"";
        } else if (type === 'pitch') {
            content = "Hi [Name],\n\nIâ€™ve been following [Brand]â€™s recent push into the home-cooking space, and the narrative around [Campaign] is exactly what my audience at E Is For Eat connects with.\n\nMy platform focuses on high-quality, approachable culinary travel and techniques. Iâ€™d love to explore a partnership to highlight [Product/Service].\n\nAre you open to a quick chat next week to share some concepts?\n\nBest,\nthe creator";
        } else {
            content = "POV: When the lighting hits the dish just right and you don't even need a preset. ðŸ¤¤âœ¨\n\nRecipe dropping in the newsletter tomorrow morning. Link in bio to make sure you're on the list.\n\n#foodstagram #eisforeat #recipeoftheday #foodcreator";
        }

        const editor = document.getElementById('doc-editor');
        let i = 0;
        const typeWriter = setInterval(() => {
            editor.value += content.charAt(i);
            i++;
            if (i >= content.length) clearInterval(typeWriter);
        }, 10);

    }, 2000);
}

function copyDocument() {
    const text = document.getElementById('doc-editor').value;
    navigator.clipboard.writeText(text).then(() => {
        alert("Copied directly to clipboard!");
    });
}
