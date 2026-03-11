/**
 * AVERIChat â€” Chat-First Console UI for the Creative Liberation Engine
 *
 * Connects to the averiOrchestration Genkit flow at :4100/orchestrate
 * and renders an interactive multi-agent conversation interface.
 *
 * Features:
 *  - Streamed AVERI responses with per-agent role badges
 *  - Assignment display showing which agents are handling what
 *  - Priority indicator (P0â€“P3) on each directive
 *  - Tenant-scoped (Firebase Auth uid as tenantId)
 *  - Keyboard shortcut: Ctrl+Enter to send
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface AgentAssignment {
  agentId: string;
  role: string;
  task: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'averi';
  content: string;
  plan?: string;
  assignments?: AgentAssignment[];
  dispatchedAt?: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  timestamp: number;
  error?: string;
}

export interface AVERIChatProps {
  /** Firebase UID / tenant ID for context isolation */
  tenantId: string;
  /** Genkit engine base URL (default: http://127.0.0.1:4100) */
  genkitUrl?: string;
  /** Initial greeting message */
  greeting?: string;
  /** Optional CSS className override */
  className?: string;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AGENT_COLOURS: Record<string, string> = {
  athena:  '#6366f1',
  vera:    '#10b981',
  iris:    '#f59e0b',
  keeper:  '#8b5cf6',
  lex:     '#3b82f6',
  compass: '#06b6d4',
  comet:   '#f97316',
  herald:  '#ec4899',
  forge:   '#64748b',
  dira:    '#dc2626',
  scribe:  '#84cc16',
  lens:    '#a78bfa',
};

const PRIORITY_COLOURS: Record<string, string> = {
  P0: '#dc2626',
  P1: '#f97316',
  P2: '#3b82f6',
  P3: '#6b7280',
};

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AgentBadge({ agentId }: { agentId: string }) {
  const colour = AGENT_COLOURS[agentId.toLowerCase()] ?? '#6b7280';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: `${colour}22`,
        color: colour,
        border: `1px solid ${colour}55`,
      }}
    >
      {agentId.toUpperCase()}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colour = PRIORITY_COLOURS[priority] ?? '#6b7280';
  return (
    <span
      style={{
        padding: '1px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 700,
        color: colour,
        border: `1px solid ${colour}`,
        background: `${colour}15`,
      }}
    >
      {priority}
    </span>
  );
}

function AssignmentsPanel({ assignments }: { assignments: AgentAssignment[] }) {
  return (
    <div
      style={{
        marginTop: '10px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingTop: '10px',
      }}
    >
      <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Assignments
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {assignments.map((a, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <AgentBadge agentId={a.agentId} />
            <PriorityBadge priority={a.priority} />
            <span style={{ fontSize: '13px', color: '#e2e8f0', flex: 1 }}>{a.task}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '16px',
      }}
    >
      {/* Role label */}
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', letterSpacing: '0.04em' }}>
        {isUser ? 'YOU' : 'â¬¡ AVERI'}
        {message.priority && !isUser && (
          <span style={{ marginLeft: '6px' }}>
            <PriorityBadge priority={message.priority} />
          </span>
        )}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '78%',
          padding: '12px 16px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
          background: isUser
            ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            : 'rgba(255,255,255,0.05)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
          color: '#f1f5f9',
          fontSize: '14px',
          lineHeight: '1.6',
          boxShadow: isUser ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
        }}
      >
        {message.error ? (
          <span style={{ color: '#f87171' }}>âš  {message.error}</span>
        ) : (
          <>
            {/* AVERI plan */}
            {message.plan && (
              <p style={{ marginBottom: '8px', color: '#cbd5e1' }}>{message.plan}</p>
            )}
            {/* User message or empty AVERI body */}
            {!message.plan && message.content && (
              <p style={{ margin: 0 }}>{message.content}</p>
            )}
            {/* Assignment breakdown */}
            {message.assignments && message.assignments.length > 0 && (
              <AssignmentsPanel assignments={message.assignments} />
            )}
          </>
        )}
      </div>

      {/* Timestamp */}
      <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
      <span style={{ fontSize: '11px', color: '#64748b' }}>â¬¡ AVERI</span>
      <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#6366f1',
              opacity: 0.6,
              animation: `averi-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function AVERIChat({
  tenantId,
  genkitUrl = 'http://127.0.0.1:4100',
  greeting = 'AVERI online. What directive shall I orchestrate?',
  className,
}: AVERIChatProps): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: 'averi',
      content: greeting,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P1');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendDirective = useCallback(async () => {
    const directive = input.trim();
    if (!directive || isLoading) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: directive,
      priority,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await fetch(`${genkitUrl}/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directive,
          tenantId,
          priority,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        throw new Error(`Genkit returned ${resp.status}`);
      }

      const data = await resp.json() as {
        plan: string;
        assignments: AgentAssignment[];
        dispatchedAt: string;
        estimatedCompletionMs?: number;
      };

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'averi',
          content: '',
          plan: data.plan,
          assignments: data.assignments,
          dispatchedAt: data.dispatchedAt,
          priority,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'averi',
          content: '',
          error: err instanceof Error ? err.message : 'Unknown error',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [genkitUrl, input, isLoading, priority, tenantId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void sendDirective();
      }
    },
    [sendDirective]
  );

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <>
      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes averi-pulse {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>

      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'linear-gradient(180deg, #0f172a 0%, #0d1424 100%)',
          borderRadius: '12px',
          overflow: 'hidden',
          fontFamily: '"Inter", "Roboto", system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              boxShadow: '0 4px 10px rgba(99,102,241,0.4)',
            }}
          >
            â¬¡
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '14px', letterSpacing: '0.02em' }}>
              AVERI Orchestration Console
            </div>
            <div style={{ color: '#64748b', fontSize: '11px' }}>
              Creative Liberation Engine v5.0.0 Â· Tenant: {tenantId.slice(0, 8)}â€¦
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
            {(['ATHENA', 'VERA', 'IRIS'] as const).map((agent) => (
              <span
                key={agent}
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: AGENT_COLOURS[agent.toLowerCase()],
                  background: `${AGENT_COLOURS[agent.toLowerCase()]}22`,
                  border: `1px solid ${AGENT_COLOURS[agent.toLowerCase()]}44`,
                }}
              >
                {agent}
              </span>
            ))}
          </div>
        </div>

        {/* Message list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 18px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(99,102,241,0.3) transparent',
          }}
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {/* Priority selector */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {(['P0', 'P1', 'P2', 'P3'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1px solid ${priority === p ? PRIORITY_COLOURS[p] : 'rgba(255,255,255,0.1)'}`,
                  background: priority === p ? `${PRIORITY_COLOURS[p]}22` : 'transparent',
                  color: priority === p ? PRIORITY_COLOURS[p] : '#64748b',
                  transition: 'all 0.15s',
                }}
              >
                {p}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#475569', alignSelf: 'center' }}>
              âŒ˜â†µ to send
            </span>
          </div>

          {/* Textarea + Send button */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Give AVERI a directiveâ€¦"
              rows={3}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(99,102,241,0.3)',
                background: 'rgba(255,255,255,0.04)',
                color: '#f1f5f9',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                transition: 'border-color 0.15s',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.7)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.3)'; }}
            />
            <button
              onClick={() => void sendDirective()}
              disabled={isLoading || !input.trim()}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                background: isLoading || !input.trim()
                  ? 'rgba(99,102,241,0.3)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: isLoading || !input.trim() ? 'none' : '0 4px 12px rgba(99,102,241,0.4)',
                whiteSpace: 'nowrap',
              }}
            >
              {isLoading ? 'â†»' : 'â†‘ Orchestrate'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default AVERIChat;
