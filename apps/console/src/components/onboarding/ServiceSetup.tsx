import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CLOUD_SERVICES = [
    { id: 'gemini', name: 'Google Gemini', provider: 'Google', type: 'Cloud', reqs: 'API Key', icon: '✦', color: 'var(--accent-1)' },
    { id: 'openai', name: 'OpenAI GPT-4o', provider: 'OpenAI', type: 'Cloud', reqs: 'API Key', icon: '⬡', color: 'var(--accent-2)' },
    { id: 'anthropic', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', type: 'Cloud', reqs: 'API Key', icon: '◈', color: 'var(--accent-3)' },
];

const LOCAL_SERVICES = [
    { id: 'ollama', name: 'Ollama (Local)', provider: 'LocalHost', type: 'Local', reqs: '>16GB RAM', icon: '🦙', color: 'var(--chalk)' },
];

export const ServiceSetup = ({ onComplete }: { onComplete: () => void }) => {
    const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');
    const [keys, setKeys] = useState<Record<string, string>>({});
    const [checking, setChecking] = useState<Record<string, boolean>>({});
    const [validated, setValidated] = useState<Record<string, boolean>>({});

    const handleKeyChange = (id: string, val: string) => {
        setKeys(prev => ({ ...prev, [id]: val }));
        setValidated(prev => ({ ...prev, [id]: false }));
    };

    const validateKey = (id: string) => {
        setChecking(prev => ({ ...prev, [id]: true }));
        // Simulate validation delay
        setTimeout(() => {
            setChecking(prev => ({ ...prev, [id]: false }));
            if (keys[id]?.length > 10) {
                setValidated(prev => ({ ...prev, [id]: true }));
            }
        }, 1500);
    };

    const services = activeTab === 'cloud' ? CLOUD_SERVICES : LOCAL_SERVICES;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="w-full max-w-3xl mx-auto flex flex-col min-h-[80vh] px-6 py-12 relative z-10"
        >
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold tracking-tight text-chalk mb-3">Connect Neural Pathways</h2>
                <p className="text-text-secondary text-sm">Select and configure the AI providers for the Creative Liberation Engine.</p>
            </div>

            <div className="flex justify-center gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('cloud')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'cloud' ? 'bg-chalk text-void shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-bg-elevated text-text-secondary hover:text-chalk'
                        }`}
                >
                    Cloud Services
                </button>
                <button
                    onClick={() => setActiveTab('local')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'local' ? 'bg-chalk text-void shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-bg-elevated text-text-secondary hover:text-chalk'
                        }`}
                >
                    Local Models
                </button>
            </div>

            <div className="space-y-4 mb-12 flex-1">
                <AnimatePresence mode="popLayout">
                    {services.map((svc) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            key={svc.id}
                            className="bg-bg-card border border-border-default rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center hover:border-border-strong transition-colors"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-void font-bold shadow-lg svc-icon"
                                    ref={el => { if (el) el.style.setProperty('--svc-color', svc.color); }}
                                >
                                    {svc.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-chalk text-sm">{svc.name}</h3>
                                    <p className="text-xs text-text-tertiary">{svc.provider} · <span className="text-accent-3">{svc.reqs}</span></p>
                                </div>
                            </div>

                            {activeTab === 'cloud' && (
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-64">
                                        <input
                                            type="password"
                                            placeholder="Enter API Key"
                                            value={keys[svc.id] || ''}
                                            onChange={(e) => handleKeyChange(svc.id, e.target.value)}
                                            className={`
                        w-full bg-bg-elevated border rounded-lg px-4 py-2 text-sm text-chalk outline-none focus:ring-1 transition-all
                        ${validated[svc.id] ? 'border-accent-1 focus:ring-accent-1' : 'border-border-default focus:border-border-strong'}
                      `}
                                        />
                                        {validated[svc.id] && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-1 text-xs font-bold">✓</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => validateKey(svc.id)}
                                        disabled={!keys[svc.id] || checking[svc.id] || validated[svc.id]}
                                        className="px-4 py-2 rounded-lg bg-bg-hover text-chalk-dim text-xs font-medium hover:bg-bg-active hover:text-chalk disabled:opacity-50 transition-colors w-24 flex justify-center"
                                    >
                                        {checking[svc.id] ? <span className="animate-spin">◎</span> : validated[svc.id] ? 'Active' : 'Verify'}
                                    </button>
                                </div>
                            )}

                            {activeTab === 'local' && (
                                <button className="px-5 py-2 rounded-lg bg-bg-elevated border border-border-default text-chalk-dim text-xs font-medium hover:text-chalk hover:border-border-strong transition-colors min-w-[120px]">
                                    Check Daemon
                                </button>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="flex justify-between items-center border-t border-border-default pt-6">
                <p className="text-xs text-text-tertiary">Keys are encrypted and stored locally. They never leave your machine.</p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onComplete}
                    className="px-8 py-3 rounded-xl bg-chalk text-void font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all"
                >
                    Boot Systems →
                </motion.button>
            </div>
        </motion.div>
    );
};
