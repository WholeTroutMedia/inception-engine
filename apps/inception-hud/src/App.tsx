import { Activity, Cpu, Hexagon, Layers, Network, Server, Shield, Terminal } from 'lucide-react'
import { motion } from 'framer-motion'
import './index.css'

export default function App() {
  return (
    <>
      <div className="spatial-grid" />
      <div className="hud-container">
        
        <header className="hud-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Hexagon size={24} color="var(--accent-primary)" />
            </motion.div>
            <h1 style={{ fontSize: '14px', letterSpacing: '0.2em' }}>CREATIVE LIBERATION ENGINE</h1>
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <Badge icon={<Server size={14} />} label="SYS_ONLINE" color="var(--accent-secondary)" />
            <Badge icon={<Shield size={14} />} label="CORE_SECURE" color="var(--accent-secondary)" />
            <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>v5.0.0_GENESIS</span>
          </div>
        </header>

        <aside style={{ display: 'flex', flexDirection: 'column' }}>
          <Panel title="ACTIVE_AGENTS" icon={<Network size={14} />}>
            <AgentRow name="ATHENA" status="STRATEGY" load={42} />
            <AgentRow name="VERA" status="ANALYSIS" load={28} />
            <AgentRow name="IRIS" status="EXECUTION" load={89} active />
            <AgentRow name="RAM_CREW" status="STANDBY" load={2} />
          </Panel>
          <Panel title="SYSTEM_TELEMETRY" icon={<Cpu size={14} />}>
            <TelemetryMetric label="CPU_ALLOC" value="64.2%" />
            <TelemetryMetric label="MEM_USAGE" value="12.8 GB" />
            <TelemetryMetric label="NET_IN" value="142 MB/s" />
            <TelemetryMetric label="NET_OUT" value="18 MB/s" />
          </Panel>
        </aside>

        <main className="hud-main">
          <div style={{ flex: 1, border: '1px solid var(--border-subtle)', borderRadius: '4px', position: 'relative', overflow: 'hidden', background: 'var(--bg-panel)' }}>
            <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
              <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', opacity: 0.7 }}>GLOBAL_REALM_TOPOLOGY</span>
            </div>
            
            <ActivityNode x="30%" y="40%" label="DISPATCH_SERVER" active />
            <ActivityNode x="60%" y="30%" label="GENKIT_ORCH" />
            <ActivityNode x="45%" y="70%" label="SYNOLOGY_NAS" active />
            <ActivityNode x="80%" y="60%" label="FIREBASE_EDGE" />
            
            <svg style={{ width: '100%', height: '100%', position: 'absolute', pointerEvents: 'none', zIndex: 1, top: 0, left: 0 }}>
              <motion.line x1="30%" y1="40%" x2="60%" y2="30%" stroke="var(--border-focus)" strokeWidth={1} strokeDasharray="4 4" 
                animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
              <motion.line x1="60%" y1="30%" x2="45%" y2="70%" stroke="var(--border-focus)" strokeWidth={1} strokeDasharray="4 4" />
              <motion.line x1="45%" y1="70%" x2="30%" y2="40%" stroke="var(--accent-primary)" strokeWidth={1.5} strokeDasharray="4 4"
                animate={{ strokeDashoffset: [0, 20] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
            </svg>
          </div>
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column' }}>
          <Panel title="WORKSTREAM_QUEUE" icon={<Layers size={14} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <TaskCard id="TSK-084" title="Deploy Dispatch Server" status="IN_PROGRESS" />
              <TaskCard id="TSK-085" title="Initialize Zero-Day Flow" status="QUEUED" />
              <TaskCard id="TSK-086" title="Figma Component Sync" status="QUEUED" />
            </div>
          </Panel>
          <Panel title="EVENT_LOG" icon={<Terminal size={14} />}>
            <LogEntry time="21:55:12" msg="HUD Interface initialized." type="SYS" />
            <LogEntry time="21:55:14" msg="Dispatch server heartbeat OK." type="NET" />
            <LogEntry time="21:55:18" msg="IRIS executing spatial rendering." type="EXEC" highlight />
            <LogEntry time="21:55:20" msg="Subsystem check nominal." type="SYS" />
          </Panel>
        </aside>

      </div>
    </>
  )
}

function Badge({ icon, label, color }: { icon: React.ReactNode, label: string, color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: `1px solid ${color}`, padding: '4px 8px', borderRadius: '2px', backgroundColor: `${color}10` }}>
      <div style={{ color, display: 'flex' }}>{icon}</div>
      <span className="mono" style={{ fontSize: '10px', color }}>{label}</span>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="hud-panel">
      <div className="hud-panel-header">
        <div style={{ display: 'flex' }}>{icon}</div>
        {title}
      </div>
      <div className="hud-panel-content">
        {children}
      </div>
    </div>
  )
}

function AgentRow({ name, status, load, active }: { name: string, status: string, load: number, active?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', opacity: active ? 1 : 0.6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span className="mono" style={{ fontSize: '12px', color: active ? 'var(--text-main)' : 'var(--text-muted)' }}>{name}</span>
        <span className="mono" style={{ fontSize: '9px', color: 'var(--accent-secondary)' }}>[{status}]</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '40px', height: '4px', background: 'var(--border-subtle)' }}>
          <div style={{ width: `${load}%`, height: '100%', background: active ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
        </div>
        <span className="mono" style={{ fontSize: '10px', width: '24px', textAlign: 'right' }}>{load}%</span>
      </div>
    </div>
  )
}

function TelemetryMetric({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--border-subtle)' }}>
      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-main)' }}>{value}</span>
    </div>
  )
}

function TaskCard({ id, title, status }: { id: string, title: string, status: string }) {
  const isProgress = status === 'IN_PROGRESS'
  return (
    <div style={{ border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '2px', background: isProgress ? 'var(--border-subtle)' : 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)' }}>{id}</span>
        <span className="mono" style={{ fontSize: '9px', color: isProgress ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{status}</span>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}>{title}</div>
    </div>
  )
}

function LogEntry({ time, msg, type, highlight }: { time: string, msg: string, type: string, highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '11px', opacity: highlight ? 1 : 0.7 }}>
      <span className="mono" style={{ width: '50px', color: 'var(--text-muted)' }}>{time}</span>
      <span className="mono" style={{ color: highlight ? 'var(--accent-primary)' : 'var(--accent-secondary)' }}>[{type}]</span>
      <span style={{ color: highlight ? 'var(--text-main)' : undefined, fontFamily: 'Inter, sans-serif' }}>{msg}</span>
    </div>
  )
}

function ActivityNode({ x, y, label, active }: { x: string, y: string, label: string, active?: boolean }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2 }}>
      <motion.div 
        style={{ width: '16px', height: '16px', borderRadius: '2px', background: active ? 'var(--accent-primary)' : 'var(--border-subtle)', border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-focus)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        animate={active ? { scale: [1, 1.2, 1], rotate: [0, 45, 90] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Activity size={12} color="var(--bg-core)" />
      </motion.div>
      <span className="mono" style={{ fontSize: '10px', color: active ? 'var(--text-main)' : 'var(--text-muted)', background: 'var(--bg-core)', padding: '2px 4px', border: '1px solid var(--border-subtle)' }}>
        {label}
      </span>
    </div>
  )
}
