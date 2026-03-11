import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'

/* ── Navigation structure ────────────────────────────────────── */
const NAV = [
  {
    group: '',
    items: [{ icon: '◆', label: 'Dashboard', to: '/' }]
  },
  {
    group: 'SPATIAL OS',
    items: [
      { icon: '◉', label: 'Local Scout', to: '/scout' },
      { icon: '⬡', label: 'Neural Workstation', to: '/workstation' },
      { icon: '✦', label: 'Genesis Control', to: '/control' }
    ]
  }
]

const HINTS = [
  'Show me the latest PRs on Gitea...',
  'Open the Cloud Run deployment console...',
  'Navigate to localhost:5173...'
]

/* ── ATHENA floating command bar ─────────────────────────────── */
function AthenaCmdBar(): React.ReactElement {
  const [val, setVal] = useState('')
  const [hint, setHint] = useState(0)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (focused) return
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 3800)
    return () => clearInterval(t)
  }, [focused])

  const submit = (): void => {
    const q = val.trim()
    if (!q) return
    console.log('ATHENA Commanded:', q)
    // Here we'll dispatch IPC event to the main process to handle navigation
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('browser:navigate', q)
    }
    setVal('')
  }

  return (
    <div className={`athena-cmd-bar ${focused ? 'focused' : ''}`}>
      <span className="athena-label">ATHENA / OS</span>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={HINTS[hint]}
        className="athena-input"
        title="Command Line for ATHENA"
      />
      <button onClick={submit} className={`athena-btn ${val.trim() ? 'active' : ''}`}>
        →
      </button>
    </div>
  )
}

/* ── Icon rail ────────────────────────────────────────────────── */
function IconRail(): React.ReactElement {
  const location = useLocation()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  const isActive = (to: string): boolean =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`icon-rail ${hovered ? 'expanded' : ''}`}
    >
      {/* Logo */}
      <div onClick={() => navigate('/')} className="icon-rail-logo">
        <div className="icon-rail-logo-icon logo-accent">OS</div>
        <div className="icon-rail-logo-text">
          <div className="icon-rail-logo-title">INCEPTION</div>
          <div className="icon-rail-logo-subtitle">SPATIAL BROWSER</div>
        </div>
      </div>

      {/* Nav groups */}
      <div className="icon-rail-nav">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.group && hovered && <div className="icon-rail-group">{group.group}</div>}
            {!group.group && gi > 0 && <div className="icon-rail-divider" />}
            {group.items.map((item) => {
              const active = isActive(item.to)
              return (
                <NavLink key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                  <div className={`icon-rail-item ${active ? 'active' : ''}`}>
                    <span className="icon-rail-item-icon">{item.icon}</span>
                    <span className="icon-rail-item-label">{item.label}</span>
                  </div>
                </NavLink>
              )
            })}
          </div>
        ))}
      </div>

      {/* System live */}
      <div className="icon-rail-system">
        <span className="icon-rail-system-dot" />
        <span className="icon-rail-system-text">NATIVE LIVE</span>
      </div>
    </aside>
  )
}

/* ── Spatial shell ────────────────────────────────────────────── */
function SpatialShell({ children }: { children: React.ReactNode }): React.ReactElement {
  // This layout is designed so the Main area is transparent or specifically bounded
  // to allow the Electron Main Process to overlay the BrowserView cleanly.
  return (
    <div className="spatial-shell drag-region">
      <IconRail />
      <main className="spatial-main no-drag">
        <div className="browser-chrome">
          <div className="browser-chrome-text">INCEPTION SPATIAL DOM</div>
        </div>
        <div className="browser-view-container" id="browser-view-container">
          {children}
        </div>
        <AthenaCmdBar />
      </main>
    </div>
  )
}

function WelcomePanel(): React.ReactElement {
  return (
    <div className="welcome-panel">
      <h1 className="page-title">Spatial OS Initialization</h1>
      <p className="page-subtitle">
        The native environment is active and waiting for instructions.
      </p>
    </div>
  )
}

export default function App(): React.ReactElement {
  return (
    <SpatialShell>
      <Routes>
        <Route path="/" element={<WelcomePanel />} />
      </Routes>
    </SpatialShell>
  )
}
