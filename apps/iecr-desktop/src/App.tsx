/**
 * HELIX D: IECR Desktop Shell â€” NEXUS Workstation UI v3
 * Issue: #49 | Phase B: Creative Runtime
 *
 * Electron + React shell for the Creative Liberation Engine Creative Runtime.
 * Split-view: Browser Panel | Editor Panel | Constitutional Log
 * Connects to Brainchild dispatch server via WebSocket + MCP auto-discovery.
 */
import React, { useState, useEffect } from 'react';

// --- Types ---

interface AgentStatus {
  name: string;
  emoji: string;
  hive: string;
  status: 'active' | 'dormant' | 'error';
  currentTask?: string;
}

interface ConstitutionalEvent {
  timestamp: string;
  agent: string;
  action: string;
  classification: 'class-1' | 'class-2' | 'class-3';
  approved: boolean;
}

interface DispatchTask {
  id: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'queued' | 'active' | 'completed' | 'failed';
  assignedHive?: string;
}

// --- Agent Sidebar ---

function AgentSidebar({ agents }: { agents: AgentStatus[] }) {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto">
      <h2 className="text-sm font-bold text-gray-400 px-4 py-3 uppercase tracking-wider">
        AVERI Collective ({agents.length})
      </h2>
      {agents.map((agent) => (
        <div
          key={agent.name}
          className={`px-4 py-2 flex items-center gap-2 hover:bg-gray-800 cursor-pointer ${
            agent.status === 'active' ? 'border-l-2 border-green-500' : ''
          }`}
        >
          <span className="text-lg">{agent.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{agent.name}</div>
            <div className="text-xs text-gray-500">{agent.hive}</div>
          </div>
          <div
            className={`w-2 h-2 rounded-full ${
              agent.status === 'active'
                ? 'bg-green-500 animate-pulse'
                : agent.status === 'error'
                ? 'bg-red-500'
                : 'bg-gray-600'
            }`}
          />
        </div>
      ))}
    </aside>
  );
}

// --- Constitutional Log ---

function ConstitutionalLog({ events }: { events: ConstitutionalEvent[] }) {
  return (
    <div className="h-48 bg-gray-950 border-t border-gray-700 overflow-y-auto font-mono text-xs">
      <div className="px-4 py-2 border-b border-gray-800 text-gray-400 uppercase tracking-wider text-xs">
        Constitutional Review Log
      </div>
      {events.map((evt, i) => (
        <div key={i} className="px-4 py-1 flex gap-2 hover:bg-gray-900">
          <span className="text-gray-600">{evt.timestamp}</span>
          <span
            className={`px-1 rounded text-[10px] ${
              evt.classification === 'class-1'
                ? 'bg-green-900 text-green-300'
                : evt.classification === 'class-2'
                ? 'bg-yellow-900 text-yellow-300'
                : 'bg-red-900 text-red-300'
            }`}
          >
            {evt.classification.toUpperCase()}
          </span>
          <span className="text-gray-300">
            {evt.agent}: {evt.action}
          </span>
          <span>{evt.approved ? 'âœ…' : 'âŒ'}</span>
        </div>
      ))}
    </div>
  );
}

// --- Dispatch Queue ---

function DispatchQueue({ tasks }: { tasks: DispatchTask[] }) {
  return (
    <div className="flex-1 bg-gray-900 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-white mb-4">Dispatch Queue</h2>
      {tasks.map((task) => (
        <div key={task.id} className="bg-gray-800 rounded-lg p-3 mb-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white">{task.description}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                task.status === 'active'
                  ? 'bg-blue-900 text-blue-300'
                  : task.status === 'completed'
                  ? 'bg-green-900 text-green-300'
                  : task.status === 'failed'
                  ? 'bg-red-900 text-red-300'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {task.status}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {task.priority} | {task.assignedHive || 'unassigned'}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [events, setEvents] = useState<ConstitutionalEvent[]>([]);
  const [tasks, setTasks] = useState<DispatchTask[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // TODO: Connect to dispatch MCP server via WebSocket
    // ws://127.0.0.1:4200/ws
    setConnected(false);

    // Load mock data for scaffold
    setAgents([
      { name: 'ATHENA', emoji: 'ðŸ§ ', hive: 'CORE', status: 'active', currentTask: 'Orchestrating...' },
      { name: 'BOLT', emoji: 'âš¡', hive: 'AURORA', status: 'active', currentTask: 'Building component' },
      { name: 'LEX', emoji: 'âš–ï¸', hive: 'CORE', status: 'active', currentTask: 'Reviewing PR #53' },
      { name: 'SCRIBE', emoji: 'ðŸ“', hive: 'CORE', status: 'active', currentTask: 'Logging memory' },
      { name: 'COMET', emoji: 'â˜„ï¸', hive: 'CORE', status: 'active', currentTask: 'Browser automation' },
      { name: 'SENTINEL', emoji: 'ðŸ›¡ï¸', hive: 'CORE', status: 'dormant' },
    ]);
  }, []);

  return (
    <div className="h-screen flex bg-gray-950 text-white">
      {/* Agent Sidebar */}
      <AgentSidebar agents={agents} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-12 bg-gray-900 border-b border-gray-700 flex items-center px-4 gap-4">
          <h1 className="text-sm font-bold">
            ðŸŒŸ CREATIVE LIBERATION ENGINE <span className="text-gray-500">IECR Desktop v0.1.0</span>
          </h1>
          <div className="flex-1" />
          <div className={`text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
            {connected ? 'â— Connected' : 'â—‹ Disconnected'}
          </div>
        </header>

        {/* Split View: Dispatch Queue */}
        <DispatchQueue tasks={tasks} />

        {/* Constitutional Log */}
        <ConstitutionalLog events={events} />
      </div>
    </div>
  );
}
