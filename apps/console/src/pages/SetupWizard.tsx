/**
 * SetupWizard — First-Run Phase 4
 * T20260306-610: Service Setup Wizard & API Key Manager
 *
 * Guides the user through configuring their API keys and service connections
 * after the ServiceScanner has mapped the GENESIS stack.
 */

import { useState } from 'react';
import './SetupWizard.css';

interface ApiKeyField {
    id: string;
    label: string;
    provider: string;
    placeholder: string;
    helpUrl: string;
    required: boolean;
    category: 'ai' | 'media' | 'storage' | 'infra';
}

const API_KEY_FIELDS: ApiKeyField[] = [
    // AI Providers
    { id: 'GOOGLE_API_KEY', label: 'Google AI / Gemini', provider: 'google', placeholder: 'AIza...', helpUrl: 'https://aistudio.google.com/app/apikey', required: true, category: 'ai' },
    { id: 'OPENAI_API_KEY', label: 'OpenAI', provider: 'openai', placeholder: 'sk-...', helpUrl: 'https://platform.openai.com/api-keys', required: false, category: 'ai' },
    { id: 'ANTHROPIC_API_KEY', label: 'Anthropic / Claude', provider: 'anthropic', placeholder: 'sk-ant-...', helpUrl: 'https://console.anthropic.com/settings/keys', required: false, category: 'ai' },
    { id: 'PERPLEXITY_API_KEY', label: 'Perplexity Sonar', provider: 'perplexity', placeholder: 'pplx-...', helpUrl: 'https://www.perplexity.ai/settings/api', required: false, category: 'ai' },
    // Media
    { id: 'FAL_KEY', label: 'FAL.ai Media', provider: 'fal', placeholder: 'key-...', helpUrl: 'https://fal.ai/dashboard/keys', required: false, category: 'media' },
    { id: 'REPLICATE_API_TOKEN', label: 'Replicate', provider: 'replicate', placeholder: 'r8_...', helpUrl: 'https://replicate.com/account/api-tokens', required: false, category: 'media' },
    { id: 'ELEVENLABS_API_KEY', label: 'ElevenLabs Voice', provider: 'elevenlabs', placeholder: 'xi-...', helpUrl: 'https://elevenlabs.io/app/settings/api-keys', required: false, category: 'media' },
    // Storage / Infra
    { id: 'STRIPE_SECRET_KEY', label: 'Stripe Payments', provider: 'stripe', placeholder: 'sk_live_...', helpUrl: 'https://dashboard.stripe.com/apikeys', required: false, category: 'storage' },
    { id: 'FIREBASE_API_KEY', label: 'Firebase', provider: 'firebase', placeholder: 'AIza...', helpUrl: 'https://console.firebase.google.com/', required: false, category: 'infra' },
];

const CATEGORY_LABELS: Record<ApiKeyField['category'], string> = {
    ai: '🧠 AI Providers',
    media: '🎬 Generative Media',
    storage: '💳 Payments',
    infra: '🔧 Infrastructure',
};

interface ApiKeyStore {
    [key: string]: string;
}

interface SetupWizardProps {
    onComplete: (keys: ApiKeyStore) => void;
    onBack: () => void;
}

export function SetupWizard({ onComplete, onBack }: SetupWizardProps) {
    const [keys, setKeys] = useState<ApiKeyStore>(() => {
        const saved = localStorage.getItem('ie_api_keys');
        return saved ? (JSON.parse(saved) as ApiKeyStore) : {};
    });
    const [revealed, setRevealed] = useState<Set<string>>(new Set());
    const [activeCategory, setActiveCategory] = useState<ApiKeyField['category']>('ai');
    const [saving, setSaving] = useState(false);

    const handleKeyChange = (id: string, value: string) => {
        setKeys(prev => ({ ...prev, [id]: value }));
    };

    const toggleReveal = (id: string) => {
        setRevealed(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        // Persist to localStorage (encrypted in production via KeyVault)
        localStorage.setItem('ie_api_keys', JSON.stringify(keys));
        // TODO: wire to KeyVault service for secure persistence
        await new Promise(r => setTimeout(r, 600));
        setSaving(false);
        onComplete(keys);
    };

    const categories = Array.from(
        new Set(API_KEY_FIELDS.map(f => f.category))
    ) as ApiKeyField['category'][];

    const currentFields = API_KEY_FIELDS.filter(f => f.category === activeCategory);
    const requiredFilled = API_KEY_FIELDS
        .filter(f => f.required)
        .every(f => keys[f.id]?.trim());

    return (
        <div className="setup-wizard">
            <div className="wizard-header">
                <div className="wizard-icon">🔑</div>
                <h2 className="wizard-title">API Key Setup</h2>
                <p className="wizard-subtitle">
                    Configure your providers — only Google AI is required to launch.
                    All keys are stored locally in your browser.
                </p>
            </div>

            <div className="wizard-tabs">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`wizard-tab ${activeCategory === cat ? 'wizard-tab--active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {CATEGORY_LABELS[cat]}
                    </button>
                ))}
            </div>

            <div className="wizard-fields">
                {currentFields.map(field => {
                    const value = keys[field.id] ?? '';
                    const isSet = value.trim().length > 0;
                    const isVisible = revealed.has(field.id);

                    return (
                        <div key={field.id} className={`wizard-field ${isSet ? 'wizard-field--set' : ''}`}>
                            <div className="wizard-field-header">
                                <label className="wizard-field-label" htmlFor={field.id}>
                                    {field.label}
                                    {field.required && <span className="wizard-required">*</span>}
                                </label>
                                <a
                                    href={field.helpUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="wizard-field-help"
                                >
                                    Get key ↗
                                </a>
                            </div>
                            <div className="wizard-field-input-wrap">
                                <input
                                    id={field.id}
                                    type={isVisible ? 'text' : 'password'}
                                    placeholder={isSet ? '••••••••••••••' : field.placeholder}
                                    value={value}
                                    onChange={e => handleKeyChange(field.id, e.target.value)}
                                    className="wizard-field-input"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <button
                                    type="button"
                                    className="wizard-field-reveal"
                                    onClick={() => toggleReveal(field.id)}
                                    title={isVisible ? 'Hide' : 'Show'}
                                >
                                    {isVisible ? '🙈' : '👁'}
                                </button>
                                {isSet && <span className="wizard-field-check">✓</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!requiredFilled && (
                <div className="wizard-notice">
                    ⚠ Add your Google AI key to unlock the core AI features.
                </div>
            )}

            <div className="wizard-actions">
                <button className="wizard-btn wizard-btn--secondary" onClick={onBack}>
                    Back
                </button>
                <button
                    className="wizard-btn wizard-btn--ghost"
                    onClick={() => onComplete(keys)}
                >
                    Skip for now
                </button>
                <button
                    className="wizard-btn wizard-btn--primary"
                    onClick={() => void handleSave()}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save & Continue →'}
                </button>
            </div>
        </div>
    );
}

export default SetupWizard;
