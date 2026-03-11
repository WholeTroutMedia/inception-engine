import { useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import './App.css'

import { AuthProvider } from './contexts/AuthContext'
const AuthGuard = ({ children }: { children: React.ReactNode }) => <>{children}</>

import Welcome from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import { TacticalDashboard } from './components/TacticalDashboard'
import { LayoutShell } from './components/LayoutShell'
import AgentCatalog from './pages/AgentCatalog'
import NeuralMonitor from './pages/NeuralMonitor'
import Constitution from './pages/Constitution'
import Settings from './pages/Settings'
import FlowExplorer from './pages/FlowExplorer'
import TokenPlayground from './pages/TokenPlayground'
import NexusLight from './pages/NexusLight'
import Walkthrough from './pages/Walkthrough'
import KeyVault from './pages/KeyVault'
import CometPage from './pages/CometPage'
import InceptionVfx from './pages/InceptionVfx'
import CreativeWorkstation from './pages/CreativeWorkstation'
import CampaignControl from './pages/CampaignControl'
import CampaignDelivery from './pages/CampaignDelivery'
import DispatchCenter from './pages/DispatchCenter'
import AnimationStudio from './pages/AnimationStudio'
import Blueprints from './pages/Blueprints'
import ClientDashboard from './pages/ClientDashboard'
import ZeroDayIntake from './pages/ZeroDayIntake'
import AgentIdentityManager from './pages/AgentIdentityManager'
import InceptionLanding from './pages/InceptionLanding'
import FinancialCommandCenter from './pages/FinancialCommandCenter'
import Onboarding from './pages/Onboarding'
import DesignSandboxPage from './pages/DesignSandboxPage'
import PipelineGraph from './pages/PipelineGraph'
import ProcessPost from './pages/ProcessPost'
import CollabStudio from './pages/CollabStudio'
import ThePanopticon from './pages/ThePanopticon'
import SignalDashboard from './pages/SignalDashboard'
import DIRADashboard from './pages/DIRADashboard'
import { ChatConsole } from './pages/ChatConsole'
import ClientPortal from './pages/ClientPortal'
import VelocityTelemetry from './pages/VelocityTelemetry'
import LeadScoringDashboard from './pages/LeadScoringDashboard'
import SovereignMesh from './pages/SovereignMesh'
import ZeroDayTelemetry from './pages/ZeroDayTelemetry'
import GtmAnalyticsDashboard from './pages/GtmAnalyticsDashboard'
import CloudMeshPage from './pages/CloudMeshPage'
import VCPitchDeck from './pages/VCPitchDeck'

/* ── Routes that bypass the spatial shell ────────────────────── */
const FULLSCREEN = ['/welcome', '/keys', '/start', '/onboarding', '/portal']



/* ── Spatial shell removed for LayoutShell ── */

/* ── Root app ─────────────────────────────────────────────────── */
export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const isFullscreen = FULLSCREEN.some(p => location.pathname.startsWith(p))

  // Global Sandbox handoff listener (T20260306-120)
  useEffect(() => {
    const handleHandoff = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.id) {
        navigate('/sandbox', { state: { variationId: customEvent.detail.id } })
      }
    };
    window.addEventListener('sandbox:open-variation', handleHandoff);
    return () => window.removeEventListener('sandbox:open-variation', handleHandoff);
  }, [navigate]);

  if (isFullscreen) {
    return (
      <AuthProvider>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/keys" element={<KeyVault />} />
          <Route path="/start" element={<Walkthrough />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/portal/:clientId" element={<ClientPortal />} />
        </Routes>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <AuthGuard>
        <LayoutShell>
          <Routes>
            <Route path="/" element={<TacticalDashboard />} />
            <Route path="/health" element={<Dashboard />} />
            <Route path="/agents" element={<AgentCatalog />} />
            <Route path="/neural" element={<NeuralMonitor />} />
            <Route path="/constitution" element={<Constitution />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/tokens" element={<TokenPlayground />} />
            <Route path="/flows" element={<FlowExplorer />} />
            <Route path="/nexus" element={<NexusLight />} />
            <Route path="/scout" element={<CometPage />} />
            <Route path="/vfx" element={<InceptionVfx />} />
            <Route path="/creative" element={<CreativeWorkstation />} />
            <Route path="/campaigns" element={<CampaignControl />} />
            <Route path="/delivery/:campaignId" element={<CampaignDelivery />} />
            <Route path="/dispatch" element={<DispatchCenter />} />
            <Route path="/animation" element={<AnimationStudio />} />
            <Route path="/blueprints" element={<Blueprints />} />
            <Route path="/clients/:clientId" element={<ClientDashboard />} />
            <Route path="/intake-form" element={<ZeroDayIntake />} />
            <Route path="/identity" element={<AgentIdentityManager />} />
            <Route path="/landing-preview" element={<InceptionLanding />} />
            <Route path="/telemetry" element={<ZeroDayTelemetry />} />
            <Route path="/finance" element={<FinancialCommandCenter />} />
            <Route path="/sandbox" element={<DesignSandboxPage />} />
            <Route path="/pipeline" element={<PipelineGraph />} />
            <Route path="/process" element={<ProcessPost />} />
            <Route path="/collab" element={<CollabStudio />} />
            <Route path="/panopticon" element={<ThePanopticon />} />
            <Route path="/signal" element={<SignalDashboard />} />
            <Route path="/dira" element={<DIRADashboard />} />
            <Route path="/velocity" element={<VelocityTelemetry />} />
            <Route path="/chat" element={<ChatConsole />} />
            <Route path="/leads" element={<LeadScoringDashboard />} />
            <Route path="/mesh" element={<SovereignMesh />} />
            <Route path="/cloud-mesh" element={<CloudMeshPage />} />
            <Route path="/dashboard/gtm" element={<GtmAnalyticsDashboard />} />
            <Route path="/pitch" element={<VCPitchDeck />} />
            <Route path="*" element={<TacticalDashboard />} />
          </Routes>
        </LayoutShell>
      </AuthGuard>
    </AuthProvider>
  )
}
