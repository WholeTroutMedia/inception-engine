import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion'
import { ChevronRight, ChevronLeft, ArrowRight, Activity, Zap, Shield, Cpu, Box as BoxIcon, Workflow } from 'lucide-react'

// ─── ANIMATION VARIANTS ──────────────────────────────────────────────────
const slideVariants: any = {
  enter: (direction: number) => ({ x: direction > 0 ? 100 : -100, opacity: 0, scale: 0.95, filter: 'blur(10px)' }),
  center: { x: 0, opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.1 } },
  exit: (direction: number) => ({ x: direction < 0 ? 100 : -100, opacity: 0, scale: 0.95, filter: 'blur(10px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } })
}

const itemVariants: any = {
  enter: { y: 20, opacity: 0, filter: 'blur(5px)' },
  center: { y: 0, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.5, ease: 'easeOut' } }
}

// ─── DYNAMIC BACKGROUND ──────────────────────────────────────────────────
function SpotlightBackground({ children }: { children: React.ReactNode }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({ clientX, clientY }: React.MouseEvent) {
    mouseX.set(clientX)
    mouseY.set(clientY)
  }

  return (
    <div onMouseMove={handleMouseMove} style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#050508', color: '#F5F0E8' }}>
      {/* Background grain */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none', zIndex: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      {/* Ambient static glows */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(155,114,207,0.1), transparent 70%)', filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(245,165,36,0.08), transparent 70%)', filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none' }} />
      {/* Dynamic Mouse Spotlight */}
      <motion.div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: useMotionTemplate`radial-gradient(600px circle at ${mouseX}px ${mouseY}px, rgba(245,165,36,0.06), transparent 80%)` }} />
      {/* Interactive Content Layer */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

// ─── INTERACTIVE CARD COMPOENT ───────────────────────────────────────────
function TiltCard({ children, bg = 'rgba(255,255,255,0.02)', borderColor = 'rgba(255,255,255,0.05)' }: { children: React.ReactNode, bg?: string, borderColor?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, backgroundColor: bg.replace('0.02', '0.04').replace('0.05', '0.08') }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, cursor: 'default', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
    >
      {children}
    </motion.div>
  )
}

// ─── SLIDE DATA ──────────────────────────────────────────────────────────
interface SlideContent {
  id: string
  eyebrow: string
  title: React.ReactNode
  subtitle: string
  body: React.ReactNode
  callout?: { value: string; label: string }[]
}

const SLIDES: SlideContent[] = [
  {
    id: 'intro',
    eyebrow: 'Creative Liberation Engine · Genesis V5.0',
    title: <><span style={{ color: '#fff' }}>The Sovereign</span><br /><span style={{ background: 'linear-gradient(135deg, #F5A524, #9B72CF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Operations</span> Exoskeleton</>,
    subtitle: 'Stop managing chaos. Start running a studio that runs itself.',
    body: (
      <motion.div variants={itemVariants} style={{ color: 'rgba(245,240,232,0.55)', maxWidth: 680, margin: '0 auto', fontSize: 22, lineHeight: 1.6 }}>
        The first agentic OS built specifically for creative operators, transforming solo freelancers into enterprise-grade studios overnight.
      </motion.div>
    ),
    callout: [
      { value: '40+', label: 'Specialized Agents' },
      { value: '100%', label: 'Constitutional Control' }
    ]
  },
  {
    id: 'problem',
    eyebrow: 'The Enterprise Bloat',
    title: 'The Burden of Scale',
    subtitle: 'Human orgs break under the weight of coordination.',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left', maxWidth: 800, margin: '0 auto' }}>
        <TiltCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ padding: 14, borderRadius: 14, background: 'rgba(239,68,68,0.1)' }}>
              <Activity color="#ef4444" size={28} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: 20, color: '#fff', fontWeight: 800 }}>Traditional Enterprise Structure</h4>
              <div style={{ color: 'rgba(245,240,232,0.5)', fontSize: 16, lineHeight: 1.6 }}>
                Requires 10+ middle-management roles (Product, QA, DevOps) simply to ship. 80% overhead, 20% raw creation.
              </div>
            </div>
          </div>
        </TiltCard>
        <TiltCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ padding: 14, borderRadius: 14, background: 'rgba(239,68,68,0.1)' }}>
              <BoxIcon color="#ef4444" size={28} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: 20, color: '#fff', fontWeight: 800 }}>The Freelancer Dilemma</h4>
              <div style={{ color: 'rgba(245,240,232,0.5)', fontSize: 16, lineHeight: 1.6 }}>
                Solo operators spend 40% of their "execution" time on project admin, proposals, legal, and follow-ups. Unscalable.
              </div>
            </div>
          </div>
        </TiltCard>
      </div>
    )
  },
  {
    id: 'solution',
    eyebrow: 'The Zero-Day Engine',
    title: 'AI as an Operations Layer',
    subtitle: 'We replace middle-management with a deterministic, autonomous AI mesh.',
    body: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, textAlign: 'left', maxWidth: 1000, margin: '0 auto' }}>
        <TiltCard bg="rgba(155,114,207,0.05)" borderColor="rgba(155,114,207,0.2)">
          <Shield color="#9B72CF" size={36} style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 10px', fontSize: 24, color: '#9B72CF', fontWeight: 800 }}>Zero Admin</h3>
          <div style={{ color: 'rgba(245,240,232,0.5)', fontSize: 16, lineHeight: 1.6 }}>
            Intake, proposals, legally-sound contracts, and provisioning happen autonomously via LEX and the Zero-Day server.
          </div>
        </TiltCard>
        <TiltCard bg="rgba(34,197,94,0.05)" borderColor="rgba(34,197,94,0.2)">
          <Cpu color="#22c55e" size={36} style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 10px', fontSize: 24, color: '#22c55e', fontWeight: 800 }}>Infinite Scale</h3>
          <div style={{ color: 'rgba(245,240,232,0.5)', fontSize: 16, lineHeight: 1.6 }}>
            Scale deliverables without scaling headcount. The Creative Liberation Engine handles QA, delivery tracking, and client portals.
          </div>
        </TiltCard>
      </div>
    )
  },
  {
    id: 'metrics',
    eyebrow: 'By the Numbers',
    title: 'Human vs. Machine Time',
    subtitle: 'The dramatic acceleration of creative delivery.',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          <TiltCard borderColor="rgba(245,165,36,0.3)">
            <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>Task / Routine</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 16 }}>Client Intake</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: '#ef4444', fontSize: 16, textDecoration: 'line-through', opacity: 0.7 }}>~2 days (Human)</div>
              <div style={{ color: '#22c55e', fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <ArrowRight size={18} color="rgba(255,255,255,0.3)" /> &lt; 5 mins
              </div>
            </div>
          </TiltCard>
          <TiltCard borderColor="rgba(245,165,36,0.3)">
             <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>Task / Routine</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 16 }}>Legal & Proposing</div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: '#ef4444', fontSize: 16, textDecoration: 'line-through', opacity: 0.7 }}>4-6 hours (Human)</div>
              <div style={{ color: '#22c55e', fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <ArrowRight size={18} color="rgba(255,255,255,0.3)" /> Instant (LEX)
              </div>
            </div>
          </TiltCard>
          <TiltCard borderColor="rgba(245,165,36,0.3)">
             <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>Task / Routine</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 16 }}>QA & Delivery</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: '#ef4444', fontSize: 16, textDecoration: 'line-through', opacity: 0.7 }}>Continuous drain</div>
              <div style={{ color: '#22c55e', fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <ArrowRight size={18} color="rgba(255,255,255,0.3)" /> Built-in (VERA)
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    )
  },
  {
    id: 'vision',
    eyebrow: 'TAM & Vision',
    title: 'Digital Soil for Creators',
    subtitle: 'We are building the rails for the trillion-dollar creator economy.',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        <motion.div variants={itemVariants} style={{ color: 'rgba(245,240,232,0.5)', maxWidth: 740, margin: '0 auto', fontSize: 22, lineHeight: 1.6 }}>
          Sovereign operators represent the fastest-growing sector of the economy. They don't want to hire 10 people. <strong style={{color: '#fff'}}>They want tools that act like 10 people.</strong>
        </motion.div>
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.05, boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,165,36,0.5)' }}
          whileTap={{ scale: 0.98 }}
          style={{ background: 'linear-gradient(135deg, rgba(245,165,36,0.15), rgba(155,114,207,0.15))', padding: '48px 64px', borderRadius: 32, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', marginTop: 16, position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.1), transparent)', pointerEvents: 'none' }} />
          <Workflow color="#F5A524" size={56} style={{ margin: '0 auto 24px', filter: 'drop-shadow(0 0 20px rgba(245,165,36,0.5))' }} />
          <h2 style={{ fontSize: 36, fontWeight: 900, margin: 0, color: '#fff', letterSpacing: '-1px' }}>Join the Collective.</h2>
          <div style={{ color: 'rgba(245,240,232,0.6)', marginTop: 12, fontSize: 16, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>Creative Liberation Engine Genesis V5.0</div>
        </motion.div>
      </div>
    )
  }
]

// ─── COMPONENT ───────────────────────────────────────────────────────────
export default function VCPitchDeck() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setDirection(1)
        setCurrent(c => Math.min(c + 1, SLIDES.length - 1))
      } else if (e.key === 'ArrowLeft') {
        setDirection(-1)
        setCurrent(c => Math.max(c - 1, 0))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const slide = SLIDES[current]

  const navNext = () => { setDirection(1); setCurrent(c => Math.min(c + 1, SLIDES.length - 1)) }
  const navPrev = () => { setDirection(-1); setCurrent(c => Math.max(c - 1, 0)) }

  return (
    <SpotlightBackground>
      {/* HEADER / NAV */}
      <header style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 64px' }}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #F5A524, #9B72CF)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>IE</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: '#fff' }}>Creative Liberation Engine</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 4 }}>INVESTOR PITCH DECK</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.button 
            whileHover={{ scale: current === 0 ? 1 : 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: current === 0 ? 1 : 0.95 }}
            onClick={navPrev} 
            disabled={current === 0} 
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 12, padding: 10, cursor: current === 0 ? 'not-allowed' : 'pointer', opacity: current === 0 ? 0.2 : 1 }}
          >
            <ChevronLeft size={20} />
          </motion.button>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)', width: 70, textAlign: 'center', letterSpacing: 2 }}>
            <span style={{ color: '#fff' }}>0{current + 1}</span> <span style={{ color: 'rgba(255,255,255,0.3)'}}>/</span> <span style={{ color: 'rgba(255,255,255,0.4)'}}>0{SLIDES.length}</span>
          </div>
          <motion.button 
            whileHover={{ scale: current === SLIDES.length - 1 ? 1 : 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: current === SLIDES.length - 1 ? 1 : 0.95 }}
            onClick={navNext} 
            disabled={current === SLIDES.length - 1} 
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 12, padding: 10, cursor: current === SLIDES.length - 1 ? 'not-allowed' : 'pointer', opacity: current === SLIDES.length - 1 ? 0.2 : 1 }}
          >
            <ChevronRight size={20} />
          </motion.button>
        </motion.div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 64px 80px' }}>
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ width: '100%', maxWidth: 1200, textAlign: 'center' }}
          >
            <motion.div variants={itemVariants} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(245,165,36,0.15)', border: '1px solid rgba(245,165,36,0.3)', padding: '8px 20px', borderRadius: 100, marginBottom: 40, boxShadow: '0 0 20px rgba(245,165,36,0.1)' }}>
              <Zap size={16} color="#F5A524" style={{ filter: 'drop-shadow(0 0 4px #F5A524)' }} />
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 3, color: '#F5A524', textTransform: 'uppercase' }}>{slide.eyebrow}</span>
            </motion.div>

            <motion.h1 variants={itemVariants} style={{ fontSize: 'clamp(56px, 7vw, 96px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2.5px', marginBottom: 32 }}>
              {slide.title}
            </motion.h1>

            <motion.p variants={itemVariants} style={{ fontSize: 26, color: 'rgba(245,240,232,0.8)', maxWidth: 840, margin: '0 auto 72px', lineHeight: 1.5, fontWeight: 400 }}>
              {slide.subtitle}
            </motion.p>

            <motion.div variants={itemVariants}>
              {slide.body}
            </motion.div>

            {slide.callout && (
              <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', gap: 80, marginTop: 100, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 48 }}>
                {slide.callout.map(c => (
                  <div key={c.label}>
                    <div style={{ fontSize: 56, fontWeight: 900, background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.3))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 12, letterSpacing: '-1px' }}>{c.value}</div>
                    <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 3, color: 'rgba(245,240,232,0.5)', fontWeight: 700 }}>{c.label}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* PROGRESS BAR */}
      <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: '200px', height: 4, background: 'rgba(255,255,255,0.1)', zIndex: 20, borderRadius: 4, overflow: 'hidden' }}>
        <motion.div 
          initial={false}
          animate={{ width: `${((current + 1) / SLIDES.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #F5A524, #9B72CF)', borderRadius: 4 }}
        />
      </div>
    </SpotlightBackground>
  )
}
