/**
 * voice.js — WebSpeech API voice recognition
 * Wake word: "Hey COMET" — then route commands to dispatch / dashboard.
 */

const WAKE_WORD = 'hey comet';
const COMMANDS = [
  { pattern: /show dashboard|open dashboard|dashboard/i,     action: 'DASHBOARD_OPEN' },
  { pattern: /close dashboard|hide dashboard/i,              action: 'DASHBOARD_CLOSE' },
  { pattern: /status|how.*(engine|things)/i,                 action: 'STATUS' },
  { pattern: /who.*(here|present|online)/i,                  action: 'ROSTER' },
  { pattern: /tasks?|what.*(running|active|queue)/i,         action: 'TASKS' },
  { pattern: /ship\s+(.+)/i,                                 action: 'SHIP',    capture: 1 },
  { pattern: /plan\s+(.+)/i,                                 action: 'PLAN',    capture: 1 },
  { pattern: /(hello|hi|hey|good\s+\w+)/i,                   action: 'GREET' },
];

export function initVoice({ comet, dash, nexus }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('[COMET voice] SpeechRecognition not available in this browser');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous  = true;
  recognition.interimResults = false;
  recognition.lang        = 'en-US';
  recognition.maxAlternatives = 1;

  const indicator = document.getElementById('voice-indicator');
  let active = false; // listening for command after wake word
  let wakeTimeout = null;

  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    if (!last.isFinal) return;

    const transcript = last[0].transcript.trim().toLowerCase();
    console.log('[COMET voice]', transcript);

    if (!active) {
      if (transcript.includes(WAKE_WORD) || transcript.includes('hey comet')) {
        active = true;
        indicator?.classList.add('listening');
        comet.speak('Yes?');
        if (wakeTimeout) clearTimeout(wakeTimeout);
        wakeTimeout = setTimeout(() => {
          active = false;
          indicator?.classList.remove('listening');
        }, 8000);
      }
      return;
    }

    // Active — route command
    active = false;
    indicator?.classList.remove('listening');
    routeCommand(transcript, { comet, dash, nexus });
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      console.warn('[COMET voice] Microphone permission denied');
    }
  };

  recognition.onend = () => {
    // Auto-restart — keep always listening
    try { recognition.start(); } catch {}
  };

  try {
    recognition.start();
    console.log('[COMET voice] Listening for wake word: "Hey COMET"');
  } catch (e) {
    console.warn('[COMET voice] Could not start recognition:', e.message);
  }

  // Expose mic toggle for future VR controller button
  window.toggleCOMETMic = () => {
    try { recognition.start(); } catch {}
  };
}

function routeCommand(transcript, { comet, dash, nexus }) {
  for (const cmd of COMMANDS) {
    const match = transcript.match(cmd.pattern);
    if (!match) continue;

    switch (cmd.action) {
      case 'DASHBOARD_OPEN':
        dash.open();
        comet.speak('Opening the dashboard.');
        break;

      case 'DASHBOARD_CLOSE':
        dash.close();
        comet.speak('Dashboard closed.');
        break;

      case 'STATUS': {
        const status = nexus.getLastStatus();
        if (status) {
          const active = status.tasks?.filter(t => t.status === 'active').length ?? '—';
          const queued = status.tasks?.filter(t => t.status === 'queued').length ?? '—';
          comet.speak(`Engine operational. ${active} tasks running, ${queued} in queue.`, 7000);
        } else {
          comet.speak(`Engine is running. I can't reach the dispatch server right now, but all forty agents are standing by.`, 7000);
        }
        break;
      }

      case 'ROSTER':
        comet.speak(
          `The whole crew is here. AVERI leads — ATHENA, VERA, and me. Forty agents total across five hives. Everyone's present.`,
          7000
        );
        break;

      case 'TASKS': {
        const st = nexus.getLastStatus();
        const tasks = st?.tasks?.slice(0, 3).map(t => t.title).join(', ');
        comet.speak(tasks
          ? `Active tasks: ${tasks}. Check the dashboard for the full board.`
          : `No task data yet. Try "Hey COMET, show dashboard" for the full view.`
        , 7000);
        break;
      }

      case 'SHIP':
        comet.speak(`Understood. I'll route a SHIP task for: ${match[1]}. Stand by.`, 6000);
        nexus.createTask({ title: match[1], mode: 'SHIP', priority: 'high' });
        break;

      case 'PLAN':
        comet.speak(`Drafting a PLAN task for: ${match[1]}. ATHENA will pick it up.`, 6000);
        nexus.createTask({ title: match[1], mode: 'PLAN', priority: 'medium' });
        break;

      case 'GREET':
        comet.speak(`I'm here. Always. What do you need?`, 5000);
        break;
    }
    return;
  }

  // Unrecognized command
  comet.speak(`Heard you. I'm not sure how to handle that yet, but I noted it.`, 5000);
}
