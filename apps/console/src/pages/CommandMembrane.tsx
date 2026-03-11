/**
 * CommandMembrane — persistent AVERI natural-language prompt bar
 *
 * Always-active prompt bar at the bottom of the SIGNAL Dashboard.
 * Sends the user's intent to the Genkit /generate endpoint (ATHENA flow)
 * and streams the response.
 */

import React, { useState, useRef, useEffect } from 'react';
import styles from './signal-dashboard.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CommandMembraneProps {
  genkitUrl?: string;
  placeholder?: string;
  onResponse?: (response: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const CommandMembrane: React.FC<CommandMembraneProps> = ({
  genkitUrl = 'http://localhost:4100',
  placeholder = 'Tell ATHENA what to do...',
  onResponse,
}) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamDone, setStreamDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // Auto-scroll response as it streams
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    const task = prompt.trim();
    setPrompt('');
    setResponse('');
    setStreamDone(false);
    setIsStreaming(true);

    try {
      const res = await fetch(`${genkitUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, prompt: task }),
      });

      if (!res.ok) {
        throw new Error(`Genkit returned HTTP ${res.status}`);
      }

      const contentType = res.headers.get('content-type') ?? '';

      // Handle streaming (text/event-stream or text/plain chunked)
      if (contentType.includes('event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // SSE format: "data: {...}\n\n"
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6));
                const text = json.text ?? json.content ?? json.output ?? '';
                accumulated += text;
                setResponse(accumulated);
              } catch {
                // raw text chunk
                accumulated += line.slice(6);
                setResponse(accumulated);
              }
            }
          }
        }
        onResponse?.(accumulated);
      } else {
        // Non-streaming fallback
        const json = await res.json();
        const text =
          json.output ?? json.text ?? json.content ?? JSON.stringify(json, null, 2);
        setResponse(text);
        onResponse?.(text);
      }
    } catch (err) {
      setResponse(`⚠️  ATHENA unreachable: ${String(err)}`);
    } finally {
      setIsStreaming(false);
      setStreamDone(true);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      void handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className={styles.commandMembrane} role="region" aria-label="ATHENA Command Membrane">
      {/* Streaming response display */}
      {(response || isStreaming) && (
        <div
          ref={responseRef}
          className={`${styles.membraneResponse} ${streamDone ? styles.responseDone : ''}`}
          aria-live="polite"
          aria-label="ATHENA response"
        >
          <span className={styles.athenaLabel}>ATHENA</span>
          <span className={styles.responseText}>{response}</span>
          {isStreaming && <span className={styles.streamCursor} aria-hidden="true">▌</span>}
        </div>
      )}

      {/* Prompt input */}
      <form className={styles.membraneForm} onSubmit={handleSubmit} id="command-membrane-form">
        <span className={styles.membraneIcon} aria-hidden="true">⌘</span>
        <input
          ref={inputRef}
          id="command-membrane-input"
          type="text"
          className={styles.membraneInput}
          placeholder={placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          autoFocus
          autoComplete="off"
          aria-label="Command input"
        />
        <button
          type="submit"
          className={`${styles.membraneSubmit} ${isStreaming ? styles.streaming : ''}`}
          disabled={isStreaming || !prompt.trim()}
          aria-label="Send command to ATHENA"
          id="command-membrane-submit"
        >
          {isStreaming ? '◌' : '↵'}
        </button>
      </form>
    </div>
  );
};
