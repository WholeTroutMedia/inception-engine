import { useState, useEffect } from 'react'
import './KeyVault.css'

/* ── Provider definitions ────────────────────────────────────── */
interface Provider {
    id: string; name: string; label: string; color: string
    capabilities: string[]; docsUrl: string; placeholder: string
}

const PROVIDERS: Provider[] = [
    { id: 'google', name: 'google', label: 'Google AI Studio', color: '#4285F4', capabilities: ['Gemini 2.0 Flash', 'Imagen 3', 'Veo 2', 'Lyria 2'], docsUrl: 'https://aistudio.google.com', placeholder: 'AIza…' },
    { id: 'vertex', name: 'vertex', label: 'Vertex AI', color: '#34A853', capabilities: ['Gemini Pro', 'Imagen 3', 'Veo 2', 'Embeddings'], docsUrl: 'https://cloud.google.com/vertex-ai', placeholder: 'ya29… or service account JSON' },
    { id: 'anthropic', name: 'anthropic', label: 'Anthropic', color: '#C17D4A', capabilities: ['Claude 3.5 Sonnet', 'Claude 3 Haiku', 'Claude 3 Opus'], docsUrl: 'https://console.anthropic.com', placeholder: 'sk-ant-…' },
    { id: 'openai', name: 'openai', label: 'OpenAI', color: '#00A67E', capabilities: ['GPT-4o', 'GPT-4 Turbo', 'DALL·E 3', 'Whisper'], docsUrl: 'https://platform.openai.com', placeholder: 'sk-…' },
    { id: 'fal', name: 'fal', label: 'FAL.ai', color: '#FF6B35', capabilities: ['Flux Pro', 'WAN 2.1', 'LTX Video', 'Kling'], docsUrl: 'https://fal.ai', placeholder: 'fal-…' },
    { id: 'replicate', name: 'replicate', label: 'Replicate', color: '#9B72CF', capabilities: ['SDXL', 'MusicGen', 'Real-ESRGAN', 'Llama 3.3'], docsUrl: 'https://replicate.com', placeholder: 'r8_…' },
    { id: 'perplexity', name: 'perplexity', label: 'Perplexity', color: '#20B2AA', capabilities: ['Sonar Pro', 'Sonar', 'Sonar Deep Research'], docsUrl: 'https://www.perplexity.ai/settings/api', placeholder: 'pplx-…' },
    { id: 'eleven', name: 'eleven', label: 'ElevenLabs', color: '#22c55e', capabilities: ['Voice Clone', 'TTS v3', 'Voice Design', 'Dubbing'], docsUrl: 'https://elevenlabs.io', placeholder: 'xi-…' },
    { id: 'runway', name: 'runway', label: 'Runway', color: '#ef4444', capabilities: ['Gen-3 Alpha', 'Gen-3 Turbo', 'Act-One'], docsUrl: 'https://runwayml.com', placeholder: 'key_…' },
    { id: 'stability', name: 'stability', label: 'Stability AI', color: '#8B5CF6', capabilities: ['Stable Diffusion 3.5', 'Stable Video', 'Stable Audio'], docsUrl: 'https://platform.stability.ai', placeholder: 'sk-…' },
    { id: 'huggingface', name: 'huggingface', label: 'Hugging Face', color: '#F5A524', capabilities: ['Inference API', '350k+ Models', 'Spaces'], docsUrl: 'https://huggingface.co/settings/tokens', placeholder: 'hf_…' },
    { id: 'ollama', name: 'ollama', label: 'Ollama (Local)', color: '#4285F4', capabilities: ['Llama 3.3', 'Mistral', 'Phi-4', 'DeepSeek', 'Qwen'], docsUrl: 'http://localhost:11434', placeholder: 'No key needed — runs locally' },
]

export default function KeyVault() {
    const [keys, setKeys] = useState<Record<string, string>>({})
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [saved, setSaved] = useState<Record<string, boolean>>({})

    const [customDraftKey, setCustomDraftKey] = useState('')
    const [customDraftValue, setCustomDraftValue] = useState('')

    // Load from Dispatch Vault
    useEffect(() => {
        fetch('http://localhost:5050/api/vault')
            .then(res => res.json())
            .then(data => {
                if (data.secrets) {
                    const loaded: Record<string, string> = {}
                    data.secrets.forEach((s: string) => loaded[s] = '••••••••')
                    setKeys(loaded)
                }
            })
            .catch(err => console.error('Failed to load vault keys', err));
    }, [])

    const saveCustomKey = async () => {
        if (!customDraftKey.trim() || !customDraftValue.trim()) return;
        const id = customDraftKey.trim();
        const val = customDraftValue.trim();
        await fetch('http://localhost:5050/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: id, value: val })
        });
        setKeys(prev => ({ ...prev, [id]: '••••••••' }));
        setCustomDraftKey('');
        setCustomDraftValue('');
        setSaved(prev => ({ ...prev, ['__custom']: true }));
        setTimeout(() => setSaved(prev => ({ ...prev, ['__custom']: false })), 2000);
    }

    const saveKey = async (id: string) => {
        const val = (drafts[id] ?? '').trim()
        if (!val) return

        await fetch('http://localhost:5050/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: id, value: val })
        });

        setKeys(prev => ({ ...prev, [id]: '••••••••' }))
        setDrafts(prev => ({ ...prev, [id]: '' }))
        setSaved(prev => ({ ...prev, [id]: true }))
        setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2000)
    }

    const removeKey = async (id: string) => {
        await fetch(`http://localhost:5050/api/vault/${id}`, { method: 'DELETE' });
        setKeys(prev => { const n = { ...prev }; delete n[id]; return n })
    }

    const liveCount = PROVIDERS.filter(p => p.id === 'ollama' || !!keys[p.id]).length

    const mask = (val: string) => val.length <= 8 ? '•'.repeat(val.length) : `${val.slice(0, 4)}${'•'.repeat(Math.max(0, val.length - 8))}${val.slice(-4)}`

    return (
        <div className="kv-page">

            {/* Header */}
            <div className="kv-header">
                <div className="kv-supertitle">KEY VAULT</div>
                <div className="kv-title-row">
                    <h1 className="kv-title">API Keys</h1>
                    <span className="kv-count">
                        <span className="kv-count-active">{liveCount}</span> / {PROVIDERS.length} providers active
                    </span>
                </div>
                <p className="kv-description">
                    Keys encode AES-256-GCM and store centrally on the Dispatch server. They cannot be read via the UI once saved.
                </p>
            </div>

            {/* Provider grid */}
            <div className="kv-body">
                <div className="kv-provider-grid">
                    {PROVIDERS.map(p => {
                        const live = p.id === 'ollama' || !!keys[p.id]
                        const current = keys[p.id] ?? ''
                        const draft = drafts[p.id] ?? ''
                        const justSaved = saved[p.id] ?? false
                        const isLocal = p.id === 'ollama'

                        const cardStyle = {
                            background: live ? `${p.color}08` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${live ? p.color + '28' : 'rgba(255,255,255,0.07)'}`,
                        }
                        const iconStyle = {
                            background: `${p.color}18`,
                            border: `1px solid ${p.color}30`,
                        }
                        const dotStyle = {
                            background: live ? 'var(--status-success)' : 'var(--status-error)',
                            boxShadow: `0 0 ${live ? 8 : 4}px ${live ? 'var(--status-success)' : 'var(--status-error)'}`,
                        }
                        const badgeStyle = {
                            color: live ? 'var(--status-success)' : 'var(--text-tertiary)',
                            background: live ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                        }
                        const capStyle = {
                            color: p.color,
                            background: `${p.color}12`,
                        }
                        const saveBtnStyle = {
                            background: draft.trim() ? p.color : 'rgba(255,255,255,0.05)',
                            color: draft.trim() ? '#000' : 'var(--text-tertiary)',
                            cursor: draft.trim() ? 'pointer' : 'default',
                        }

                        return (
                            <div key={p.id} className="kv-provider-card" style={cardStyle}>
                                {/* Header row */}
                                <div className="kv-card-header-row">
                                    <div className="kv-provider-icon" style={iconStyle}>
                                        <span className="kv-status-dot" style={dotStyle} />
                                    </div>
                                    <div className="kv-card-meta">
                                        <div className="kv-card-meta-row">
                                            <span className="kv-provider-name">{p.label}</span>
                                            <span className="kv-status-badge" style={badgeStyle}>{live ? 'ACTIVE' : 'NO KEY'}</span>
                                        </div>
                                        <a href={p.docsUrl} target="_blank" rel="noreferrer" className="kv-docs-link">{p.docsUrl}</a>
                                    </div>
                                </div>

                                {/* Capabilities */}
                                <div className="kv-capabilities">
                                    {p.capabilities.map(c => (
                                        <span key={c} className="kv-cap-chip" style={capStyle}>{c}</span>
                                    ))}
                                </div>

                                {/* Key display / input */}
                                {isLocal ? (
                                    <div className="kv-local-badge">
                                        ✓ Ollama running locally at localhost:11434
                                    </div>
                                ) : (
                                    <>
                                        {current && (
                                            <div className="kv-key-existing">
                                                <span className="kv-key-masked">
                                                    {current === '••••••••' ? '••••••••••••••••' : mask(current)}
                                                </span>
                                                <button onClick={() => removeKey(p.id)} className="kv-remove-btn">Remove</button>
                                            </div>
                                        )}
                                        <div className="kv-input-row">
                                            <input
                                                type="password"
                                                value={draft}
                                                onChange={e => setDrafts(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') saveKey(p.id) }}
                                                placeholder={current ? 'Replace key…' : p.placeholder}
                                                className="kv-key-input"
                                            />
                                            <button
                                                onClick={() => saveKey(p.id)}
                                                disabled={!draft.trim()}
                                                className="kv-save-btn"
                                                style={saveBtnStyle}
                                            >{justSaved ? '✓ Saved' : 'Save'}</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Custom Secrets Grid */}
                <div className="kv-custom-section-header">
                    <div className="kv-custom-supertitle">CUSTOM APPLICATION SECRETS</div>
                    <div className="kv-custom-title-row">
                        <h2 className="kv-custom-title">App Passwords</h2>
                    </div>
                </div>

                <div className="kv-custom-list">
                    {Object.keys(keys).filter(k => !PROVIDERS.find(p => p.id === k)).map(customKey => (
                        <div key={customKey} className="kv-custom-item">
                            <div className="kv-custom-item-left">
                                <div className="kv-custom-dot" />
                                <span className="kv-custom-key-name">{customKey}</span>
                            </div>
                            <span className="kv-custom-masked">••••••••••••••••</span>
                            <button onClick={() => removeKey(customKey)} className="kv-custom-remove-btn">Remove</button>
                        </div>
                    ))}

                    <div className="kv-add-row">
                        <input
                            type="text"
                            placeholder="Key identifier (e.g. synology-admin)"
                            value={customDraftKey}
                            onChange={e => setCustomDraftKey(e.target.value)}
                            className="kv-add-input kv-add-input-key"
                        />
                        <input
                            type="password"
                            placeholder="Secret value..."
                            value={customDraftValue}
                            onChange={e => setCustomDraftValue(e.target.value)}
                            className="kv-add-input kv-add-input-value"
                        />
                        <button
                            onClick={saveCustomKey}
                            disabled={!customDraftKey.trim() || !customDraftValue.trim()}
                            className="kv-add-btn"
                            style={{
                                background: (customDraftKey.trim() && customDraftValue.trim()) ? 'var(--amber)' : 'rgba(255,255,255,0.05)',
                                color: (customDraftKey.trim() && customDraftValue.trim()) ? '#000' : 'var(--text-tertiary)',
                                cursor: (customDraftKey.trim() && customDraftValue.trim()) ? 'pointer' : 'default',
                            }}
                        >{saved['__custom'] ? '✓ Saved' : 'Add Secret'}</button>
                    </div>
                </div>

            </div>
        </div>
    )
}
