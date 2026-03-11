import { useState, useRef, useEffect, useCallback } from 'react'

/* ── Provider key check ─────────────────────────────────────── */
const hasKey = (id: string) => id === 'ollama' || !!localStorage.getItem(`ie_key_${id}`)

/* ── Tool definitions ───────────────────────────────────────── */
interface Tool {
    id: string; icon: string; label: string; desc: string
    providers: string[]; color: string; mode: string; preset?: string
}

interface ToolSection { id: string; label: string; tools: Tool[] }

const TOOL_SECTIONS: ToolSection[] = [
    {
        id: 'create', label: 'Create',
        tools: [
            { id: 'gen-image', icon: '◎', label: 'Generate Image', desc: 'Text → Image with Imagen 3, Flux Pro, SDXL', providers: ['google', 'fal', 'replicate'], color: '#F5A524', mode: 'image' },
            { id: 'gen-video', icon: '▶', label: 'Generate Video', desc: 'Text/Image → Video with Veo 2, WAN, LTX', providers: ['google', 'fal', 'replicate'], color: '#FF6B35', mode: 'video' },
            { id: 'gen-audio', icon: '♫', label: 'Generate Music', desc: 'Compose with Lyria 2, MusicGen, AudioCraft', providers: ['google', 'replicate'], color: '#9B72CF', mode: 'music' },
            { id: 'gen-voice', icon: '🎤', label: 'Voice Synthesis', desc: 'Clone & synthesise voice, multilingual TTS', providers: ['eleven', 'google'], color: '#4285F4', mode: 'voice' },
        ],
    },
    {
        id: 'enhance', label: 'Enhance & Edit',
        tools: [
            { id: 'upscale', icon: '⬡', label: 'Upscale', desc: 'Up to 4K — Real-ESRGAN, Clarity, Topaz', providers: ['fal', 'replicate'], color: '#22c55e', mode: 'upscale' },
            { id: 'img2img', icon: '◈', label: 'Image → Image', desc: 'Style transfer, inpainting, outpainting', providers: ['fal', 'replicate'], color: '#FF6B35', mode: 'img2img' },
            { id: 'img2video', icon: '◧', label: 'Image → Video', desc: 'Animate a still image with controlled motion', providers: ['fal', 'google'], color: '#F5A524', mode: 'img2video' },
            { id: 'stylize', icon: '◆', label: 'Stylize Audio', desc: 'Apply stems, effects, EQ to audio', providers: ['replicate'], color: '#9B72CF', mode: 'stylize' },
        ],
    },
    {
        id: 'apps', label: 'One-Click Apps',
        tools: [
            { id: 'cinematic', icon: '🎬', label: 'Cinematic Shot', desc: 'Film-school lighting & grade in one prompt', providers: ['fal', 'google'], color: '#C17D4A', mode: 'image', preset: 'cinematic' },
            { id: 'moodboard', icon: '◉', label: 'Moodboard', desc: 'Auto-compose a visual moodboard from a theme', providers: ['fal'], color: '#20B2AA', mode: 'image', preset: 'moodboard' },
            { id: 'animorph', icon: '◑', label: 'Character Warp', desc: 'Warp a subject into an alternate style', providers: ['fal', 'replicate'], color: '#8B5CF6', mode: 'img2img', preset: 'animorph' },
            { id: 'relight', icon: '●', label: 'Relight Scene', desc: 'Change lighting conditions on any photo', providers: ['fal'], color: '#ef4444', mode: 'img2img', preset: 'relight' },
            { id: 'expand', icon: '□', label: 'Expand Canvas', desc: 'Outpaint in any direction with continuity', providers: ['fal', 'replicate'], color: '#22c55e', mode: 'img2img', preset: 'expand' },
            { id: 'vary', icon: '◇', label: 'Variations', desc: 'Generate multiple creative takes on a theme', providers: ['fal', 'google'], color: '#4285F4', mode: 'image', preset: 'vary' },
        ],
    },
    {
        id: 'intelligence', label: 'Intelligence',
        tools: [
            { id: 'gemini', icon: '◆', label: 'Gemini 2.0 Flash', desc: 'Fast multimodal reasoning, 1M token context', providers: ['google'], color: '#4285F4', mode: 'text' },
            { id: 'claude', icon: '◇', label: 'Claude 3.5 Sonnet', desc: 'Creative writing, analysis, long-form', providers: ['anthropic'], color: '#C17D4A', mode: 'text' },
            { id: 'llama', icon: '○', label: 'Llama 3.3 (Local)', desc: 'Fully sovereign — runs on your hardware', providers: ['ollama'], color: '#22c55e', mode: 'text' },
            { id: 'sonar', icon: '◉', label: 'Sonar Pro (Web)', desc: 'Real-time web search with cited responses', providers: ['perplexity'], color: '#20B2AA', mode: 'text' },
        ],
    },
]

const ALL_TOOLS = TOOL_SECTIONS.flatMap(s => s.tools)

interface ModePreset { placeholder: string; options: string[]; optionLabel: string }

const MODE_PRESETS: Record<string, ModePreset> = {
    image: { placeholder: 'A cinematic portrait of a lone astronaut in a neon Tokyo alley at 3am, anamorphic lens flares, ultra-detailed…', options: ['1:1', '16:9', '4:3', '9:16', '3:2'], optionLabel: 'Aspect' },
    video: { placeholder: 'A slow-motion macro shot of a dandelion releasing seeds into golden hour, 4K, gentle camera drift…', options: ['5s', '10s', '15s'], optionLabel: 'Duration' },
    music: { placeholder: 'A 32-bar lo-fi hip-hop beat: warm upright bass, dusty vinyl crackle, lazy brushed snare at 82bpm…', options: ['15s', '30s', '60s', '2min'], optionLabel: 'Length' },
    voice: { placeholder: 'Speak these words in a warm, confident, slightly husky female voice with a slight British accent…', options: ['Warm', 'Clinical', 'Dramatic', 'ASMR'], optionLabel: 'Tone' },
    text: { placeholder: 'Write a compelling product brief for a sovereign creative AI OS built for independent artists…', options: ['Concise', 'Standard', 'Detailed'], optionLabel: 'Length' },
    upscale: { placeholder: 'Upload an image and describe any enhancement directives…', options: ['2×', '4×', '8×'], optionLabel: 'Scale' },
    img2img: { placeholder: 'Describe the transformation — "convert to oil painting style", "add cinematic rain"…', options: ['0.3', '0.5', '0.7', '0.9'], optionLabel: 'Strength' },
    img2video: { placeholder: 'Describe the motion — "gentle zoom in", "camera pans left revealing background"…', options: ['5s', '10s'], optionLabel: 'Duration' },
    stylize: { placeholder: 'Describe the audio transformation — "lo-fi vinyl warmth", "orchestral reverb", "8-bit chiptune"…', options: ['Subtle', 'Medium', 'Strong'], optionLabel: 'Intensity' },
}
const DEFAULT_PRESET: ModePreset = MODE_PRESETS.text

interface Output {
    id: string; toolId: string; toolLabel: string; prompt: string
    result: string; resultType: 'text' | 'image' | 'placeholder'; ts: number; providerKey: string
}

/* ── Component ─────────────────────────────────────────────── */
export default function NexusLight() {
    const [activeTool, setActiveTool] = useState<Tool | null>(null)
    const [prompt, setPrompt] = useState('')
    const [option, setOption] = useState('')
    const [outputs, setOutputs] = useState<Output[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [loadMsg, setLoadMsg] = useState('Thinking…')
    const textRef = useRef<HTMLTextAreaElement>(null)

    // Cycle loading messages
    useEffect(() => {
        if (!loading) return
        const msgs = ['Thinking…', 'Processing…', 'Generating…', 'Rendering…', 'Almost there…']
        let i = 0
        const t = setInterval(() => { i = (i + 1) % msgs.length; setLoadMsg(msgs[i]) }, 1800)
        return () => clearInterval(t)
    }, [loading])

    const openTool = (tool: Tool) => {
        setActiveTool(tool)
        const p = MODE_PRESETS[tool.mode] ?? DEFAULT_PRESET
        setOption(p.options[0])
        setPrompt('')
        setTimeout(() => textRef.current?.focus(), 80)
    }

    const filteredSections: ToolSection[] = search.trim()
        ? [{
            id: 'search', label: 'Results', tools: ALL_TOOLS.filter(t =>
                t.label.toLowerCase().includes(search.toLowerCase()) ||
                t.desc.toLowerCase().includes(search.toLowerCase())
            )
        }]
        : TOOL_SECTIONS

    const generate = useCallback(async () => {
        if (!activeTool || !prompt.trim() || loading) return
        const id = crypto.randomUUID()
        const modeInfo = (MODE_PRESETS[activeTool.mode] ?? DEFAULT_PRESET).optionLabel
        setLoading(true); setLoadMsg('Thinking…')
        setOutputs(prev => [{
            id, toolId: activeTool.id, toolLabel: activeTool.label, prompt,
            result: '', resultType: 'placeholder', ts: Date.now(), providerKey: activeTool.providers[0],
        }, ...prev])
        try {
            const genkitUrl = import.meta.env.VITE_GENKIT_URL ?? 'http://localhost:4000'
            const r = await fetch(`${genkitUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, mode: activeTool.mode, option, modeInfo, appPreset: activeTool.preset }),
                signal: AbortSignal.timeout(90_000),
            })
            const text = r.ok
                ? await r.json().then((d: Record<string, unknown>) => String(d.text ?? d.url ?? d.output ?? JSON.stringify(d))).catch(() => 'Done')
                : `[${r.status}] Service error`
            const resType: Output['resultType'] = activeTool.mode === 'image' && text.startsWith('http') ? 'image' : 'text'
            setOutputs(prev => prev.map(o => o.id === id ? { ...o, result: text, resultType: resType } : o))
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            setOutputs(prev => prev.map(o => o.id === id ? { ...o, result: `Error: ${msg}`, resultType: 'text' } : o))
        } finally { setLoading(false); setPrompt('') }
    }, [activeTool, prompt, option, loading])

    // Compute preset for active tool
    const preset: ModePreset | null = activeTool ? (MODE_PRESETS[activeTool.mode] ?? DEFAULT_PRESET) : null

    return (
        <div style={{ height: '100%', display: 'flex', background: 'var(--bg-void)', minHeight: 0 }}>

            {/* ── LEFT: Tool browser ────────────────────────────── */}
            <aside style={{
                width: 300, flexShrink: 0, borderRight: '1px solid var(--border-subtle)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 900, letterSpacing: 2.5, marginBottom: 12 }}>NEXUS STUDIO</div>
                    <div style={{ position: 'relative' }}>
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search tools…"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 30px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--chalk)', outline: 'none', backdropFilter: 'blur(10px)' }}
                        />
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 12, pointerEvents: 'none' }}>⌕</span>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 40px' }}>
                    {filteredSections.map(section => (
                        <div key={section.id}>
                            <div style={{ padding: '12px 18px 6px', fontSize: 9, fontWeight: 800, letterSpacing: 2.5, color: 'var(--text-tertiary)' }}>
                                {section.label.toUpperCase()}
                            </div>
                            {section.tools.map(tool => {
                                const active = activeTool?.id === tool.id
                                const live = tool.providers.some(hasKey)
                                return (
                                    <div
                                        key={tool.id} onClick={() => openTool(tool)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', cursor: 'pointer', background: active ? `${tool.color}0e` : 'transparent', borderLeft: active ? `2px solid ${tool.color}` : '2px solid transparent', transition: 'all 0.15s' }}
                                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                                    >
                                        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${tool.color}15`, border: `1px solid ${tool.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: tool.color }}>{tool.icon}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--chalk)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {tool.label}
                                                {!live && <span style={{ fontSize: 8, color: 'var(--status-warning)', background: 'rgba(245,165,36,0.1)', padding: '1px 5px', borderRadius: 100, fontWeight: 700 }}>NO KEY</span>}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.desc}</div>
                                        </div>
                                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>→</span>
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </aside>

            {/* ── RIGHT: Canvas ─────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                {/* Tool header bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
                    {activeTool ? (
                        <>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${activeTool.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: activeTool.color }}>{activeTool.icon}</div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--chalk)' }}>{activeTool.label}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{activeTool.desc}</div>
                            </div>
                            {preset && (
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: 1 }}>{preset.optionLabel.toUpperCase()}</span>
                                    {preset.options.map(o => (
                                        <button key={o} onClick={() => setOption(o)} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: option === o ? `${activeTool.color}20` : 'rgba(255,255,255,0.04)', color: option === o ? activeTool.color : 'var(--text-tertiary)', border: `1px solid ${option === o ? activeTool.color + '50' : 'transparent'}`, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s' }}>{o}</button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>← Select a tool to begin</span>
                    )}
                </div>

                {/* Prompt bar */}
                {activeTool && (
                    <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
                        <textarea
                            ref={textRef}
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate() }}
                            placeholder={preset?.placeholder ?? 'Describe what you want to create…'}
                            rows={3}
                            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'var(--chalk)', lineHeight: 1.7, boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginRight: 'auto' }}>⌘↵ to generate</span>
                            <button
                                onClick={generate}
                                disabled={!prompt.trim() || loading}
                                style={{ padding: '9px 28px', borderRadius: 100, fontSize: 12, fontWeight: 800, background: prompt.trim() && !loading ? activeTool.color : 'rgba(255,255,255,0.06)', color: prompt.trim() && !loading ? '#000' : 'var(--text-tertiary)', border: 'none', cursor: prompt.trim() && !loading ? 'pointer' : 'default', fontFamily: 'var(--font-sans)', transition: 'all 0.18s' }}
                            >{loading ? loadMsg : `Generate ${activeTool.icon}`}</button>
                        </div>
                    </div>
                )}

                {/* Canvas */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 120px', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
                    {!activeTool && (
                        <div style={{ maxWidth: 560, margin: '40px auto' }}>
                            <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 900, letterSpacing: 2.5, marginBottom: 16 }}>WHAT DO YOU WANT TO CREATE?</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {TOOL_SECTIONS[0].tools.map(tool => (
                                    <div
                                        key={tool.id} onClick={() => openTool(tool)}
                                        style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${tool.color}22`, borderRadius: 16, cursor: 'pointer', transition: 'all 0.15s', backdropFilter: 'blur(10px)' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = `${tool.color}0c`; e.currentTarget.style.borderColor = `${tool.color}50`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = `${tool.color}22`; e.currentTarget.style.transform = 'translateY(0)' }}
                                    >
                                        <div style={{ fontSize: 24, marginBottom: 10, color: tool.color }}>{tool.icon}</div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--chalk)', marginBottom: 4 }}>{tool.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{tool.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {outputs.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                            {outputs.map(o => (
                                <div key={o.id} style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', animation: 'fadeSlideIn 0.3s ease' }}>
                                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: 1 }}>{o.toolLabel.toUpperCase()}</span>
                                        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{new Date(o.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    {o.resultType === 'placeholder' ? (
                                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--amber)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{loadMsg}</span>
                                        </div>
                                    ) : o.resultType === 'image' && o.result.startsWith('http') ? (
                                        <img src={o.result} alt={o.prompt} style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ padding: 16, fontSize: 13, color: 'var(--chalk)', lineHeight: 1.75, whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto' }}>{o.result || '—'}</div>
                                    )}
                                    <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{o.prompt}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin        { from { transform:rotate(0deg) }              to { transform:rotate(360deg) } }
      `}</style>
        </div>
    )
}
