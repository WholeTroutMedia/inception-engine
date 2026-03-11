/**
 * Agent Topology Service
 * 
 * Signal-based data service for the orchestration dashboard.
 * Connects to .agent-status.json and provides real-time agent topology
 * via WebSocket updates from the orchestrator.
 * 
 * @app orchestration-dashboard
 * @issue #33 — HELIX A+B
 * @agent COMET (AURORA hive)
 */

import { Injectable, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { retry, map } from 'rxjs/operators';

// ─── Types ───────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'active' | 'error' | 'sleeping' | 'blocked';
export type AgentMode = 'IDEATE' | 'PLAN' | 'SHIP' | 'VALIDATE';
export type HiveName = 'AURORA' | 'KEEPER' | 'FORGE' | 'SENTINEL' | 'SAGE' | 'NEXUS';

export interface AgentNode {
  id: string;
  name: string;
  emoji: string;
  hive: HiveName;
  status: AgentStatus;
  currentMode: AgentMode;
  taskCount: number;
  lastActive: string;
  constitutionalScore: number;
}

export interface HiveGroup {
  name: HiveName;
  agents: AgentNode[];
  activeCount: number;
  color: string;
}

export interface PipelineStage {
  mode: AgentMode;
  isActive: boolean;
  progress: number;
  agentsInStage: string[];
}

export interface TopologyUpdate {
  type: 'agent_update' | 'mode_change' | 'gate_result' | 'full_sync';
  payload: any;
  timestamp: string;
}

// ─── Hive Color Map ────────────────────────────────────────

const HIVE_COLORS: Record<HiveName, string> = {
  AURORA: '#ff6b6b',
  KEEPER: '#4ecdc4',
  FORGE: '#45b7d1',
  SENTINEL: '#96ceb4',
  SAGE: '#ffeaa7',
  NEXUS: '#dda0dd',
};

// ─── Service ─────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AgentTopologyService {
  private ws$: WebSocketSubject<TopologyUpdate> | null = null;
  
  // Signals
  readonly agents = signal<AgentNode[]>([]);
  readonly connectionStatus = signal<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  
  // Computed
  readonly hiveGroups = computed<HiveGroup[]>(() => {
    const agentList = this.agents();
    const hives: HiveName[] = ['AURORA', 'KEEPER', 'FORGE', 'SENTINEL', 'SAGE', 'NEXUS'];
    return hives.map(name => {
      const hiveAgents = agentList.filter(a => a.hive === name);
      return {
        name,
        agents: hiveAgents,
        activeCount: hiveAgents.filter(a => a.status === 'active').length,
        color: HIVE_COLORS[name],
      };
    });
  });

  readonly pipeline = computed<PipelineStage[]>(() => {
    const agentList = this.agents();
    const modes: AgentMode[] = ['IDEATE', 'PLAN', 'SHIP', 'VALIDATE'];
    return modes.map(mode => ({
      mode,
      isActive: agentList.some(a => a.currentMode === mode && a.status === 'active'),
      progress: 0,
      agentsInStage: agentList.filter(a => a.currentMode === mode).map(a => a.id),
    }));
  });

  readonly totalActive = computed(() => this.agents().filter(a => a.status === 'active').length);
  readonly totalAgents = computed(() => this.agents().length);

  connect(wsUrl: string = 'ws://localhost:8080/ws/topology'): void {
    this.ws$ = webSocket<TopologyUpdate>(wsUrl);
    this.connectionStatus.set('reconnecting');

    this.ws$.pipe(
      retry({ delay: 3000 }),
    ).subscribe({
      next: (update) => this.handleUpdate(update),
      error: () => this.connectionStatus.set('disconnected'),
      complete: () => this.connectionStatus.set('disconnected'),
    });

    this.connectionStatus.set('connected');
  }

  disconnect(): void {
    this.ws$?.complete();
    this.connectionStatus.set('disconnected');
  }

  private handleUpdate(update: TopologyUpdate): void {
    switch (update.type) {
      case 'full_sync':
        this.agents.set(update.payload.agents);
        break;
      case 'agent_update': {
        const updated = update.payload as AgentNode;
        this.agents.update(agents =>
          agents.map(a => a.id === updated.id ? { ...a, ...updated } : a)
        );
        break;
      }
      case 'mode_change': {
        const { agentId, newMode } = update.payload;
        this.agents.update(agents =>
          agents.map(a => a.id === agentId ? { ...a, currentMode: newMode } : a)
        );
        break;
      }
    }
  }
}