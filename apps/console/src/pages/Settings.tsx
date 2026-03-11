import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Settings.css'

/* ── SECTION TYPES ──────────────────────────────────────────── */
interface SettingRow {
    id: string; label: string; desc?: string
    type: 'text' | 'toggle' | 'select' | 'info' | 'action'
    value?: string; options?: string[]; action?: () => void; danger?: boolean
}

/* ── Helper to get/set localStorage preferences ───────────── */
const PREF = (k: string) => `ie_pref_${k}`
const getPref = (k: string, def: string) => localStorage.getItem(PREF(k)) ?? def
const setPref = (k: string, v: string) => localStorage.setItem(PREF(k), v)

/** Inject a CSS custom property --c-accent for section-level theming. */
const accentStyle = (color: string): React.CSSProperties =>
    ({ ['--c-accent' as string]: color } as React.CSSProperties)

export default function Settings() {
    const navigate = useNavigate()
    const [saved, setSaved] = useState<Record<string, boolean>>({})
    const [drafts, setDrafts] = useState<Record<string, string>>({
        genkitUrl: getPref('genkitUrl', 'http://localhost:4000'),
        gatewayUrl: getPref('gatewayUrl', 'http://localhost:8080'),
        theme: getPref('theme', 'default'),
        density: getPref('density', 'comfortable'),
        animations: getPref('animations', 'on'),
        telemetry: getPref('telemetry', 'off'),
    })

    const flash = (id: string) => {
        setSaved(prev => ({ ...prev, [id]: true }))
        setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 1800)
    }

    const save = (id: string, val: string) => {
        setDrafts(prev => ({ ...prev, [id]: val }))
        setPref(id, val)
        flash(id)
    }

    const SECTIONS: { title: string; color: string; rows: SettingRow[] }[] = [
        {
            title: 'System', color: '#F5A524',
            rows: [
                { id: 'version', label: 'Engine Version', type: 'info', value: 'v5.0.0 GENESIS' },
                { id: 'build', label: 'Build', type: 'info', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                { id: 'node', label: 'Runtime', type: 'info', value: 'Node.js + Vite 7 · React 19' },
                { id: 'stack', label: 'Stack', type: 'info', value: 'TypeScript · Genkit · ChromaDB · Docker' },
            ],
        },
        {
            title: 'Endpoints', color: '#4285F4',
            rows: [
                { id: 'genkitUrl', label: 'Genkit Service URL', type: 'text', desc: 'Primary AI orchestration endpoint', value: drafts.genkitUrl },
                { id: 'gatewayUrl', label: 'Gateway URL', type: 'text', desc: 'Nginx gateway (local or NAS)', value: drafts.gatewayUrl },
            ],
        },
        {
            title: 'Appearance', color: '#9B72CF',
            rows: [
                { id: 'theme', label: 'Theme', type: 'select', options: ['default', 'tron', 'north-fork'], value: drafts.theme },
                { id: 'density', label: 'Density', type: 'select', options: ['compact', 'comfortable', 'spacious'], value: drafts.density },
                { id: 'animations', label: 'Animations', type: 'select', options: ['on', 'reduced', 'off'], value: drafts.animations },
            ],
        },
        {
            title: 'Developer', color: '#22c55e',
            rows: [
                { id: 'telemetry', label: 'Console Telemetry', type: 'select', desc: 'Log agent calls to browser console', options: ['on', 'off'], value: drafts.telemetry },
                { id: 'clearCache', label: 'Clear Vite Cache', type: 'action', desc: 'Forces a full module reload on next launch', action: () => { sessionStorage.clear(); flash('clearCache') } },
                { id: 'keyVault', label: 'Manage API Keys', type: 'action', desc: 'Open the full Key Vault', action: () => navigate('/keys') },
            ],
        },
        {
            title: 'Danger Zone', color: '#ef4444',
            rows: [
                {
                    id: 'clearKeys', label: 'Clear All API Keys', type: 'action', desc: 'Removes all provider keys from localStorage', danger: true,
                    action: () => {
                        if (!window.confirm('Clear all API keys? This cannot be undone.')) return
                        Object.keys(localStorage).filter(k => k.startsWith('ie_key_')).forEach(k => localStorage.removeItem(k))
                        flash('clearKeys')
                    }
                },
                {
                    id: 'clearPrefs', label: 'Reset All Preferences', type: 'action', desc: 'Resets all settings to defaults', danger: true,
                    action: () => {
                        if (!window.confirm('Reset all preferences to defaults?')) return
                        Object.keys(localStorage).filter(k => k.startsWith('ie_pref_')).forEach(k => localStorage.removeItem(k))
                        window.location.reload()
                    }
                },
            ],
        },
    ]

    return (
        <div className="settings-container">

            {/* Header */}
            <div className="settings-header">
                <div className="settings-header-label">SETTINGS</div>
                <h1 className="settings-header-title">System Configuration</h1>
                <p className="settings-header-desc">All preferences are local. Nothing leaves your machine.</p>
            </div>

            {/* Sections */}
            <div className="settings-content">
                {SECTIONS.map(section => (
                    <div key={section.title} style={accentStyle(section.color)}>
                        {/* Section header */}
                        <div className="settings-section-header">
                            <span className="settings-section-indicator" />
                            <span className="settings-section-title">{section.title.toUpperCase()}</span>
                        </div>

                        {/* Rows */}
                        <div className="settings-rows">
                            {section.rows.map(row => (
                                <div key={row.id} className="settings-row">
                                    <div>
                                        <div className={`settings-row-label${row.danger ? ' danger' : ''}`}>{row.label}</div>
                                        {row.desc && <div className="settings-row-desc">{row.desc}</div>}
                                    </div>

                                    <div className="settings-row-controls">
                                        {row.type === 'info' && (
                                            <span className="settings-info-text">{row.value}</span>
                                        )}

                                        {row.type === 'text' && (
                                            <div className="settings-text-input-wrapper">
                                                <input
                                                    title={row.label ?? 'Setting value'}
                                                    placeholder="Enter value..."
                                                    value={drafts[row.id] ?? row.value ?? ''}
                                                    onChange={e => setDrafts(prev => ({ ...prev, [row.id]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter') save(row.id, drafts[row.id] ?? '') }}
                                                    className="settings-text-input"
                                                />
                                                <button onClick={() => save(row.id, drafts[row.id] ?? '')} className={`settings-button-save${saved[row.id] ? ' saved' : ''}`}>
                                                    {saved[row.id] ? '✓' : 'Save'}
                                                </button>
                                            </div>
                                        )}

                                        {row.type === 'select' && (
                                            <div className="settings-select-wrapper">
                                                {(row.options ?? []).map(opt => (
                                                    <button key={opt} onClick={() => save(row.id, opt)} className={`settings-select-button${(drafts[row.id] ?? row.value) === opt ? ' active' : ''}`}>{opt}</button>
                                                ))}
                                            </div>
                                        )}

                                        {row.type === 'action' && (
                                            <button onClick={row.action} className={`settings-action-button${saved[row.id] ? ' saved' : ''}${row.danger ? ' danger' : ''}`}>{saved[row.id] ? '✓ Done' : row.label}</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
