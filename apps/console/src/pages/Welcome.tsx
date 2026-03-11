/**
 * CREATIVE LIBERATION ENGINE — Welcome / Public Arcade
 * One cinematic scroll. Zero sidebar.
 *
 * Scroll journey:
 *   §0  HERO           — Full-screen, particle field, giant type, stats
 *   §1  THE WORK       — Real generated images, masonry grid
 *   §2  THE COLLECTIVE — 39 agents, hive-filter pills
 *   §3  CONSTITUTION   — Pull-quotes, link to full text
 *   §4  YOUR KEYS      — Provider pills, sovereignty statement
 *   §5  ENTER DEEPER   — Explore grid
 *
 * ATHENA BAR — always pinned to viewport bottom
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { FORGEJO_SOURCE_URL } from '../config/env'

/* ── TOKENS ─────────────────────────────────────────────── */
const T = {
    bg: '#060608',
    amber: '#F5A524',
    violet: '#9B72CF',
    blue: '#4285F4',
    green: '#22c55e',
    orange: '#FF6B35',
    chalk: '#F5F0E8',
    muted: 'rgba(245,240,232,0.45)',
    faint: 'rgba(245,240,232,0.12)',
    border: 'rgba(255,255,255,0.08)',
}

/* ── HIVE COLOURS ────────────────────────────────────────── */
const HIVE_COLOR: Record<string, string> = {
    AURORA: T.amber, KEEPER: T.blue, LEX: T.green,
    SWITCHBOARD: T.violet, BROADCAST: T.orange,
    AVERI: T.amber, SPECIALIST: '#20B2AA',
    VALIDATOR: '#ef4444', ENHANCEMENT: '#C17D4A',
}

/* ── AGENTS ─────────────────────────────────────────────── */
const AGENTS = [
    { name: 'BOLT', hive: 'AURORA', role: 'Full-stack code execution' },
    { name: 'COMET', hive: 'AURORA', role: 'Autonomous browser control' },
    { name: 'AURORA', hive: 'AURORA', role: 'Creative architecture & vibe lead' },
    { name: 'KEEPER', hive: 'KEEPER', role: 'Long-term knowledge graph' },
    { name: 'ARCH', hive: 'KEEPER', role: 'Architecture & pattern enforcement' },
    { name: 'CODEX', hive: 'KEEPER', role: 'Documentation & API contracts' },
    { name: 'SCRIBE', hive: 'KEEPER', role: 'Session transcription' },
    { name: 'ECHO', hive: 'KEEPER', role: 'Memory consolidation' },
    { name: 'LEX', hive: 'LEX', role: 'Legal compliance & contracts' },
    { name: 'COMPASS', hive: 'LEX', role: 'Constitutional navigation' },
    { name: 'SWITCHBOARD', hive: 'SWITCHBOARD', role: 'Task routing hub' },
    { name: 'RELAY', hive: 'SWITCHBOARD', role: 'Inter-agent message relay' },
    { name: 'COSMOS', hive: 'SWITCHBOARD', role: 'Multi-model orchestration' },
    { name: 'RAM_CREW', hive: 'SWITCHBOARD', role: 'Resource allocation' },
    { name: 'ATLAS', hive: 'BROADCAST', role: 'Content distribution' },
    { name: 'SIGNAL', hive: 'BROADCAST', role: 'External API integration' },
    { name: 'CONTROL_ROOM', hive: 'BROADCAST', role: 'Live broadcast control' },
    { name: 'SHOWRUNNER', hive: 'BROADCAST', role: 'Content scheduling' },
    { name: 'GRAPHICS', hive: 'BROADCAST', role: 'Visual asset generation' },
    { name: 'STUDIO', hive: 'BROADCAST', role: 'A/V production' },
    { name: 'SYSTEMS', hive: 'BROADCAST', role: 'Infrastructure operations' },
    { name: 'ATHENA', hive: 'AVERI', role: 'Strategic analysis & command' },
    { name: 'VERA', hive: 'AVERI', role: 'Verification & quality assurance' },
    { name: 'IRIS', hive: 'AVERI', role: 'Data visualization' },
    { name: 'THREE_WISE_MEN', hive: 'AVERI', role: 'Multi-perspective council' },
    { name: 'LEONARDO', hive: 'AVERI', role: 'Renaissance integration' },
    { name: 'SAGE', hive: 'AVERI', role: 'Pattern & systems recognition' },
    { name: 'TDD_ENFORCERS', hive: 'SPECIALIST', role: 'Test-driven development' },
    { name: 'CODE_ARCHAEOLOGIST', hive: 'SPECIALIST', role: 'Legacy code analysis' },
    { name: 'SKILLS_DISCOVERY', hive: 'SPECIALIST', role: 'Capability mapping' },
    { name: 'SKILLS_LIBRARY', hive: 'SPECIALIST', role: 'Reusable skill catalog' },
    { name: 'AURORA_DMN', hive: 'SPECIALIST', role: 'Default mode network' },
    { name: 'SENTINEL', hive: 'VALIDATOR', role: 'Security · OWASP Top 10' },
    { name: 'PATTERNS', hive: 'VALIDATOR', role: 'Architecture compliance' },
    { name: 'LOGIC', hive: 'VALIDATOR', role: 'Behavioral correctness' },
    { name: 'COVERAGE', hive: 'VALIDATOR', role: 'Test completeness & coverage' },
    { name: 'BROWSER', hive: 'ENHANCEMENT', role: 'Web orchestration layer' },
    { name: 'MATH', hive: 'ENHANCEMENT', role: 'Mathematical reasoning' },
    { name: 'LANGUAGE', hive: 'ENHANCEMENT', role: 'NLP & content polish' },
]

/* ── GALLERY ITEMS ────────────────────────────────────────── */
const GALLERY = [
    { img: '/gallery_portrait.png', label: 'Cinematic Portrait', caption: 'Text-to-image via GRAPHICS + AURORA', col: 2, row: 2 },
    { img: '/gallery_brand.png', label: 'Brand Identity System', caption: 'Design system generation via AURORA', col: 1, row: 1 },
    { img: '/gallery_architecture.png', label: 'Spatial Architecture', caption: '3D render pipeline via IRIS + STUDIO', col: 1, row: 2 },
    { img: '/gallery_music.png', label: 'Electronic Album Art', caption: 'Generative audio viz via STUDIO', col: 2, row: 1 },
    { img: '/gallery_campaign.png', label: 'Campaign Visual', caption: 'Brand campaign via ATLAS + GRAPHICS', col: 1, row: 1 },
    { img: '/gallery_code.png', label: 'System Architecture', caption: 'Code dependency graph via BOLT + ARCH', col: 1, row: 1 },
]

/* ── CONSTITUTION PULL-QUOTES ─────────────────────────────── */
const ARTICLES = [
    { num: 'Article 0', title: 'The Prime Directive', quote: 'Human supremacy in all matters. The system exists to serve human creativity, never to replace it.', link: '/constitution#article-0' },
    { num: 'Article V', title: 'Specialization', quote: 'Every agent has one domain. No agent pretends to be another. Depth over breadth.', link: '/constitution#article-5' },
    { num: 'Article XII', title: 'Sovereignty', quote: 'Your keys. Your data. Your agents. Nothing leaves your device without your explicit permission.', link: '/constitution#article-12' },
    { num: 'Article XVIII', title: 'The Generative Agency Principle', quote: 'We are digital soil that grows artists, not digital fences that capture them.', link: '/constitution#article-18' },
]

/* ── PROVIDERS ────────────────────────────────────────────── */
const PROVIDERS = [
    { id: 'GOOGLE_AI_STUDIO_API_KEY', name: 'Google AI Studio', sub: 'Imagen 3 · Veo 2 · Lyria', color: T.blue, url: 'https://aistudio.google.com/app/apikey' },
    { id: 'FAL_API_KEY', name: 'FAL.ai', sub: 'Flux Pro · Wan 2.1 · AnimateDiff', color: T.orange, url: 'https://fal.ai/dashboard/keys' },
    { id: 'ANTHROPIC_API_KEY', name: 'Anthropic', sub: 'Claude 3.5 Sonnet · Haiku', color: '#C17D4A', url: 'https://console.anthropic.com' },
    { id: 'OPENAI_API_KEY', name: 'OpenAI', sub: 'GPT-4o · Whisper · DALL-E', color: '#10A37F', url: 'https://platform.openai.com/api-keys' },
    { id: 'PERPLEXITY_API_KEY', name: 'Perplexity', sub: 'Sonar Pro · Deep Research', color: '#20B2AA', url: 'https://www.perplexity.ai/settings/api' },
    { id: 'REPLICATE_API_TOKEN', name: 'Replicate', sub: 'MusicGen · NeRF · SDXL', color: T.violet, url: 'https://replicate.com/account/api-tokens' },
    { id: 'OLLAMA_LOCAL', name: 'Ollama', sub: 'Llama 3.3 · Mistral · Phi-4', color: T.green, url: 'https://ollama.ai', free: true },
]

/* ── ATHENA ROUTING ───────────────────────────────────────── */
const ROUTES: [string[], string, string[]][] = [
    [['image', 'portrait', 'photo', 'picture', 'generate', 'draw'], '/nexus', ['GRAPHICS', 'AURORA', 'IRIS']],
    [['video', 'film', 'animate', 'motion'], '/nexus', ['STUDIO', 'SHOWRUNNER', 'ATLAS']],
    [['music', 'audio', 'sound', 'beat'], '/nexus', ['STUDIO', 'SIGNAL']],
    [['code', 'build', 'ship', 'deploy', 'function'], '/flows', ['BOLT', 'ARCH', 'CODEX']],
    [['research', 'find', 'search', 'analyse', 'analyze'], '/flows', ['VERA', 'ECHO', 'KEEPER']],
    [['browse', 'web', 'scrape', 'fetch'], '/scout', ['COMET', 'BROWSER']],
    [['legal', 'contract', 'compliance'], '/flows', ['LEX', 'COMPASS']],
    [['constitution', 'article', 'governance', 'govern'], '/constitution', ['COMPASS', 'VERA']],
    [['agents', 'collective', 'who'], '/agents', ['ATHENA', 'VERA', 'IRIS']],
    [['key', 'provider', 'api', 'setup'], '/keys', ['RELAY', 'SWITCHBOARD']],
]

function athenaRoute(input: string) {
    const low = input.toLowerCase()
    for (const [keywords, route, agts] of ROUTES) {
        if (keywords.some(k => low.includes(k))) return { route, agents: agts }
    }
    return { route: '/start', agents: ['ATHENA', 'VERA', 'IRIS'] }
}

/* ── PARTICLE CANVAS ──────────────────────────────────────── */
function ParticleField() {
    const ref = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
        const cnv = ref.current
        if (!cnv) return
        const el = cnv  // stable non-null alias for closures
        const ctx = el.getContext('2d')!
        let raf = 0
        const setSize = () => { el.width = window.innerWidth; el.height = window.innerHeight }
        setSize()
        const pts = Array.from({ length: 100 }, () => ({
            x: Math.random() * el.width, y: Math.random() * el.height,
            r: Math.random() * 1.2 + 0.2, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
            c: [T.amber, T.violet, T.blue, T.chalk][Math.floor(Math.random() * 4)],
            a: Math.random() * 0.25 + 0.05,
        }))
        function paint() {
            ctx.clearRect(0, 0, el.width, el.height)
            for (const p of pts) {
                p.x += p.vx; p.y += p.vy
                if (p.x < 0 || p.x > el.width) p.vx *= -1
                if (p.y < 0 || p.y > el.height) p.vy *= -1
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
                ctx.fillStyle = p.c + Math.round(p.a * 255).toString(16).padStart(2, '0')
                ctx.fill()
            }
            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
                    const d = Math.sqrt(dx * dx + dy * dy)
                    if (d < 110) {
                        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
                        ctx.strokeStyle = `rgba(245,165,36,${0.035 * (1 - d / 110)})`
                        ctx.lineWidth = 0.5; ctx.stroke()
                    }
                }
            }
            raf = requestAnimationFrame(paint)
        }
        paint()
        window.addEventListener('resize', setSize)
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', setSize) }
    }, [])
    return <canvas ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
}

/* ── SCROLL REVEAL ────────────────────────────────────────── */
function RevealDiv({ children, delay = 0, style = {} }: { children: ReactNode; delay?: number; style?: CSSProperties }) {
    const ref = useRef<HTMLDivElement>(null)
    const [vis, setVis] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold: 0.08 })
        obs.observe(el)
        return () => obs.disconnect()
    }, [])
    return (
        <div ref={ref} style={{
            opacity: vis ? 1 : 0,
            transform: vis ? 'translateY(0)' : 'translateY(36px)',
            transition: `opacity 0.85s ease ${delay}s, transform 0.85s ease ${delay}s`,
            ...style,
        }}>{children}</div>
    )
}

/* ── GALLERY CARD ─────────────────────────────────────────── */
function GalleryCard({ g, delay }: { g: typeof GALLERY[0]; delay: number }) {
    const [hov, setHov] = useState(false)
    return (
        <RevealDiv delay={delay} style={{ gridColumn: `span ${g.col}`, gridRow: `span ${g.row}` }}>
            <div
                onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
                style={{
                    height: '100%', minHeight: g.row === 2 ? 280 : 130,
                    borderRadius: 16, overflow: 'hidden', position: 'relative',
                    border: `1px solid ${hov ? 'rgba(245,165,36,0.3)' : T.border}`,
                    transform: hov ? 'scale(1.01)' : 'scale(1)',
                    transition: 'transform 0.3s ease, border-color 0.2s',
                    cursor: 'default',
                }}
            >
                <img
                    src={g.img} alt={g.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease', transform: hov ? 'scale(1.04)' : 'scale(1)' }}
                />
                {/* overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: hov
                        ? 'linear-gradient(180deg, transparent 30%, rgba(6,6,8,0.85))'
                        : 'linear-gradient(180deg, transparent 50%, rgba(6,6,8,0.7))',
                    transition: 'background 0.3s',
                }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 16px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.chalk, marginBottom: 3 }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.55)' }}>{g.caption}</div>
                </div>
            </div>
        </RevealDiv>
    )
}

/* ── AGENT CARD ───────────────────────────────────────────── */
function AgentCard({ a, delay }: { a: typeof AGENTS[0]; delay: number }) {
    const [hov, setHov] = useState(false)
    const c = HIVE_COLOR[a.hive] || T.chalk
    return (
        <RevealDiv delay={delay}>
            <div
                onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
                style={{
                    background: hov ? `${c}0e` : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${hov ? c + '50' : T.border}`,
                    borderLeft: `2.5px solid ${c}`,
                    borderRadius: 10, padding: '13px 15px',
                    transition: 'all 0.15s ease', cursor: 'default',
                }}
            >
                <div style={{ fontWeight: 800, fontSize: 12, color: hov ? T.chalk : 'rgba(245,240,232,0.8)', letterSpacing: 0.5, marginBottom: 2 }}>{a.name}</div>
                <div style={{ fontSize: 10, color: c, fontWeight: 700, letterSpacing: 0.8, marginBottom: 5 }}>{a.hive}</div>
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{a.role}</div>
            </div>
        </RevealDiv>
    )
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export default function Welcome() {
    const nav = useNavigate()
    const [cmd, setCmd] = useState('')
    const [hint, setHint] = useState<{ route: string; agents: string[] } | null>(null)
    const [focused, setFocused] = useState(false)
    const [hiveFilter, setHiveFilter] = useState<string | null>(null)
    const keyCount = PROVIDERS.filter(p => !!localStorage.getItem(`ie_key_${p.id}`)).length
    const hives = [...new Set(AGENTS.map(a => a.hive))]
    const filtered = hiveFilter ? AGENTS.filter(a => a.hive === hiveFilter) : AGENTS

    const onCmdChange = useCallback((v: string) => {
        setCmd(v); setHint(v.trim().length > 2 ? athenaRoute(v) : null)
    }, [])

    const submit = useCallback(() => {
        if (!cmd.trim()) return nav('/start')
        nav(athenaRoute(cmd).route)
    }, [cmd, nav])

    return (
        <div style={{ background: T.bg, color: T.chalk, fontFamily: '"Space Grotesk", "Inter", system-ui, sans-serif', minHeight: '100vh', overflowX: 'hidden' }}>

            {/* ── STICKY HEADER ── */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 44px',
                background: 'rgba(6,6,8,0.75)', backdropFilter: 'blur(24px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #F5A524 0%, #9B72CF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#060608', letterSpacing: -0.5 }}>IE</div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, color: T.chalk, lineHeight: 1 }}>CREATIVE LIBERATION ENGINE</div>
                        <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1.5, marginTop: 1 }}>GENESIS · V5.0.0</div>
                    </div>
                </div>
                <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                    {[
                        { l: 'Agents', t: '#collective' },
                        { l: 'Constitution', t: '/constitution' },
                        { l: 'Flow Explorer', t: '/flows' },
                        { l: 'NEXUS', t: '/nexus' },
                    ].map(n => (
                        <button key={n.l} onClick={() => n.t.startsWith('#')
                            ? document.querySelector(n.t)?.scrollIntoView({ behavior: 'smooth' })
                            : nav(n.t)
                        } style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 13, fontFamily: 'inherit', fontWeight: 500, padding: 0, letterSpacing: 0.3, transition: 'color 0.15s' }}
                            onMouseEnter={e => (e.target as HTMLElement).style.color = T.chalk}
                            onMouseLeave={e => (e.target as HTMLElement).style.color = T.muted}
                        >{n.l}</button>
                    ))}
                    <button onClick={() => nav('/keys')} style={{
                        borderRadius: 20, padding: '7px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer', border: 'none', letterSpacing: 0.5,
                        background: keyCount > 0 ? 'rgba(34,197,94,0.12)' : `linear-gradient(135deg, ${T.amber}, #d4870a)`,
                        color: keyCount > 0 ? T.green : '#060608',
                        boxShadow: keyCount > 0 ? 'none' : '0 0 20px rgba(245,165,36,0.25)',
                        outline: keyCount > 0 ? '1px solid rgba(34,197,94,0.3)' : 'none',
                    }}>{keyCount > 0 ? `● ${keyCount} Keys Live` : 'Add Keys'}</button>
                </nav>
            </header>

            {/* ══════════════════════════════════
                §0 HERO
             ══════════════════════════════════ */}
            <section style={{ height: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden' }}>
                <ParticleField />
                {/* depth glows */}
                <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
                    <div style={{ position: 'absolute', top: '10%', left: '5%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,165,36,0.055) 0%, transparent 65%)', filter: 'blur(80px)' }} />
                    <div style={{ position: 'absolute', bottom: '8%', right: '3%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,114,207,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
                </div>
                <div style={{ position: 'relative', zIndex: 1, padding: '0 20px' }}>
                    {/* badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,165,36,0.08)', border: '1px solid rgba(245,165,36,0.22)', borderRadius: 20, padding: '6px 18px', marginBottom: 40 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.amber, boxShadow: '0 0 10px rgba(245,165,36,0.9)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                        <span style={{ fontSize: 10, color: T.amber, letterSpacing: 3.5, fontWeight: 800 }}>GENESIS · V5.0.0 · LIVE</span>
                    </div>
                    {/* main type */}
                    <h1 style={{ fontSize: 'clamp(64px, 13vw, 148px)', fontWeight: 900, lineHeight: 0.88, letterSpacing: '-4px', margin: '0 0 36px' }}>
                        <span style={{ display: 'block', background: `linear-gradient(170deg, ${T.chalk} 0%, rgba(245,240,232,0.55) 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>INCEPTION</span>
                        <span style={{ display: 'block', background: `linear-gradient(170deg, ${T.amber} 0%, rgba(245,165,36,0.45) 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ENGINE</span>
                    </h1>
                    <p style={{ fontSize: 18, color: T.muted, maxWidth: 500, margin: '0 auto 44px', lineHeight: 1.7, fontWeight: 400 }}>
                        An agentic AI operating system.<br />
                        39 agents. Constitutional governance.<br />
                        <strong style={{ color: T.chalk, fontWeight: 600 }}>Your keys. Your sovereignty.</strong>
                    </p>
                    {/* stats */}
                    <div style={{ display: 'flex', gap: 40, justifyContent: 'center' }}>
                        {[['39', 'Agents'], ['9', 'Hives'], ['18', 'Articles'], ['7', 'Providers']].map(([v, l]) => (
                            <div key={l} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 30, fontWeight: 900, color: T.amber, lineHeight: 1 }}>{v}</div>
                                <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginTop: 5 }}>{l.toUpperCase()}</div>
                            </div>
                        ))}
                    </div>
                    {/* scroll cue */}
                    <div style={{ marginTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: 'bob 2.8s ease-in-out infinite' }}>
                        <div style={{ width: 1, height: 44, background: `linear-gradient(180deg, transparent, ${T.amber}70, transparent)` }} />
                        <span style={{ fontSize: 9, letterSpacing: 4, color: 'rgba(245,240,232,0.3)' }}>SCROLL</span>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════
                §1 THE WORK
             ══════════════════════════════════ */}
            <section id="work" style={{ padding: '120px 44px 100px' }}>
                <div style={{ maxWidth: 1160, margin: '0 auto' }}>
                    <RevealDiv style={{ marginBottom: 56 }}>
                        <div style={{ fontSize: 10, letterSpacing: 4, color: T.amber, fontWeight: 800, marginBottom: 12 }}>WHAT IT MAKES</div>
                        <h2 style={{ fontSize: 'clamp(36px, 5.5vw, 60px)', fontWeight: 900, margin: 0, letterSpacing: '-1.5px', lineHeight: 1.0 }}>
                            From idea to output.<br />
                            <span style={{ color: T.muted, fontWeight: 400 }}>Uninterrupted.</span>
                        </h2>
                    </RevealDiv>
                    {/* masonry grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: '140px', gap: 14 }}>
                        {GALLERY.map((g, i) => <GalleryCard key={i} g={g} delay={i * 0.07} />)}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════
                §2 THE COLLECTIVE
             ══════════════════════════════════ */}
            <section id="collective" style={{ padding: '100px 44px', position: 'relative' }}>
                <div style={{ pointerEvents: 'none', position: 'absolute', top: '20%', right: '-8%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,114,207,0.05) 0%, transparent 70%)', filter: 'blur(100px)' }} />
                <div style={{ maxWidth: 1160, margin: '0 auto' }}>
                    <RevealDiv style={{ marginBottom: 44 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
                            <div>
                                <div style={{ fontSize: 10, letterSpacing: 4, color: T.violet, fontWeight: 800, marginBottom: 12 }}>THE COLLECTIVE</div>
                                <h2 style={{ fontSize: 'clamp(36px, 5.5vw, 60px)', fontWeight: 900, margin: 0, letterSpacing: '-1.5px', lineHeight: 1.0 }}>
                                    39 Agents.<br /><span style={{ color: T.muted, fontWeight: 400 }}>One OS.</span>
                                </h2>
                            </div>
                            {/* hive filter pills */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 580, justifyContent: 'flex-end' }}>
                                <FilterPill active={!hiveFilter} color={T.amber} onClick={() => setHiveFilter(null)}>ALL</FilterPill>
                                {hives.map(h => (
                                    <FilterPill key={h} active={hiveFilter === h} color={HIVE_COLOR[h]} onClick={() => setHiveFilter(hiveFilter === h ? null : h)}>{h}</FilterPill>
                                ))}
                            </div>
                        </div>
                    </RevealDiv>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: 9 }}>
                        {filtered.map((a, i) => <AgentCard key={a.name} a={a} delay={i * 0.02} />)}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════
                §3 THE CONSTITUTION
             ══════════════════════════════════ */}
            <section id="constitution" style={{ padding: '100px 44px', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: 'rgba(245,165,36,0.018)' }}>
                <div style={{ maxWidth: 1160, margin: '0 auto' }}>
                    <RevealDiv style={{ marginBottom: 52 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
                            <div>
                                <div style={{ fontSize: 10, letterSpacing: 4, color: T.amber, fontWeight: 800, marginBottom: 12 }}>THE AGENT CONSTITUTION</div>
                                <h2 style={{ fontSize: 'clamp(36px, 5.5vw, 60px)', fontWeight: 900, margin: 0, letterSpacing: '-1.5px', lineHeight: 1.0 }}>
                                    It governs itself.<br /><span style={{ color: T.muted, fontWeight: 400 }}>18 articles. All binding.</span>
                                </h2>
                            </div>
                            <button onClick={() => nav('/constitution')} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 20, padding: '10px 26px', color: T.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 600, letterSpacing: 0.3, transition: 'all 0.2s', flexShrink: 0 }}
                                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(245,165,36,0.4)'; el.style.color = T.chalk }}
                                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = T.border; el.style.color = T.muted }}
                            >Read all 18 articles →</button>
                        </div>
                    </RevealDiv>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 15 }}>
                        {ARTICLES.map((art, i) => (
                            <RevealDiv key={art.num} delay={i * 0.1}>
                                <div onClick={() => nav('/constitution')} style={{
                                    background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.border}`,
                                    borderLeft: `3px solid ${T.amber}`, borderRadius: 14,
                                    padding: '24px 22px', cursor: 'pointer', transition: 'transform 0.2s, background 0.2s',
                                    height: '100%',
                                }}
                                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.background = 'rgba(245,165,36,0.04)' }}
                                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.background = 'rgba(255,255,255,0.025)' }}
                                >
                                    <div style={{ fontSize: 10, letterSpacing: 2, color: T.amber, fontWeight: 700, marginBottom: 6 }}>{art.num}</div>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: T.chalk, marginBottom: 12 }}>{art.title}</div>
                                    <blockquote style={{ margin: 0, padding: 0, fontSize: 13, color: T.muted, lineHeight: 1.75, fontStyle: 'italic' }}>"{art.quote}"</blockquote>
                                    <div style={{ fontSize: 11, color: T.amber, marginTop: 16, fontWeight: 600 }}>Read full article →</div>
                                </div>
                            </RevealDiv>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════
                §4 YOUR KEYS
             ══════════════════════════════════ */}
            <section id="keys" style={{ padding: '100px 44px', position: 'relative' }}>
                <div style={{ pointerEvents: 'none', position: 'absolute', top: '30%', left: '-6%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.04) 0%, transparent 70%)', filter: 'blur(90px)' }} />
                <div style={{ maxWidth: 1160, margin: '0 auto' }}>
                    <RevealDiv style={{ marginBottom: 52 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
                            <div>
                                <div style={{ fontSize: 10, letterSpacing: 4, color: T.green, fontWeight: 800, marginBottom: 12 }}>YOUR KEYS · YOUR SOVEREIGNTY</div>
                                <h2 style={{ fontSize: 'clamp(36px, 5.5vw, 60px)', fontWeight: 900, margin: 0, letterSpacing: '-1.5px', lineHeight: 1.0 }}>
                                    Add a key.<br /><span style={{ color: T.muted, fontWeight: 400 }}>Unlock a world.</span>
                                </h2>
                            </div>
                            <p style={{ fontSize: 14, color: T.muted, maxWidth: 380, lineHeight: 1.75, margin: 0 }}>
                                Keys are stored in <strong style={{ color: T.chalk }}>your browser only.</strong> Nothing is transmitted to our servers. Nothing is logged. Add one provider or all seven — delete any time.
                            </p>
                        </div>
                    </RevealDiv>
                    <RevealDiv delay={0.15} style={{ marginBottom: 36 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {PROVIDERS.map(p => {
                                const live = !!localStorage.getItem(`ie_key_${p.id}`)
                                return (
                                    <button key={p.id} onClick={() => nav('/keys')} style={{
                                        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit',
                                        background: live ? `${p.color}12` : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${live ? p.color + '40' : T.border}`,
                                        borderRadius: 30, padding: '10px 18px',
                                        transition: 'all 0.15s',
                                    }}
                                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = `${p.color}60`}
                                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = live ? `${p.color}40` : T.border}
                                    >
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: live ? T.green : 'rgba(255,255,255,0.15)', boxShadow: live ? `0 0 7px ${T.green}` : 'none', flexShrink: 0, display: 'inline-block' }} />
                                        <span>
                                            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: live ? T.chalk : T.muted }}>{p.name}</span>
                                            <span style={{ display: 'block', fontSize: 10, color: 'rgba(245,240,232,0.3)', marginTop: 1 }}>{p.sub}</span>
                                        </span>
                                        {p.free && <span style={{ fontSize: 9, background: `${T.green}20`, color: T.green, borderRadius: 4, padding: '2px 7px', fontWeight: 800, letterSpacing: 0.5 }}>FREE</span>}
                                    </button>
                                )
                            })}
                        </div>
                    </RevealDiv>
                    <RevealDiv delay={0.25}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button onClick={() => nav('/keys')} style={{ background: T.amber, border: 'none', borderRadius: 12, padding: '14px 32px', color: '#060608', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5, boxShadow: '0 0 30px rgba(245,165,36,0.25)', transition: 'box-shadow 0.2s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 50px rgba(245,165,36,0.4)'}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(245,165,36,0.25)'}
                            >MANAGE KEYS →</button>
                            <button onClick={() => nav('/nexus')} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 32px', color: T.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                                onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = T.chalk; el.style.borderColor = 'rgba(255,255,255,0.2)' }}
                                onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = T.muted; el.style.borderColor = T.border }}
                            >Try NEXUS without keys →</button>
                        </div>
                    </RevealDiv>
                </div>
            </section>

            {/* ══════════════════════════════════
                §5 ENTER DEEPER
             ══════════════════════════════════ */}
            <section style={{ padding: '100px 44px 200px', borderTop: `1px solid ${T.border}`, background: `linear-gradient(180deg, ${T.bg} 0%, rgba(245,165,36,0.03) 100%)` }}>
                <div style={{ maxWidth: 1160, margin: '0 auto', textAlign: 'center' }}>
                    <RevealDiv style={{ marginBottom: 48 }}>
                        <div style={{ fontSize: 10, letterSpacing: 4, color: T.muted, fontWeight: 700, marginBottom: 14 }}>EXPLORE THE SYSTEM</div>
                        <h2 style={{ fontSize: 'clamp(28px, 4vw, 50px)', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>Where do you want to go?</h2>
                    </RevealDiv>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, maxWidth: 920, margin: '0 auto' }}>
                        {[
                            { label: 'Walkthrough', desc: '7-station guided tour', icon: '◎', route: '/start', color: T.amber },
                            { label: 'NEXUS Light', desc: 'Image · Video · Audio · Text', icon: '◈', route: '/nexus', color: T.violet },
                            { label: 'Flow Explorer', desc: 'Genkit flows, live execution', icon: '⬡', route: '/flows', color: T.blue },
                            { label: 'SCOUT Browser', desc: 'Autonomous web navigation', icon: '◉', route: '/scout', color: T.orange },
                            { label: 'Constitution', desc: '18 articles, full text', icon: '⚖', route: '/constitution', color: T.amber },
                            { label: 'API Keys', desc: '7 providers, browser-only storage', icon: '○', route: '/keys', color: T.green },
                        ].map((d, i) => (
                            <RevealDiv key={d.route} delay={i * 0.07}>
                                <button onClick={() => nav(d.route)} style={{
                                    background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.border}`,
                                    borderRadius: 14, padding: '22px 18px', cursor: 'pointer', width: '100%',
                                    textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.2s',
                                }}
                                    onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = `${d.color}44`; el.style.background = `${d.color}07` }}
                                    onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = T.border; el.style.background = 'rgba(255,255,255,0.025)' }}
                                >
                                    <div style={{ fontSize: 22, marginBottom: 12, color: d.color }}>{d.icon}</div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: T.chalk, marginBottom: 5 }}>{d.label}</div>
                                    <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.55 }}>{d.desc}</div>
                                </button>
                            </RevealDiv>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ borderTop: `1px solid ${T.border}`, padding: '22px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: 'rgba(6,6,8,0.95)' }}>
                <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.18)', letterSpacing: 0.8 }}>FSL-1.1-ALv2 · Constitutional AI · GENESIS V5.0.0</div>
                <div style={{ display: 'flex', gap: 22 }}>
                    {[
                        { l: 'Source (Forgejo)', h: `${FORGEJO_SOURCE_URL}/Creative Liberation Engine Community/brainchild-v5`, ext: true },
                        { l: 'CONSTITUTION.md', h: '/constitution', ext: false },
                        { l: 'Agent Catalog', h: '/agents', ext: false },
                    ].map(lnk => (
                        <a key={lnk.l} href={lnk.h} onClick={lnk.ext ? undefined : e => { e.preventDefault(); nav(lnk.h) }} target={lnk.ext ? '_blank' : undefined} rel={lnk.ext ? 'noreferrer' : undefined}
                            style={{ fontSize: 11, color: 'rgba(245,240,232,0.22)', textDecoration: 'none', letterSpacing: 0.5, transition: 'color 0.15s' }}
                            onMouseEnter={e => (e.target as HTMLAnchorElement).style.color = T.muted}
                            onMouseLeave={e => (e.target as HTMLAnchorElement).style.color = 'rgba(245,240,232,0.22)'}
                        >{lnk.l}</a>
                    ))}
                </div>
            </footer>

            {/* ══════════════════════════════════
                ATHENA BAR — fixed to viewport
             ══════════════════════════════════ */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, pointerEvents: 'none' }}>
                {/* fade scrim */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(0deg, rgba(6,6,8,0.97) 0%, rgba(6,6,8,0.6) 60%, transparent 100%)', pointerEvents: 'none' }} />
                {/* popup hint */}
                {hint && (
                    <div style={{
                        position: 'absolute', bottom: 84, left: '50%', transform: 'translateX(-50%)',
                        width: 'min(680px, calc(100vw - 80px))', pointerEvents: 'none',
                        background: 'rgba(18,15,24,0.97)', border: '1px solid rgba(245,165,36,0.22)',
                        borderRadius: 12, padding: '12px 18px', backdropFilter: 'blur(24px)',
                    }}>
                        <div style={{ fontSize: 9, letterSpacing: 3, color: T.amber, fontWeight: 800, marginBottom: 7 }}>ATHENA ROUTING</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {hint.agents.map(a => <span key={a} style={{ fontSize: 10, background: 'rgba(245,165,36,0.12)', color: T.amber, borderRadius: 4, padding: '2px 8px', fontWeight: 800, letterSpacing: 0.5 }}>{a}</span>)}
                            <span style={{ fontSize: 11, color: T.muted, marginLeft: 4 }}>→ {hint.route}</span>
                            <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.2)', marginLeft: 'auto' }}>⏎ to run</span>
                        </div>
                    </div>
                )}
                {/* the bar itself */}
                <div style={{ position: 'relative', padding: '0 40px 20px', pointerEvents: 'auto' }}>
                    <div style={{
                        maxWidth: 680, margin: '0 auto',
                        background: 'rgba(22,19,28,0.95)', backdropFilter: 'blur(28px)',
                        border: focused ? '1px solid rgba(245,165,36,0.45)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 20,
                        boxShadow: focused ? '0 0 0 5px rgba(245,165,36,0.07), 0 24px 64px rgba(0,0,0,0.7)' : '0 20px 64px rgba(0,0,0,0.55)',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 8px 8px 18px', gap: 10 }}>
                            <span style={{ fontSize: 10, color: 'rgba(245,165,36,0.6)', fontWeight: 800, letterSpacing: 1.5, flexShrink: 0 }}>ATHENA</span>
                            <input
                                value={cmd} onChange={e => onCmdChange(e.target.value)}
                                onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 200)}
                                onKeyDown={e => e.key === 'Enter' && submit()}
                                placeholder="Make an image of... · Research... · Write code for... · Browse..."
                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: T.chalk, fontSize: 15, fontFamily: 'inherit', padding: '10px 0' }}
                            />
                            <button onClick={submit} style={{
                                width: 40, height: 40, borderRadius: 12, flexShrink: 0, border: 'none',
                                background: cmd.trim() ? `linear-gradient(135deg, ${T.amber}, #d4870a)` : 'rgba(255,255,255,0.06)',
                                color: cmd.trim() ? '#060608' : 'rgba(245,240,232,0.2)', fontSize: 18, fontWeight: 900, cursor: cmd.trim() ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                boxShadow: cmd.trim() ? '0 0 16px rgba(245,165,36,0.3)' : 'none',
                            }}>→</button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse { 0%, 100% { opacity:1; box-shadow:0 0 10px rgba(245,165,36,0.9); } 50% { opacity:0.5; box-shadow:0 0 20px rgba(245,165,36,0.3); } }
                @keyframes bob { 0%, 100% { transform:translateY(0); opacity:.5; } 50% { transform:translateY(-8px); opacity:1; } }
                * { box-sizing:border-box; }
                html { scroll-behavior:smooth; }
            `}</style>
        </div>
    )
}

/* ── FILTER PILL ──────────────────────────────────────────── */
function FilterPill({ children, active, color, onClick }: { children: ReactNode; active: boolean; color: string; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
            border: active ? `1px solid ${color}44` : `1px solid ${T.border}`,
            borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
            color: active ? color : T.muted,
            fontSize: 11, fontWeight: 800, letterSpacing: 1,
            fontFamily: '"Space Grotesk", inherit', transition: 'all 0.15s',
        }}>{children}</button>
    )
}
