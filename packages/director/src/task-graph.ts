/**
 * Director TaskGraph — Dependency-aware task decomposition engine
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * TaskGraph powers the IECR Director Agent — it converts high-level creative
 * or engineering intent into a dependency-ordered execution graph.
 * Specialist engines (Video, Audio, 3D, Design, Code, Assets) are the nodes.
 */

export type TaskGraphNodeType =
  | 'research'
  | 'design'
  | 'code'
  | 'audio'
  | 'video'
  | '3d'
  | 'asset'
  | 'validate'
  | 'deploy'
  | 'notify';

export type TaskGraphNodeStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'done'
  | 'failed'
  | 'skipped';

export interface TaskGraphNode {
  /** Unique ID within this graph */
  id: string;
  type: TaskGraphNodeType;
  title: string;
  description: string;
  /** IDs of nodes that must complete before this one can start */
  dependencies: string[];
  /** ID of the AVERI agent assigned to execute this node */
  assignedAgent?: string;
  /** Genkit flow to invoke */
  flow?: string;
  /** Input payload passed to the flow */
  input?: Record<string, unknown>;
  /** Output captured on completion */
  output?: Record<string, unknown>;
  status: TaskGraphNodeStatus;
  /** ISO timestamps */
  startedAt?: string;
  completedAt?: string;
  error?: string;
  /** Estimated duration in seconds */
  estimatedDuration?: number;
}

export interface TaskGraph {
  id: string;
  title: string;
  description: string;
  /** The original user prompt that spawned this graph */
  prompt: string;
  tenantId: string;
  nodes: TaskGraphNode[];
  /** Overall graph status — computed from node statuses */
  status: 'pending' | 'running' | 'done' | 'failed' | 'partial';
  createdAt: string;
  completedAt?: string;
  /** Agent that created this graph */
  directedBy: string;
}

/**
 * Get all nodes whose dependencies are fully satisfied (status=done).
 * These nodes are eligible to run now.
 */
export function getReadyNodes(graph: TaskGraph): TaskGraphNode[] {
  const doneIds = new Set(
    graph.nodes.filter(n => n.status === 'done').map(n => n.id)
  );
  return graph.nodes.filter(node => {
    if (node.status !== 'pending') return false;
    return node.dependencies.every(dep => doneIds.has(dep));
  });
}

/**
 * Compute the overall graph status from node statuses.
 */
export function computeGraphStatus(graph: TaskGraph): TaskGraph['status'] {
  const statuses = graph.nodes.map(n => n.status);
  if (statuses.every(s => s === 'done')) return 'done';
  if (statuses.some(s => s === 'failed')) {
    const hasRunning = statuses.some(s => s === 'running');
    return hasRunning ? 'running' : 'failed';
  }
  if (statuses.some(s => s === 'running' || s === 'ready')) return 'running';
  if (statuses.every(s => s === 'pending')) return 'pending';
  return 'partial';
}

/**
 * Update a node's status and timestamps in place.
 */
export function updateNodeStatus(
  graph: TaskGraph,
  nodeId: string,
  status: TaskGraphNodeStatus,
  output?: Record<string, unknown>,
  error?: string
): TaskGraph {
  const updatedNodes = graph.nodes.map(node => {
    if (node.id !== nodeId) return node;
    const updated: TaskGraphNode = { ...node, status };
    if (status === 'running' && !updated.startedAt) {
      updated.startedAt = new Date().toISOString();
    }
    if (status === 'done' || status === 'failed') {
      updated.completedAt = new Date().toISOString();
    }
    if (output) updated.output = output;
    if (error) updated.error = error;
    return updated;
  });

  const updatedGraph: TaskGraph = { ...graph, nodes: updatedNodes };
  updatedGraph.status = computeGraphStatus(updatedGraph);
  if (updatedGraph.status === 'done') {
    updatedGraph.completedAt = new Date().toISOString();
  }
  return updatedGraph;
}

/**
 * Create a new TaskGraph with generated node IDs.
 */
export function createTaskGraph(
  prompt: string,
  tenantId: string,
  directedBy: string,
  nodeDefs: Array<Omit<TaskGraphNode, 'id' | 'status'> & { status?: TaskGraphNodeStatus }>
): TaskGraph {
  const id = `tg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nodes: TaskGraphNode[] = nodeDefs.map((def, i) => ({
    ...def,
    id: def.dependencies.length === 0 ? `${id}-root-${i}` : `${id}-node-${i}`,
    status: def.status ?? 'pending',
  }));

  return {
    id,
    title: prompt.slice(0, 80),
    description: prompt,
    prompt,
    tenantId,
    nodes,
    status: 'pending',
    createdAt: new Date().toISOString(),
    directedBy,
  };
}
