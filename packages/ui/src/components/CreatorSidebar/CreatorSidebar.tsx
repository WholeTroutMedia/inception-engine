// packages/ui/src/components/CreatorSidebar/CreatorSidebar.tsx
// TOOL-04: Creator Productivity Sidebar — quick-access toolbox utilities
// Uses Warm Trichromatic + Creative Liberation Engine design tokens throughout.

import * as React from 'react';
import { clsx } from 'clsx';
import { Card } from '../Card/Card.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type CreatorTool =
    | 'palette'
    | 'contrast'
    | 'slugify'
    | 'base64'
    | 'mime'
    | 'audio-duration'
    | 'password-strength'
    | 'mask-secret';

export interface CreatorSidebarProps {
    /** Sidebar is open (controlled) */
    open: boolean;
    /** Callback to close the sidebar */
    onClose: () => void;
    /** Initially active tool tab */
    defaultTool?: CreatorTool;
    /** Extra classNames on the root element */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL REGISTRY (no-op stubs; wired to mcp-tools at runtime)
// ─────────────────────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<CreatorTool, { icon: string; label: string }> = {
    palette: { icon: '🎨', label: 'Palette' },
    contrast: { icon: '⚖️', label: 'Contrast' },
    slugify: { icon: '🔗', label: 'Slugify' },
    base64: { icon: '🔐', label: 'Base64' },
    mime: { icon: '📄', label: 'MIME Type' },
    'audio-duration': { icon: '🎵', label: 'Audio Duration' },
    'password-strength': { icon: '🔒', label: 'Password' },
    'mask-secret': { icon: '🛡️', label: 'Mask Secret' },
};

// ─────────────────────────────────────────────────────────────────────────────
// PANEL COMPONENTS (individual tool panes)
// ─────────────────────────────────────────────────────────────────────────────

const PalettePanel: React.FC = () => {
    const [hex, setHex] = React.useState('#e85d04');
    const [swatches, setSwatches] = React.useState<Record<string, string>>({});

    const handleGenerate = () => {
        // Client-side stub — calls generateTonalPalette via rpc
        const resp = fetch('/api/toolbox/palette', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ baseHex: hex }),
        }).then(r => r.json()).then((d: Record<string, string>) => setSwatches(d));
        void resp;
    };

    return (
        <div className="cs-panel">
            <p className="cs-label">Base Color</p>
            <div className="cs-row">
                <input type="color" value={hex} onChange={e => setHex(e.target.value)} className="cs-color-picker" />
                <input type="text" value={hex} onChange={e => setHex(e.target.value)} className="cs-text-input" />
                <button className="cs-btn-primary" onClick={handleGenerate}>Generate</button>
            </div>
            {Object.keys(swatches).length > 0 && (
                <div className="cs-swatches">
                    {Object.entries(swatches).map(([shade, color]) => (
                        <div key={shade} className="cs-swatch" style={{ backgroundColor: color }} title={`${shade}: ${color}`}>
                            <span className="cs-swatch-label">{shade}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ContrastPanel: React.FC = () => {
    const [fg, setFg] = React.useState('#ffffff');
    const [bg, setBg] = React.useState('#1a1a2e');
    const [result, setResult] = React.useState<{ ratio: number; meetsAA: boolean } | null>(null);

    const handleCheck = () => {
        void fetch('/api/toolbox/contrast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hex1: fg, hex2: bg }),
        }).then(r => r.json()).then(setResult);
    };

    return (
        <div className="cs-panel">
            <p className="cs-label">Foreground & Background</p>
            <div className="cs-row">
                <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="cs-color-picker" />
                <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="cs-color-picker" />
                <button className="cs-btn-primary" onClick={handleCheck}>Check</button>
            </div>
            {result && (
                <div className={clsx('cs-result', result.meetsAA ? 'cs-result--pass' : 'cs-result--fail')}>
                    <span className="cs-result-ratio">{result.ratio.toFixed(2)}:1</span>
                    <span className="cs-result-badge">{result.meetsAA ? '✓ AA Pass' : '✗ AA Fail'}</span>
                </div>
            )}
            {result && (
                <div className="cs-preview" style={{ backgroundColor: bg, color: fg, padding: '12px', borderRadius: '8px' }}>
                    The quick brown fox jumped over the lazy dog.
                </div>
            )}
        </div>
    );
};

const SlugifyPanel: React.FC = () => {
    const [input, setInput] = React.useState('');
    const [slug, setSlug] = React.useState('');

    const handleSlugify = () => {
        void fetch('/api/toolbox/slugify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ str: input }),
        }).then(r => r.json()).then((d: { slug: string }) => setSlug(d.slug));
    };

    const handleCopy = () => void navigator.clipboard.writeText(slug);

    return (
        <div className="cs-panel">
            <p className="cs-label">Input String</p>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} className="cs-text-input" placeholder="My awesome API title..." />
            <button className="cs-btn-primary" onClick={handleSlugify}>Slugify</button>
            {slug && (
                <div className="cs-output-row">
                    <code className="cs-code">{slug}</code>
                    <button className="cs-btn-ghost" onClick={handleCopy}>Copy</button>
                </div>
            )}
        </div>
    );
};

const Base64Panel: React.FC = () => {
    const [input, setInput] = React.useState('');
    const [output, setOutput] = React.useState<{ base64: string; base64url: string } | null>(null);

    const handleEncode = () => {
        void fetch('/api/toolbox/base64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input }),
        }).then(r => r.json()).then(setOutput);
    };

    return (
        <div className="cs-panel">
            <p className="cs-label">String to Encode</p>
            <textarea value={input} onChange={e => setInput(e.target.value)} className="cs-textarea" rows={3} placeholder="Enter text..." />
            <button className="cs-btn-primary" onClick={handleEncode}>Encode</button>
            {output && (
                <>
                    <p className="cs-label cs-mt">Standard Base64</p>
                    <code className="cs-code cs-break">{output.base64}</code>
                    <p className="cs-label cs-mt">URL-Safe Base64</p>
                    <code className="cs-code cs-break">{output.base64url}</code>
                </>
            )}
        </div>
    );
};

const MimePanel: React.FC = () => {
    const [filename, setFilename] = React.useState('');
    const [mime, setMime] = React.useState('');

    const handleDetect = () => {
        void fetch('/api/toolbox/mime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename }),
        }).then(r => r.json()).then((d: { mimeType: string }) => setMime(d.mimeType));
    };

    return (
        <div className="cs-panel">
            <p className="cs-label">Filename</p>
            <input type="text" value={filename} onChange={e => setFilename(e.target.value)} className="cs-text-input" placeholder="example.mp4" />
            <button className="cs-btn-primary" onClick={handleDetect}>Detect MIME</button>
            {mime && <code className="cs-code cs-mt">{mime}</code>}
        </div>
    );
};

const PasswordPanel: React.FC = () => {
    const [password, setPassword] = React.useState('');
    const [result, setResult] = React.useState<{ score: number; label: string; entropy: number; suggestions: string[] } | null>(null);

    const SCORE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

    const handleCheck = () => {
        void fetch('/api/toolbox/password-strength', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        }).then(r => r.json()).then(setResult);
    };

    return (
        <div className="cs-panel">
            <p className="cs-label">Password</p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="cs-text-input" placeholder="Enter password..." autoComplete="new-password" />
            <button className="cs-btn-primary" onClick={handleCheck}>Analyze</button>
            {result && (
                <div className="cs-password-result">
                    <div className="cs-strength-bar">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="cs-strength-seg" style={{ backgroundColor: i <= result.score ? SCORE_COLORS[result.score] : 'var(--inc-color-border-default)' }} />
                        ))}
                    </div>
                    <div className="cs-row">
                        <span className="cs-result-badge" style={{ backgroundColor: SCORE_COLORS[result.score] }}>{result.label}</span>
                        <span className="cs-label">{result.entropy.toFixed(1)} bits</span>
                    </div>
                    {result.suggestions.length > 0 && (
                        <ul className="cs-suggestions">
                            {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

const AudioDurationPanel: React.FC = () => {
    const [durationRaw, setDurationRaw] = React.useState('');
    const [result, setResult] = React.useState<{ seconds: number; formatted: string } | null>(null);

    const handleParse = () => {
        void fetch('/api/toolbox/audio-duration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration: durationRaw }),
        }).then(r => r.json()).then(setResult);
    };

    return (
        <div className="cs-panel">
            <p className="cs-label">Raw Duration String</p>
            <input type="text" value={durationRaw} onChange={e => setDurationRaw(e.target.value)} className="cs-text-input" placeholder="00:03:24.500" />
            <button className="cs-btn-primary" onClick={handleParse}>Parse</button>
            {result && (
                <div className="cs-result cs-result--pass">
                    <span className="cs-result-ratio">{result.formatted}</span>
                    <span className="cs-result-badge">{result.seconds.toFixed(2)} s</span>
                </div>
            )}
        </div>
    );
};

const MaskSecretPanel: React.FC = () => {
    const [secret, setSecret] = React.useState('');
    const [result, setResult] = React.useState<{ masked: string } | null>(null);

    const handleMask = () => {
        void fetch('/api/toolbox/mask-secret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret }),
        }).then(r => r.json()).then(setResult);
    };

    const handleCopy = () => {
        if (result) void navigator.clipboard.writeText(result.masked);
    };

    return (
        <div className="cs-panel">
            <p className="cs-label">Secret to Mask</p>
            <input type="text" value={secret} onChange={e => setSecret(e.target.value)} className="cs-text-input" placeholder="sk-1234..." />
            <button className="cs-btn-primary" onClick={handleMask}>Mask</button>
            {result && (
                <div className="cs-output-row">
                    <code className="cs-code">{result.masked}</code>
                    <button className="cs-btn-ghost" onClick={handleCopy}>Copy</button>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOOL PANEL MAP
// ─────────────────────────────────────────────────────────────────────────────

const PANEL_MAP: Partial<Record<CreatorTool, React.FC>> = {
    palette: PalettePanel,
    contrast: ContrastPanel,
    slugify: SlugifyPanel,
    base64: Base64Panel,
    mime: MimePanel,
    'password-strength': PasswordPanel,
    'audio-duration': AudioDurationPanel,
    'mask-secret': MaskSecretPanel,
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR SIDEBAR ROOT
// ─────────────────────────────────────────────────────────────────────────────

export const CreatorSidebar: React.FC<CreatorSidebarProps> = ({
    open,
    onClose,
    defaultTool = 'palette',
    className,
}) => {
    const [activeTool, setActiveTool] = React.useState<CreatorTool>(defaultTool);
    const ActivePanel = PANEL_MAP[activeTool] ?? PalettePanel;
    const tools = Object.keys(TOOL_LABELS) as CreatorTool[];

    // Close on Escape
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (open) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    return (
        <aside
            className={clsx(
                'cs-root',
                open ? 'cs-root--open' : 'cs-root--closed',
                className
            )}
            aria-label="Creator Toolbox"
            aria-hidden={!open}
            role="complementary"
        >
            {/* Header */}
            <div className="cs-header">
                <div className="cs-header-title">
                    <span className="cs-header-icon">🛠</span>
                    <span>Creator Toolbox</span>
                </div>
                <button className="cs-close-btn" onClick={onClose} aria-label="Close toolbox">✕</button>
            </div>

            {/* Tab Bar */}
            <div className="cs-tabs" role="tablist" aria-label="Toolbox sections">
                {tools.map(tool => (
                    <button
                        key={tool}
                        role="tab"
                        aria-selected={activeTool === tool}
                        onClick={() => setActiveTool(tool)}
                        className={clsx('cs-tab', activeTool === tool && 'cs-tab--active')}
                        title={TOOL_LABELS[tool].label}
                    >
                        {TOOL_LABELS[tool].icon}
                    </button>
                ))}
            </div>

            {/* Active Panel */}
            <div className="cs-panel-wrapper" role="tabpanel">
                <Card padding="md" shadow="none" className="cs-panel-card">
                    <p className="cs-panel-heading">{TOOL_LABELS[activeTool].label}</p>
                    <ActivePanel />
                </Card>
            </div>
        </aside>
    );
};

CreatorSidebar.displayName = 'CreatorSidebar';
