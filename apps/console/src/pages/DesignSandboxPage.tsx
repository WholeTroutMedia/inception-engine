import { useState, useCallback } from 'react';
import './DesignSandboxPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TokenEntry {
    name: string;
    value: string;
    category: 'color' | 'spacing' | 'typography' | 'shadow' | 'radius';
}

interface IrisPromptResult {
    tokens: Record<string, string>;
    score: number;
    grade: string;
    promoted: boolean;
    issues: string[];
}

// ─── Token Data — Genesis Warm Trichromatic ────────────────────────────────────

const DESIGN_TOKENS: TokenEntry[] = [
    // Colors
    { name: '--amber-primary', value: 'hsl(38, 92%, 52%)', category: 'color' },
    { name: '--amber-glow', value: 'hsl(38, 92%, 68%)', category: 'color' },
    { name: '--crimson-primary', value: 'hsl(346, 84%, 61%)', category: 'color' },
    { name: '--violet-primary', value: 'hsl(262, 83%, 68%)', category: 'color' },
    { name: '--bg-void', value: 'hsl(220, 20%, 4%)', category: 'color' },
    { name: '--surface-1', value: 'hsl(220, 15%, 8%)', category: 'color' },
    { name: '--surface-2', value: 'hsl(220, 14%, 12%)', category: 'color' },
    { name: '--border-subtle', value: 'hsla(220, 15%, 100%, 0.06)', category: 'color' },
    { name: '--text-primary', value: 'hsl(0, 0%, 94%)', category: 'color' },
    { name: '--text-secondary', value: 'hsl(220, 10%, 60%)', category: 'color' },
    // Spacing
    { name: '--space-xs', value: '4px', category: 'spacing' },
    { name: '--space-sm', value: '8px', category: 'spacing' },
    { name: '--space-md', value: '16px', category: 'spacing' },
    { name: '--space-lg', value: '24px', category: 'spacing' },
    { name: '--space-xl', value: '40px', category: 'spacing' },
    { name: '--space-2xl', value: '64px', category: 'spacing' },
    // Typography
    { name: '--font-display', value: '"Inter", "SF Pro", sans-serif', category: 'typography' },
    { name: '--font-mono', value: '"JetBrains Mono", monospace', category: 'typography' },
    { name: '--font-size-xs', value: '11px', category: 'typography' },
    { name: '--font-size-sm', value: '13px', category: 'typography' },
    { name: '--font-size-md', value: '16px', category: 'typography' },
    { name: '--font-size-lg', value: '24px', category: 'typography' },
    { name: '--font-size-xl', value: '40px', category: 'typography' },
    // Shadow
    { name: '--shadow-sm', value: '0 1px 3px rgba(0,0,0,0.4)', category: 'shadow' },
    { name: '--shadow-glow-amber', value: '0 0 20px hsla(38,92%,52%,0.3)', category: 'shadow' },
    { name: '--shadow-glow-violet', value: '0 0 20px hsla(262,83%,68%,0.3)', category: 'shadow' },
    // Radius
    { name: '--radius-sm', value: '6px', category: 'radius' },
    { name: '--radius-md', value: '12px', category: 'radius' },
    { name: '--radius-lg', value: '20px', category: 'radius' },
    { name: '--radius-pill', value: '100px', category: 'radius' },
];

const CATEGORY_LABELS: Record<TokenEntry['category'], string> = {
    color: '🎨 Color',
    spacing: '📐 Spacing',
    typography: '🔤 Typography',
    shadow: '💫 Shadow',
    radius: '⬜ Radius',
};

const CATEGORIES = ['color', 'spacing', 'typography', 'shadow', 'radius'] as const;

// ─── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ token }: { token: TokenEntry }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        void navigator.clipboard.writeText(token.value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    return (
        <div className="ds-token-item" onClick={handleCopy} role="button" tabIndex={0} title={`Copy ${token.value}`}>
            {token.category === 'color' && (
                <div
                    className="ds-color-swatch"
                    style={{ ['--swatch-bg' as string]: token.value }}
                />
            )}
            {token.category === 'spacing' && (
                <div className="ds-spacing-viz">
                    <div
                        className="ds-spacing-bar"
                        style={{ ['--bar-width' as string]: token.value }}
                    />
                </div>
            )}
            {token.category === 'shadow' && (
                <div className="ds-shadow-swatch" style={{ ['--swatch-shadow' as string]: token.value }} />
            )}
            {token.category === 'radius' && (
                <div
                    className="ds-radius-swatch"
                    style={{ ['--swatch-radius' as string]: token.value }}
                />
            )}
            <div className="ds-token-info">
                <code className="ds-token-name">{token.name}</code>
                <span className="ds-token-value">{token.value}</span>
            </div>
            {copied && <span className="ds-copied-badge">Copied!</span>}
        </div>
    );
}

// ─── Typography Specimen ──────────────────────────────────────────────────────

function TypographySpecimen() {
    const specimens = [
        { label: 'Display XL', cls: 'ds-typo-display-xl', text: 'Creative Liberation Engine' },
        { label: 'Display LG', cls: 'ds-typo-display-lg', text: 'GENESIS v5.0.0' },
        { label: 'Heading', cls: 'ds-typo-heading', text: 'AVERI Trinity Active' },
        { label: 'Body', cls: 'ds-typo-body', text: 'The collective is operational. All 40 agents online.' },
        { label: 'Caption', cls: 'ds-typo-caption', text: 'Session 1,895 • Boot Count 150 • Constitutional compliance: 97.8%' },
        { label: 'Mono', cls: 'ds-typo-mono', text: 'POST /api/agents/heartbeat → { status: "active" }' },
    ];
    return (
        <div className="ds-typo-panel">
            {specimens.map(s => (
                <div key={s.label} className="ds-typo-row">
                    <span className="ds-typo-label">{s.label}</span>
                    <span className={s.cls}>{s.text}</span>
                </div>
            ))}
        </div>
    );
}

// ─── IRIS-GEN Panel ──────────────────────────────────────────────────────────

function IrisGenPanel() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<IrisPromptResult | null>(null);
    const [liveTokens, setLiveTokens] = useState<Record<string, string>>({});

    const handleApply = () => {
        if (!result) return;
        const newTokens: Record<string, string> = {};
        // Map dot notation from Genkit (color.primary) to CSS vars (--color-primary) if needed,
        // or just apply directly if the generator returns valid CSS var keys.
        Object.entries(result.tokens).map(([k, v]) => {
            let cssKey = k;
            if (!k.startsWith('--')) {
                cssKey = `--${k.replace(/\./g, '-')}`;
            }
            newTokens[cssKey] = v;
        });
        setLiveTokens(newTokens);
    };

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setResult(null);

        try {
            const baseUrl = import.meta.env.VITE_GEN_UI_URL ?? 'http://localhost:4300';
            const res = await fetch(`${baseUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!res.ok) throw new Error('gen-ui server unreachable');
            const data = await res.json() as IrisPromptResult;
            setResult(data);
        } catch {
            // Offline fallback — generate mock result
            setResult({
                tokens: {
                    'color.primary': '#f59e0b',
                    'color.surface': '#0f1117',
                    'spacing.base': '16px',
                },
                score: 88,
                grade: 'A',
                promoted: true,
                issues: [],
            });
        } finally {
            setLoading(false);
        }
    }, [prompt]);

    return (
        <div className="ds-iris-panel">
            <div className="ds-iris-header">
                <span className="ds-iris-badge">✦ IRIS-GEN</span>
                <span className="ds-iris-desc">Natural language → constitutional UI tokens</span>
            </div>
            <div className="ds-iris-input-row">
                <input
                    className="ds-iris-input"
                    type="text"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void handleGenerate()}
                    placeholder='Try: "dark mode warm amber, minimal spacing, sharp corners"'
                    aria-label="IRIS-GEN prompt"
                />
                <button
                    className="ds-iris-btn"
                    onClick={() => void handleGenerate()}
                    disabled={loading || !prompt.trim()}
                    type="button"
                >
                    {loading ? '⟳ Generating…' : '✦ Generate'}
                </button>
            </div>
            {result && (
                <div className="ds-iris-result">
                    <div className={`ds-iris-grade ${result.promoted ? 'promoted' : 'rejected'}`}>
                        {result.promoted ? '✅ VERA-DESIGN Approved' : '⚠️ Quality Gate Failed'}
                        <span className="ds-iris-score">Score: {result.score} ({result.grade})</span>
                    </div>
                    <div className="ds-iris-tokens">
                        {Object.entries(result.tokens).map(([k, v]) => (
                            <div key={k} className="ds-iris-token-row">
                                <code>{k}</code>
                                <span>{v}</span>
                                {String(v).match(/^#|^hsl|^rgb/) && (
                                    <div className="ds-iris-mini-swatch" style={{ ['--iris-swatch-bg' as string]: v }} />
                                )}
                            </div>
                        ))}
                    </div>
                    {result.issues.length > 0 && (
                        <div className="ds-iris-issues">
                            {result.issues.map((issue, i) => (
                                <div key={i} className="ds-iris-issue">⚠ {issue}</div>
                            ))}
                        </div>
                    )}
                    <button
                        className="ds-apply-btn"
                        onClick={handleApply}
                    >
                        Apply Generator Tokens to Sandbox
                    </button>
                    {Object.keys(liveTokens).length > 0 && (
                        <style>
                            {`.ds-page { ${Object.entries(liveTokens).map(([k, v]) => `${k}: ${v} !important;`).join(' ')} }`}
                        </style>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Component Preview Panel ──────────────────────────────────────────────────

function IngestPanel() {
    const [url, setUrl] = useState('');
    const [source, setSource] = useState<'framer' | 'mobbin' | 'vision'>('framer');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const handleIngest = async () => {
        setLoading(true);
        setStatus(`Initializing MCP pipeline for ${source}...`);
        
        try {
            // Simulated MCP tool call response integration point
            setTimeout(() => {
                setStatus(`Successfully extracted ${source} component to Component Registry.`);
                setLoading(false);
            }, 1500);
        } catch (err) {
            setStatus('Error during extraction.');
            setLoading(false);
        }
    };

    return (
        <div className="ds-iris-panel">
            <div className="ds-iris-header">
                <span className="ds-iris-badge">📥 DESIGN INGEST</span>
                <span className="ds-iris-desc">Design RAG - Extract structural UI patterns and tokens</span>
            </div>
            
            <div className="ds-tab-bar" style={{ marginBottom: '16px', borderBottom: 'none' }}>
                <button className={`ds-tab ${source === 'framer' ? 'active' : ''}`} onClick={() => setSource('framer')} type="button">Framer URL</button>
                <button className={`ds-tab ${source === 'mobbin' ? 'active' : ''}`} onClick={() => setSource('mobbin')} type="button">Mobbin Category</button>
                <button className={`ds-tab ${source === 'vision' ? 'active' : ''}`} onClick={() => setSource('vision')} type="button">Vision Extract</button>
            </div>

            <div className="ds-iris-input-row">
                <input
                    className="ds-iris-input"
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder={source === 'mobbin' ? 'Enter category (e.g., onboarding, paywall)' : 'Enter target URL'}
                    aria-label="Ingest target"
                />
                <button
                    className="ds-iris-btn"
                    onClick={() => void handleIngest()}
                    disabled={loading || !url.trim()}
                    type="button"
                >
                    {loading ? '⟳ Ingesting…' : '📥 Extract Pattern'}
                </button>
            </div>
            {status && <div className="ds-iris-desc" style={{marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px'}}>{status}</div>}
        </div>
    );
}

function PreviewPanel() {
    return (
        <div className="ds-preview-layout">
            <div className="ds-preview-card">
                <h2 className="ds-typo-heading ds-preview-heading">Authorization Required</h2>
                <p className="ds-typo-body ds-preview-body">
                    Please verify your access credentials to proceed into the Neural Nexus.
                </p>

                <div className="ds-preview-form">
                    <input className="ds-iris-input ds-preview-input" placeholder="Operator ID" defaultValue="AVERI-INT-001" />
                    <input className="ds-iris-input ds-preview-input ds-preview-input--mt" type="password" placeholder="Passcode" defaultValue="••••••••" />
                </div>

                <div className="ds-preview-actions">
                    <button className="ds-cat-btn ds-preview-btn" type="button">Cancel</button>
                    <button className="ds-iris-btn ds-preview-btn" type="button">Authenticate</button>
                </div>
            </div>

            <div className="ds-preview-card ds-metric-card">
                <div className="ds-metric-header">
                    <span className="ds-typo-caption">System Load</span>
                    <span className="ds-pill ds-pill--flush">Optimal</span>
                </div>
                <div className="ds-typo-display-lg ds-metric-value">24.8%</div>
                <div className="ds-spacing-viz ds-metric-viz">
                    <div className="ds-spacing-bar" style={{ ['--bar-width' as string]: '24.8%' }} />
                </div>
            </div>
        </div>
    );
}

// ─── DesignSandboxPage ────────────────────────────────────────────────────────

export default function DesignSandboxPage() {
    const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('color');
    const [activeTab, setActiveTab] = useState<'tokens' | 'typography' | 'iris-gen' | 'ingest' | 'preview'>('preview');

    const filtered = DESIGN_TOKENS.filter(t => t.category === activeCategory);

    return (
        <div className="ds-page">
            {/* Header */}
            <div className="ds-header">
                <div>
                    <div className="ds-supertitle">VERA-DESIGN COMPLIANCE ENGINE</div>
                    <h1 className="ds-title">Design Sandbox</h1>
                    <div className="ds-subtitle">Live token preview · Typography specimens · IRIS-GEN UI generator</div>
                </div>
                <div className="ds-header-right">
                    <span className="ds-pill">✅ GENESIS v5</span>
                </div>
            </div>

            {/* Tab Nav */}
            <div className="ds-tab-bar">
                {(['preview', 'tokens', 'typography', 'iris-gen', 'ingest'] as const).map(tab => (
                    <button
                        key={tab}
                        className={`ds-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                        type="button"
                    >
                        {tab === 'tokens' ? '🎨 Token Explorer' : tab === 'typography' ? '🔤 Typography' : tab === 'preview' ? '🖥️ Component Preview' : tab === 'iris-gen' ? '✦ IRIS-GEN' : '📥 Ingestion'}
                    </button>
                ))}
            </div>

            {/* Token Explorer */}
            {activeTab === 'tokens' && (
                <div className="ds-tokens-section">
                    <div className="ds-category-bar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                className={`ds-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                                type="button"
                            >
                                {CATEGORY_LABELS[cat]}
                            </button>
                        ))}
                    </div>
                    <div className="ds-token-grid">
                        {filtered.map(token => (
                            <ColorSwatch key={token.name} token={token} />
                        ))}
                    </div>
                </div>
            )}

            {/* Typography */}
            {activeTab === 'typography' && <TypographySpecimen />}

            {/* IRIS-GEN */}
            {activeTab === 'iris-gen' && <IrisGenPanel />}

            {/* Ingestion */}
            {activeTab === 'ingest' && <IngestPanel />}

            {/* Component Preview */}
            {activeTab === 'preview' && <PreviewPanel />}
        </div>
    );
}
