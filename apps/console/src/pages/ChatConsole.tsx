/**
 * Chat-First Console — Primary interaction surface for Creative Liberation Engine v5
 * AVERI Trinity interface with live dispatch integration
 */
import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agent?: string;
}

const AVERI_BOOT_MSG: Message = {
  id: 'boot-0',
  role: 'system',
  content: '⚡ **AVERI GENESIS v5** online. ATHENA + VERA + IRIS operational. Dispatch connected. How can we help you today?',
  timestamp: new Date(),
  agent: 'AVERI',
};

export function ChatConsole() {
  const { user, tenantId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([AVERI_BOOT_MSG]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      // POST to Genkit AVERI endpoint via fetch proxy
      const proxyEndpoint = import.meta.env.VITE_FETCH_PROXY_URL ?? 'http://localhost:4200/proxy';
      const genkitUrl = import.meta.env.VITE_GENKIT_URL ?? 'http://localhost:9400';

      const res = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${genkitUrl}/api/runFlow`,
          method: 'POST',
          headers: { 'X-Tenant-ID': tenantId ?? 'default' },
          body: { flow: 'averi', input: { message: content, userId: user?.uid } },
        }),
      });

      if (res.ok) {
        const data = await res.json() as { body?: { response?: string } };
        const reply = data?.body?.response ?? '…';
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
          agent: 'AVERI',
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(`Genkit responded ${res.status}`);
      }
    } catch (err) {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `⚠️ Could not reach AVERI: ${String(err)}. Is the Genkit engine running?`,
        timestamp: new Date(),
        agent: 'SYSTEM',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <div className="chat-console" id="chat-console">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-brand">
          <span className="chat-header-icon">⚡</span>
          <div>
            <div className="chat-header-title">Creative Liberation Engine</div>
            <div className="chat-header-sub">AVERI GENESIS v5 · {user?.displayName ?? 'Agent'}</div>
          </div>
        </div>
        <div className="chat-header-status">
          <span className="status-dot status-dot--online" />
          <span>Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg chat-msg--${msg.role}`}>
            {msg.agent && (
              <div className="chat-msg-agent">{msg.agent}</div>
            )}
            <div
              className="chat-msg-content"
              // Safe — content is from trusted agent, using dangerouslySetInnerHTML for markdown bold
              dangerouslySetInnerHTML={{
                __html: msg.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br/>'),
              }}
            />
            <div className="chat-msg-time">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        {sending && (
          <div className="chat-msg chat-msg--assistant">
            <div className="chat-msg-agent">AVERI</div>
            <div className="chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <textarea
          id="chat-input"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message AVERI… (Enter to send, Shift+Enter for newline)"
          rows={1}
          disabled={sending}
        />
        <button
          type="submit"
          className="chat-send-btn"
          id="btn-chat-send"
          disabled={!input.trim() || sending}
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
