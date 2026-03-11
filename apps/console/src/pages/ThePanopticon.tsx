import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './Panopticon.css'

// Initial Nodes
const initialNodes: Node[] = [
  {
    id: 'cle',
    type: 'default',
    position: { x: 500, y: 300 },
    data: { label: '◈ ANTIGRAVITY (Builder)' },
    className: 'neon-node node-core',
  },
  {
    id: 'comet',
    type: 'default',
    position: { x: 800, y: 150 },
    data: { label: '◉ COMET (Scout)' },
    className: 'neon-node node-scout',
  },
  {
    id: 'scribe',
    type: 'default',
    position: { x: 200, y: 150 },
    data: { label: '⌬ SCRIBE (Memory)' },
    className: 'neon-node node-memory',
  },
  {
    id: 'dispatch',
    type: 'default',
    position: { x: 500, y: 50 },
    data: { label: '⊕ DISPATCH (Queue)' },
    className: 'neon-node node-system',
  },
]

// Initial Edges
const initialEdges: Edge[] = [
  {
    id: 'e-dispatch-cle',
    source: 'dispatch',
    target: 'cle',
    animated: true,
    style: { stroke: '#4caf50', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#4caf50' },
  },
  {
    id: 'e-dispatch-comet',
    source: 'dispatch',
    target: 'comet',
    animated: true,
    style: { stroke: '#00e5ff', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#00e5ff' },
  },
  {
    id: 'e-cle-scribe',
    source: 'cle',
    target: 'scribe',
    animated: true,
    style: { stroke: '#e040fb', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#e040fb' },
  },
  {
    id: 'e-comet-scribe',
    source: 'comet',
    target: 'scribe',
    animated: true,
    style: { stroke: '#e040fb', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#e040fb' },
  },
]

export default function ThePanopticon() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  // Fake telemetry pulse for effect
  useEffect(() => {
    const pulse = setInterval(() => {
      setNodes((nds) => 
        nds.map((node) => {
          if (node.id === 'cle') {
            return {
              ...node,
              style: { 
                boxShadow: `0 0 ${Math.random() * 20 + 10}px #4caf50`,
                transition: 'box-shadow 0.2s ease-in-out'
              }
            }
          }
          return node;
        })
      )
    }, 1000)
    return () => clearInterval(pulse)
  }, [setNodes])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

  return (
    <div className="panopticon-container">
      <div className="panopticon-header">
        <h1>THE PANOPTICON</h1>
        <p>Live Orchestration Matrix</p>
      </div>
      
      <div className="panopticon-matrix">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          colorMode="dark"
        >
          <Background color="#1a1a1a" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}
