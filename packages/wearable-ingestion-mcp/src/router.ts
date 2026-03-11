/**
 * Intent Router
 *
 * Classifies an incoming WearableSignal into an IntentClass
 * and builds the appropriate Dispatch task payload.
 *
 * Intent Classification Logic:
 * - Voice notes with action keywords → action
 * - Voice notes without action markers → memory
 * - Explicit queries → query
 * - Health metrics → health
 * - Exports → action (fire dispatch immediately)
 */

import type { WearableSignal, IntentClass, DispatchTask } from './types.js';

// Keywords that indicate an action intent in a transcript
const ACTION_KEYWORDS = [
  'ship', 'deploy', 'build', 'create', 'update', 'fix', 'commit',
  'write', 'code', 'task', 'remind me to', 'add to', 'send',
  'schedule', 'file a', 'make a', 'start a', 'open a', 'do a',
];

// Keywords that indicate a memory/store intent
const MEMORY_KEYWORDS = [
  'remember', 'note', 'save', 'keep', 'store', 'journal', 'log',
  'capture', 'hold on to', 'remind me of', 'write down',
];

// Keywords that indicate a query intent
const QUERY_KEYWORDS = [
  'what is', 'what\'s', 'how do', 'how does', 'where is', 'who is',
  'when did', 'why does', 'can you', 'tell me', 'show me', 'explain',
  'search', 'look up', 'find',
];

function classifyTranscript(transcript: string): IntentClass {
  const lower = transcript.toLowerCase();

  if (QUERY_KEYWORDS.some((kw) => lower.includes(kw))) return 'query';
  if (ACTION_KEYWORDS.some((kw) => lower.includes(kw))) return 'action';
  if (MEMORY_KEYWORDS.some((kw) => lower.includes(kw))) return 'memory';

  // Default voice notes to memory — they're captures, not commands
  return 'memory';
}

export function classifyIntent(signal: WearableSignal): IntentClass {
  // Exports always fire as actions
  if (signal.type === 'export') return 'action';

  // Health metrics always go to health storage
  if (signal.type === 'health_metric') return 'health';

  // Gesture-based signals are actions
  if (signal.type === 'gesture') return 'action';

  // Voice-based signals: classify by transcript content
  const transcript = signal.payload.transcript;
  if (transcript && transcript.length > 0) {
    return classifyTranscript(transcript);
  }

  // No transcript — store as raw memory
  return 'memory';
}

export function buildDispatchTask(signal: WearableSignal, intent: IntentClass): DispatchTask {
  const source = `wearable:${signal.source}`;
  const transcript = signal.payload.transcript ?? '';
  const shortTranscript = transcript.length > 100
    ? `${transcript.slice(0, 97)}...`
    : transcript;

  switch (intent) {
    case 'action':
      return {
        title: `[WEARABLE] ${shortTranscript || 'Action from ' + signal.source}`,
        description: `Voice-triggered action from ${signal.source}.\n\nTranscript: ${transcript}\n\nCaptured: ${signal.capturedAt}`,
        priority: 'high',
        source,
        tags: ['wearable', signal.source, 'voice-action'],
        metadata: { signalId: signal.id, type: signal.type },
      };

    case 'ideate':
      return {
        title: `[IDEATE] ${shortTranscript}`,
        description: `Ideation trigger from wearable.\n\nSeed: ${transcript}`,
        priority: 'normal',
        source,
        tags: ['wearable', signal.source, 'ideate'],
        metadata: { signalId: signal.id },
      };

    case 'memory':
      return {
        title: `[MEMORY] ${shortTranscript || 'Voice note from ' + signal.source}`,
        description: `Memory capture from ${signal.source}.\n\nContent: ${transcript}\n\nCaptured: ${signal.capturedAt}`,
        priority: 'low',
        source,
        tags: ['wearable', signal.source, 'memory', 'scribe'],
        metadata: { signalId: signal.id },
      };

    case 'query':
      return {
        title: `[QUERY] ${shortTranscript}`,
        description: `Query from ${signal.source}: ${transcript}`,
        priority: 'high',
        source,
        tags: ['wearable', signal.source, 'query', 'vera'],
        metadata: { signalId: signal.id },
      };

    case 'health':
      return {
        title: `[HEALTH] Biometric data from ${signal.source}`,
        description: `Health signal: ${JSON.stringify(signal.payload, null, 2)}`,
        priority: 'low',
        source,
        tags: ['wearable', signal.source, 'health', 'biometric'],
        metadata: { signalId: signal.id },
      };

    default:
      return {
        title: `[WEARABLE] Signal from ${signal.source}`,
        description: `Unclassified signal from ${signal.source}.`,
        priority: 'low',
        source,
        tags: ['wearable', signal.source],
        metadata: { signalId: signal.id },
      };
  }
}
