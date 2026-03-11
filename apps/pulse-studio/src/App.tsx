import {
  Camera, Check, ChevronRight, Crosshair,
  Film, Layers, Mic, Radio, Share2, Volume2,
  Wifi, Zap, Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  fetchLivePlayerStats, generateCreativeSnapshot,
  generateThumbnail, generateAudioDub
} from './api'
import './index.css'

interface PlayerStats { pts: number; fg_pct: number; hr: number }
interface Reel { duration: '6s' | '15s' | '30s'; caption: string; platform: string }

function useTime() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return t
}

function elapsed(start: Date) {
  const s = Math.floor((Date.now() - start.getTime()) / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const PIPELINE = [
  { key: 'insight',   name: 'Narrative Brief',   desc: 'Gemini synthesises live stats into story context' },
  { key: 'thumbnail', name: 'Visual Frame',       desc: 'Flux generates the 9:16 social thumbnail' },
  { key: 'voice',     name: 'Voice Layer',        desc: 'ElevenLabs renders broadcast-anchor audio' },
  { key: 'reel',      name: 'Content Cuts',       desc: 'Auto-reel generates 6s / 15s / 30s versions' },
] as const

const PLATFORMS = [
  { id: 'TikTok',    label: 'TikTok' },
  { id: 'Instagram', label: 'Instagram Reels' },
  { id: 'YouTube',   label: 'YouTube Shorts' },
]

type Stage = 'idle' | 'insight' | 'thumbnail' | 'voice' | 'reel' | 'ready'

export default function App() {
  const time = useTime()
  const TARGET = 'Stephen Curry'
  const TARGET_SHORT = 'S. Curry â€” #30'

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [recordStart, setRecordStart] = useState<Date | null>(null)
  const [recordTick, setRecordTick] = useState('00:00')

  const [isFetching, setIsFetching] = useState(false)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [insight, setInsight] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [reels, setReels] = useState<Reel[]>([])
  const [published, setPublished] = useState<string[]>([])

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraActive])

  useEffect(() => {
    if (!recordStart) return
    const id = setInterval(() => setRecordTick(elapsed(recordStart)), 500)
    return () => clearInterval(id)
  }, [recordStart])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 3840 }, height: { ideal: 2160 } },
        audio: true,
      })
      streamRef.current = stream
      setCameraActive(true)
      setRecordStart(new Date())
    } catch (e: any) {
      setCameraError(e.message || 'Camera access denied')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
    setRecordStart(null)
    setRecordTick('00:00')
  }, [])

  const handleTargetLock = useCallback(async () => {
    setIsFetching(true)
    const raw = await fetchLivePlayerStats(TARGET)
    const s: PlayerStats = raw ?? { pts: 34, fg_pct: 54.3, hr: 171 }
    setStats(s)
    setIsFetching(false)

    setStage('insight')
    const narrative = await generateCreativeSnapshot(TARGET, s)
    const brief = narrative ?? `${TARGET} is operating in complete flow state â€” ${s.pts} points on ${s.fg_pct}% shooting. Heart rate at ${s.hr} BPM. Every possession is calculated aggression.`
    setInsight(brief)

    setStage('thumbnail')
    const [thumbUrl, voiceUrl] = await Promise.all([
      generateThumbnail(TARGET, brief),
      generateAudioDub(brief),
    ])
    if (thumbUrl) setThumbnailUrl(thumbUrl)
    if (voiceUrl && audioRef.current) {
      audioRef.current.src = voiceUrl
      audioRef.current.play().catch(() => {})
    }

    setStage('voice')
    setStage('reel')
    setReels([
      { duration: '6s',  caption: `ðŸ”¥ ${s.pts} pts. ${s.hr} bpm. On fire. #NBA #Warriors`,                                                  platform: 'TikTok' },
      { duration: '15s', caption: `${TARGET_SHORT} â€” ${s.pts} points and showing no signs of slowing. ðŸ€ #NBAFinals`,                        platform: 'Instagram' },
      { duration: '30s', caption: `${s.pts} points. ${s.fg_pct}% from the field. HR ${s.hr}. ${brief.substring(0, 90)}â€¦`,                    platform: 'YouTube' },
    ])
    setStage('ready')
  }, [TARGET, TARGET_SHORT])

  const stageIdx = PIPELINE.findIndex(p => p.key === stage)
  const isRunning = ['insight', 'thumbnail', 'voice', 'reel'].includes(stage)

  return (
    <>
      <audio ref={audioRef} hidden />

      <div className="app-layout">

        {/* â”€â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <header className="app-header">
          <div className="app-logo">
            <div className="app-logo-mark">
              <Zap size={15} color="#000" strokeWidth={2.5} />
            </div>
            <span className="app-logo-name">FIELD</span>
            <span className="app-logo-sub">by Pulse Studio</span>
          </div>

          <div className="header-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wifi size={12} color={stage !== 'idle' ? 'var(--amber)' : 'var(--text-3)'} />
              <span style={{ fontSize: 11, color: stage !== 'idle' ? 'var(--amber)' : 'var(--text-3)', fontWeight: 500 }}>
                {stage !== 'idle' ? 'Connected' : 'Offline'}
              </span>
            </div>

            <div className="operator-chip">
              <span className="operator-name">the creator</span>
              <span className="operator-role">OPR_01</span>
              <motion.div
                className="live-dot"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            <span className="header-time">
              {time.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        </header>

        {/* â”€â”€â”€ LEFT SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <aside className="sidebar">
          <div className="section">
            <p className="section-label">Venue</p>
            {[
              { label: 'Location',  value: 'Chase Center â€” San Francisco' },
              { label: 'Position',  value: 'Courtside, Section 114' },
              { label: 'Target',    value: TARGET_SHORT, amber: true },
              { label: 'Distance',  value: '14.2 m â€” approaching' },
            ].map(r => (
              <div className="data-row" key={r.label}>
                <span className="data-row-label">{r.label}</span>
                <span className={`data-row-value${r.amber ? ' amber' : ''}`}>{r.value}</span>
              </div>
            ))}
          </div>

          <div className="section">
            <p className="section-label">Live Stats</p>

            {isFetching ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader2 size={20} color="var(--amber)" />
                </motion.div>
              </div>
            ) : stats ? (
              <>
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-num">{stats.pts}</div>
                    <div className="stat-label">Points</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num">{stats.fg_pct}</div>
                    <div className="stat-label">FG %</div>
                  </div>
                  <div className="stat-card full">
                    <motion.div
                      className="stat-num live"
                      animate={{ opacity: [1, 0.6, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                    >
                      {stats.hr} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-3)' }}>bpm</span>
                    </motion.div>
                    <div className="stat-label">Heart Rate</div>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>
                No target locked. Tap to engage.
              </p>
            )}

            {stage !== 'idle' && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {isRunning && (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Loader2 size={12} color="var(--amber)" />
                  </motion.div>
                )}
                {stage === 'ready' && <Check size={12} color="var(--green)" />}
                <span style={{ fontSize: 11, color: stage === 'ready' ? 'var(--green)' : 'var(--text-3)' }}>
                  {stage === 'ready' ? 'Package ready to publish' : `Generating ${stage}â€¦`}
                </span>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <button
                className="btn-primary"
                onClick={handleTargetLock}
                disabled={isRunning || isFetching}
              >
                <Crosshair size={14} />
                {isFetching ? 'Acquiringâ€¦' : isRunning ? 'Pipeline runningâ€¦' : stage === 'ready' ? 'Re-lock Target' : 'Lock Target'}
              </button>
            </div>
          </div>

          <div className="section">
            <p className="section-label">Operator Mesh</p>
            {[
              { label: 'Room',      value: 'NBA_FINALS_G7', color: 'var(--amber)' },
              { label: 'Operators', value: '3 / 8 online',  color: 'var(--green)' },
              { label: 'Dispatch',  value: '127.0.0.1',  color: 'var(--text-3)' },
            ].map(r => (
              <div className="mesh-row" key={r.label}>
                <div className="mesh-dot" style={{ background: r.color }} />
                <span className="mesh-label">{r.label}</span>
                <span className="mesh-value">{r.value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* â”€â”€â”€ CAMERA CANVAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <main className="canvas">
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              display: cameraActive ? 'block' : 'none',
              zIndex: 1,
            }}
          />

          {!cameraActive && (
            <div className="canvas-standby">
              <div className="standby-icon">
                <Camera size={20} color="var(--text-3)" strokeWidth={1.5} />
              </div>
              <span className="standby-label">{cameraError ?? 'Tap Camera to Begin'}</span>
            </div>
          )}

          {/* Top bar overlays */}
          <div className="cam-badge-row" style={{ zIndex: 10 }}>
            <div className={`cam-badge${cameraActive ? ' live-badge' : ''}`}>
              <Radio size={9} />
              {cameraActive ? `Live  ${recordTick}` : 'Standby'}
            </div>
            <AnimatePresence>
              {cameraActive && (
                <motion.div
                  className="cam-badge"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  4K Â· 120fps
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Viewfinder corners when live */}
          {cameraActive && (
            <div className="vf-corners">
              <div className="vf-corner tl" />
              <div className="vf-corner tr" />
              <div className="vf-corner bl" />
              <div className="vf-corner br" />
            </div>
          )}

          {/* Thumbnail preview */}
          <AnimatePresence>
            {thumbnailUrl && stage === 'ready' && (
              <motion.div
                className="thumb-preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ zIndex: 10 }}
              >
                <img src={thumbnailUrl} alt="Generated frame" style={{ width: '100%', display: 'block' }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera controls */}
          <div className="camera-bar">
            {cameraActive && (
              <div className="rec-badge live">
                <motion.div className="rec-dot" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                <span className="rec-text">{recordTick}</span>
              </div>
            )}
            <button className={`cam-btn${cameraActive ? ' active' : ''}`} onClick={cameraActive ? stopCamera : startCamera}>
              <Camera size={16} />
            </button>
            <button className="cam-btn">
              <Mic size={16} />
            </button>
          </div>
        </main>

        {/* â”€â”€â”€ RIGHT SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <aside className="sidebar right" style={{ display: 'flex', flexDirection: 'column' }}>

          {/* AI Pipeline */}
          <div className="section" style={{ flexShrink: 0 }}>
            <p className="section-label">AI Pipeline</p>
            {PIPELINE.map((step, idx) => {
              const done = stage === 'ready' || (isRunning && stageIdx > idx)
              const active = stage === step.key
              return (
                <div
                  key={step.key}
                  className={`pipeline-step${(!done && !active && stage !== 'idle') ? ' dim' : ''}`}
                >
                  <div className={`step-indicator${done ? ' done' : active ? ' active' : ''}`}>
                    {done
                      ? <Check size={10} strokeWidth={2.5} />
                      : active
                        ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 size={10} /></motion.div>
                        : idx + 1
                    }
                  </div>
                  <div className="step-body">
                    <div className={`step-name${done ? ' done' : active ? ' active' : ''}`}>{step.name}</div>
                    <div className="step-desc">{step.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Insight */}
          <AnimatePresence>
            {insight && (
              <motion.div
                key="insight"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="section"
                style={{ flexShrink: 0 }}
              >
                <p className="section-label">
                  Brief
                  {audioRef.current?.src && (
                    <button
                      onClick={() => audioRef.current?.play()}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', verticalAlign: 'middle', marginLeft: 6 }}
                    >
                      <Volume2 size={11} color="var(--amber)" />
                    </button>
                  )}
                </p>
                <div className="insight-block">"{insight}"</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reels */}
          <AnimatePresence>
            {reels.length > 0 && (
              <motion.div
                key="reels"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="section"
                style={{ flexShrink: 0 }}
              >
                <p className="section-label"><Film size={10} style={{ display: 'inline', marginRight: 5 }} />Content Cuts</p>
                {reels.map(r => (
                  <div className="reel-card" key={r.duration}>
                    <div className="reel-meta">
                      <span className="reel-duration">{r.duration}</span>
                      <span className="reel-platform">{r.platform}</span>
                    </div>
                    <p className="reel-caption">{r.caption.substring(0, 80)}â€¦</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Publish */}
          <div className="section" style={{ marginTop: 'auto', flexShrink: 0 }}>
            <p className="section-label"><Share2 size={10} style={{ display: 'inline', marginRight: 5 }} />Publish</p>
            <div className="publish-row">
              {PLATFORMS.map(({ id, label }) => {
                const done = published.includes(id)
                const ready = stage === 'ready' && !done
                return (
                  <button
                    key={id}
                    className={`publish-btn${done ? ' done' : ready ? ' ready' : ''}`}
                    onClick={() => ready && setPublished(p => [...p, id])}
                    disabled={!ready && !done}
                  >
                    <span>{label}</span>
                    {done
                      ? <Check size={13} />
                      : ready
                        ? <ChevronRight size={13} />
                        : <Layers size={11} color="var(--text-3)" />
                    }
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

      </div>
    </>
  )
}
