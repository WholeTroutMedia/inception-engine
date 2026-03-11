/**
 * Node Registry — Universal Browser Mesh
 *
 * Single source of truth for all connected browser nodes across all modes:
 *   - SOVEREIGN (Playwright-managed Chromium)
 *   - CDP ATTACH (your existing Chrome/Edge/Brave/Arc)
 *   - EXTENSION (Firefox, Safari, any browser with the extension installed)
 *
 * Registered nodes are surfaced via the /api/nodes endpoint and the
 * Browser Observatory panel in the Creative Liberation Engine Console.
 */

import type { BrowserNode, NodeMode, NodeStatus } from './cdp-manager.js';

export type { BrowserNode, TabRecord } from './cdp-manager.js';
export type { NodeMode, NodeStatus };

interface RegistryEntry {
  node: BrowserNode;
  updatedAt: Date;
}

class NodeRegistry {
  private nodes: Map<string, RegistryEntry> = new Map();

  /** Register or update a browser node in the mesh. */
  register(node: BrowserNode): void {
    this.nodes.set(node.id, { node, updatedAt: new Date() });
    console.error(`[Registry] ✅ ${node.mode.toUpperCase()} node registered: ${node.id} (${node.browser})`);
  }

  /** Remove a node from the mesh (on disconnect). */
  unregister(nodeId: string): void {
    this.nodes.delete(nodeId);
    console.error(`[Registry] ❌ Node removed: ${nodeId}`);
  }

  /** Update a node's status. */
  updateStatus(nodeId: string, status: NodeStatus): void {
    const entry = this.nodes.get(nodeId);
    if (entry) {
      entry.node.status = status;
      entry.updatedAt = new Date();
    }
  }

  /** Assign a task to a node. */
  assignTask(nodeId: string, agentId: string, taskId: string): void {
    const entry = this.nodes.get(nodeId);
    if (entry) {
      entry.node.status = 'busy';
      entry.node.agentId = agentId;
      entry.node.taskId = taskId;
      entry.updatedAt = new Date();
    }
  }

  /** Release a task from a node. */
  releaseTask(nodeId: string): void {
    const entry = this.nodes.get(nodeId);
    if (entry) {
      entry.node.status = 'available';
      entry.node.agentId = undefined;
      entry.node.taskId = undefined;
      entry.updatedAt = new Date();
    }
  }

  /** Get all nodes. */
  getAll(): BrowserNode[] {
    return Array.from(this.nodes.values()).map(e => e.node);
  }

  /** Get nodes by mode (sovereign, cdp, extension). */
  getByMode(mode: NodeMode): BrowserNode[] {
    return this.getAll().filter(n => n.mode === mode);
  }

  /** Get all available (not busy, not disconnected) nodes. */
  getAvailable(): BrowserNode[] {
    return this.getAll().filter(n => n.status === 'available' || n.status === 'idle');
  }

  /**
   * Get the best available node for a task.
   * Priority: sovereign → cdp → extension (most control first)
   */
  getBestAvailable(): BrowserNode | null {
    const available = this.getAvailable();
    return (
      available.find(n => n.mode === 'sovereign') ??
      available.find(n => n.mode === 'cdp') ??
      available.find(n => n.mode === 'extension') ??
      null
    );
  }

  /** Get a specific node by ID. */
  get(nodeId: string): BrowserNode | undefined {
    return this.nodes.get(nodeId)?.node;
  }

  /** Summary for status endpoints. */
  summary(): {
    total: number;
    available: number;
    busy: number;
    byMode: Record<NodeMode, number>;
  } {
    const all = this.getAll();
    return {
      total: all.length,
      available: all.filter(n => n.status === 'available' || n.status === 'idle').length,
      busy: all.filter(n => n.status === 'busy').length,
      byMode: {
        sovereign: all.filter(n => n.mode === 'sovereign').length,
        cdp: all.filter(n => n.mode === 'cdp').length,
        extension: all.filter(n => n.mode === 'extension').length,
      },
    };
  }
}

// Singleton
export const nodeRegistry = new NodeRegistry();
