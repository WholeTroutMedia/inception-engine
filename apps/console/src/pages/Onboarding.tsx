import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Globe, MonitorSmartphone, Sparkles, Terminal, Activity } from 'lucide-react'
import './Onboarding.css'
import ServiceScanner from './ServiceScanner'
import SetupWizard from './SetupWizard'



/* ── COMPONENTS ─────────────────────────────────────────── */
const FadeIn = ({ children, delay = 0, className = '', style }: { children: React.ReactNode, delay?: number, className?: string, style?: React.CSSProperties }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        className={className}
        style={style}
    >
        {children}
    </motion.div>
)

export default function Onboarding() {
    const navigate = useNavigate()
    const [step, setStep] = useState(0)

    // Phase 2 State
    const [identity, setIdentity] = useState<string | null>(null)
    const [comfort, setComfort] = useState<string | null>(null)

    // Phase 5 State
    const [mission, setMission] = useState<string | null>(null)

    // Phase 6 State
    const [ambientReady, setAmbientReady] = useState(false)

    // Phase 3 Scanner logic delegated to ServiceScanner component

    // Phase 6 Ambient logic
    useEffect(() => {
        if (step === 5) {
            const runAmbient = async () => {
                setAmbientReady(false)
                const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
                await delay(2000)
                setAmbientReady(true)
                await delay(800)
                navigate(mission || '/')
            }
            runAmbient()
        }
    }, [step, mission, navigate])

    // Settings are handled internally by SetupWizard
    return (
        <div className="onboarding-container">
            {/* Dynamic Backgrounds */}
            <div className="onboarding-bg-glow" data-step={step} />

            <div className="onboarding-header">
                <div className="onboarding-logo">
                    <div className="onboarding-logo-icon">IE</div>
                    <div className="onboarding-sys">GENESIS · OS</div>
                </div>
                <div className="onboarding-steps">
                    <div className={`onboarding-dot ${step >= 0 ? 'active' : ''}`} />
                    <div className={`onboarding-line ${step >= 1 ? 'active' : ''}`} />
                    <div className={`onboarding-dot ${step >= 1 ? 'active' : ''}`} />
                    <div className={`onboarding-line ${step >= 2 ? 'active' : ''}`} />
                    <div className={`onboarding-dot ${step >= 2 ? 'active' : ''}`} />
                    <div className={`onboarding-line ${step >= 3 ? 'active' : ''}`} />
                    <div className={`onboarding-dot ${step >= 3 ? 'active' : ''}`} />
                    <div className={`onboarding-line ${step >= 4 ? 'active' : ''}`} />
                    <div className={`onboarding-dot ${step >= 4 ? 'active' : ''}`} />
                </div>
            </div>

            <div className="onboarding-content">
                <AnimatePresence mode="wait">

                    {/* ══════════════════════════════════
              PHASE 0-1: WELCOME
             ══════════════════════════════════ */}
                    {step === 0 && (
                        <motion.div key="step0" className="onboarding-step center-content" exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }} transition={{ duration: 0.5 }}>
                            <FadeIn delay={0.1}>
                                <div className="onboarding-badge">INITIALIZATION SEQUENCE</div>
                            </FadeIn>
                            <FadeIn delay={0.3}>
                                <h1 className="onboarding-title">
                                    <span className="text-gradient-chalk">INCEPTION</span><br />
                                    <span className="text-gradient-amber">ENGINE</span>
                                </h1>
                            </FadeIn>
                            <FadeIn delay={0.5}>
                                <p className="onboarding-subtitle">
                                    You are entering a sovereign digital environment.<br />
                                    39 agents await your command.
                                </p>
                            </FadeIn>
                            <FadeIn delay={0.8} className="mt-8">
                                <button className="onboarding-btn primary glow-amber" onClick={() => setStep(1)}>
                                    Begin Boot Sequence <span className="arrow">→</span>
                                </button>
                            </FadeIn>
                        </motion.div>
                    )}

                    {/* ══════════════════════════════════
              PHASE 2: IDENTITY & COMFORT
             ══════════════════════════════════ */}
                    {step === 1 && (
                        <motion.div key="step1" className="onboarding-step" exit={{ opacity: 0, x: -40 }} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}>
                            <FadeIn>
                                <h2 className="step-heading">Establish your profile</h2>
                                <p className="step-subheading">How do you prefer to interact with the system?</p>
                            </FadeIn>

                            <div className="profile-grid">
                                <FadeIn delay={0.2} className="profile-section">
                                    <div className="section-label">PRIMARY IDENTITY</div>
                                    <div className="options-grid">
                                        {[
                                            { id: 'creator', label: 'Creator', icon: Sparkles, desc: 'Visuals, worldbuilding, narrative' },
                                            { id: 'developer', label: 'Developer', icon: Terminal, desc: 'Code, architecture, systems' },
                                            { id: 'operator', label: 'Operator', icon: MonitorSmartphone, desc: 'Task execution, orchestration' },
                                            { id: 'strategist', label: 'Strategist', icon: Globe, desc: 'Analysis, planning, governance' },
                                        ].map(opt => (
                                            <div key={opt.id} onClick={() => setIdentity(opt.id)} className={`option-card ${identity === opt.id ? 'active' : ''}`}>
                                                <opt.icon className="option-icon" />
                                                <div className="option-label">{opt.label}</div>
                                                <div className="option-desc">{opt.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                </FadeIn>

                                <FadeIn delay={0.4} className="profile-section">
                                    <div className="section-label">COMFORT LEVEL</div>
                                    <div className="options-grid vertical">
                                        {[
                                            { id: 'guided', label: 'Guided', desc: 'Assistive UI, templates, step-by-step flows.' },
                                            { id: 'copilot', label: 'Co-Pilot', desc: 'Balanced mix of visual tools and command line.' },
                                            { id: 'sovereign', label: 'Sovereign', desc: 'Raw interfaces, terminal preferred, full control.' },
                                        ].map(opt => (
                                            <div key={opt.id} onClick={() => setComfort(opt.id)} className={`option-card row ${comfort === opt.id ? 'active' : ''}`}>
                                                <div>
                                                    <div className="option-label">{opt.label}</div>
                                                    <div className="option-desc">{opt.desc}</div>
                                                </div>
                                                {comfort === opt.id && <Check className="check-icon" />}
                                            </div>
                                        ))}
                                    </div>
                                </FadeIn>
                            </div>

                            <FadeIn delay={0.6} className="step-actions">
                                <button className="onboarding-btn secondary" onClick={() => setStep(0)}>← Back</button>
                                <button
                                    className={`onboarding-btn primary ${identity && comfort ? 'glow-violet' : 'disabled'}`}
                                    onClick={() => (identity && comfort) && setStep(2)}
                                >
                                    Confirm Profile →
                                </button>
                            </FadeIn>
                        </motion.div>
                    )}

                    {/* ══════════════════════════════════
              PHASE 3: SCANNER
             ══════════════════════════════════ */}
                    {step === 2 && (
                        <motion.div key="step2" className="onboarding-step" exit={{ opacity: 0, scale: 1.05 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <ServiceScanner onComplete={() => setStep(3)} onBack={() => setStep(1)} />
                        </motion.div>
                    )}

                    {/* ══════════════════════════════════
              PHASE 4: SETUP WIZARD / VAULT
             ══════════════════════════════════ */}
                    {step === 3 && (
                        <motion.div key="step3" className="onboarding-step" exit={{ opacity: 0, y: -40 }} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                            <SetupWizard onComplete={() => setStep(4)} onBack={() => setStep(2)} />
                        </motion.div>
                    )}

                    {/* ══════════════════════════════════
              PHASE 5: FIRST MISSION
             ══════════════════════════════════ */}
                    {step === 4 && (
                        <motion.div key="step4" className="onboarding-step" exit={{ opacity: 0, x: -40 }} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}>
                            <FadeIn>
                                <h2 className="step-heading">First Mission</h2>
                                <p className="step-subheading">Select an initial objective to deploy the Creative Liberation Engine.</p>
                            </FadeIn>

                            <div className="profile-grid">
                                <FadeIn delay={0.2} className="profile-section" style={{ gridColumn: '1 / -1' }}>
                                    <div className="options-grid">
                                        {[
                                            { id: 'creator', label: 'Creative Studio', icon: Sparkles, desc: 'Generate a multimodal brand asset', route: '/nexus' },
                                            { id: 'operator', label: 'System Diagnostics', icon: Activity, desc: 'Monitor neural pathways and agent health', route: '/neural' },
                                            { id: 'developer', label: 'Flow Explorer', icon: Terminal, desc: 'Analyze capability blueprints', route: '/flows' },
                                            { id: 'strategist', label: 'Agent Roster', icon: Globe, desc: 'Review active hives and capabilities', route: '/agents' },
                                        ].map(opt => (
                                            <div key={opt.id} onClick={() => setMission(opt.route)} className={`option-card ${mission === opt.route ? 'active' : ''}`}>
                                                <opt.icon className="option-icon" />
                                                <div className="option-label">{opt.label}</div>
                                                <div className="option-desc">{opt.desc}</div>
                                                {identity === opt.id && <div className="option-recommended-tag">RECOMMENDED</div>}
                                            </div>
                                        ))}
                                    </div>
                                </FadeIn>
                            </div>

                            <FadeIn delay={0.6} className="step-actions">
                                <button className="onboarding-btn secondary" onClick={() => navigate('/')}>Skip to Dashboard</button>
                                <button
                                    className={`onboarding-btn primary ${mission ? 'glow-amber' : 'disabled'}`}
                                    onClick={() => mission && setStep(5)}
                                >
                                    Engage Mission →
                                </button>
                            </FadeIn>
                        </motion.div>
                    )}

                    {/* ══════════════════════════════════
              PHASE 6: AMBIENT DASHBOARD
             ══════════════════════════════════ */}
                    {step === 5 && (
                        <motion.div key="step5" className="onboarding-step center-content" exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>
                            <div className="ambient-dashboard">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="ambient-ring" />
                                <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="ambient-ring inner" />

                                <div className="ambient-center">
                                    <h2 className="text-gradient-chalk ambient-status-heading">{ambientReady ? 'LAUNCHING' : 'BOOTING HIVES'}</h2>
                                    <div className={`ambient-sub-status ${ambientReady ? 'ambient-ready' : 'ambient-pending'}`}>{ambientReady ? 'READY' : (mission ? 'MISSION ENGAGED' : 'SYSTEM INITIALIZING')}</div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    )
}
