import { NavLink, useLocation } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import './LayoutShell.css';

const NAV = [
  {
    group: '',
    items: [
      { icon: '◆', label: 'Dashboard', to: '/' },
    ],
  },
  {
    group: 'CREATE',
    items: [
      { icon: '○', label: 'NEXUS', to: '/nexus' },
      { icon: '◈', label: 'TOKENS', to: '/tokens' },
      { icon: '◈', label: 'Creative Studio', to: '/creative' },
      { icon: '✦', label: 'Campaign Control', to: '/campaigns' },
      { icon: '◉', label: 'SCOUT Browser', to: '/scout' },
      { icon: '◧', label: 'Studio VFX', to: '/vfx' },
      { icon: '⬡', label: 'Flow Explorer', to: '/flows' },
      { icon: '▶', label: 'Animation Studio', to: '/animation' },
      { icon: '⬡', label: 'Pipeline Graph', to: '/pipeline' },
    ],
  },
  {
    group: 'INTEL',
    items: [
      { icon: '💬', label: 'Chat Console', to: '/chat' },
      { icon: '⬢', label: 'Agent Catalog', to: '/agents' },
      { icon: '✦', label: 'Neural Monitor', to: '/neural' },
      { icon: '⊕', label: 'Dispatch', to: '/dispatch' },
      { icon: '◫', label: 'Blueprints', to: '/blueprints' },
      { icon: '◉', label: 'SIGNAL', to: '/signal' },
      { icon: '◉', label: 'Velocity', to: '/velocity' },
      { icon: '⏣', label: 'The Panopticon', to: '/panopticon' },
      { icon: '🔬', label: 'DIRA', to: '/dira' },
      { icon: '⬡', label: 'Sovereign Mesh', to: '/mesh' },
      { icon: '☁', label: 'Cloud Mesh', to: '/cloud-mesh' },
    ],
  },
  {
    group: 'GOVERN',
    items: [
      { icon: '⚖', label: 'Constitution', to: '/constitution' },
      { icon: '🔐', label: 'Agent Identity', to: '/identity' },
      { icon: '⚙', label: 'Settings', to: '/settings' },
    ],
  },
  {
    group: 'GTM',
    items: [
      { icon: '⚡', label: 'Zero-Day Intake', to: '/intake-form' },
      { icon: '📈', label: 'Revenue & Funnel', to: '/dashboard/gtm' },
      { icon: '◎', label: 'Landing Preview', to: '/landing-preview' },
      { icon: '◉', label: 'Telemetry', to: '/telemetry' },
      { icon: '◈', label: 'Lead Scoring', to: '/leads' },
    ],
  },
  {
    group: 'ASSETS',
    items: [
      { icon: '◎', label: 'Finance Command', to: '/finance' },
    ],
  },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    
    return (
        <div className="layout-shell">
            {/* Top Bar */}
            <header className="tactical-topbar">
                <div className="topbar-logo">CLE // MISSION CONTROL</div>
                <div className="topbar-status">
                    <span className="status-dot ok"></span> LIVE (Cmd+K)
                </div>
            </header>

            <div className="layout-body">
                {/* Side Navigation */}
                <aside className="tactical-sidebar">
                    <nav className="sidebar-nav">
                        {NAV.map((section, i) => (
                            <div key={i} className="nav-section">
                                {section.group && <div className="nav-group-title">{section.group}</div>}
                                {section.items.map((item, j) => {
                                    const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                                    return (
                                        <NavLink
                                            key={j}
                                            to={item.to}
                                            className={`nav-item ${isActive ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon">{item.icon}</span>
                                            {item.label}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="tactical-main">
                    {children}
                </main>
            </div>

            <CommandPalette />
        </div>
    );
}
