import { useState } from 'react';
import { motion } from 'framer-motion';

const LEVELS = [
    {
        id: 'guardian',
        title: 'Guardian Tier',
        icon: '🛡️',
        description: 'Requires explicit approval for all actions.',
        details: 'You verify everything. The engine drafts options, but makes no changes without your final say. Best for high-risk production environments.',
        color: 'var(--accent-3)' // Amber
    },
    {
        id: 'copilot',
        title: 'Copilot Tier',
        icon: '🤝',
        description: 'Executes standard tasks, asks for critical ones.',
        details: 'The engine handles scaffolding and routine updates autonomously, but pauses for architectural shifts or destructive actions. The balanced flow.',
        color: 'var(--accent-1)' // Cyan
    },
    {
        id: 'autonomous',
        title: 'Autonomous Tier',
        icon: '⚡',
        description: 'Full sovereign execution capability.',
        details: 'You provide the intent; the engine figures out the plan, executes it, and verifies the result. Highest velocity. Best for exploratory zero-to-one builds.',
        color: 'var(--accent-2)' // Neon Pink
    }
];

export const ComfortLevel = ({ onComplete }: { onComplete: () => void }) => {
    const [level, setLevel] = useState<number>(1); // Default to Copilot

    const selected = LEVELS[level];

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[80vh] px-6 relative z-10"
        >
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tight text-chalk mb-3">Set Autonomy Baseline</h2>
                <p className="text-text-secondary text-sm">How much leash does the engine get? You can change this per-task later.</p>
            </div>

            {/* Interactive Slider Area */}
            <div className="w-full mb-16 relative">
                {/* Track Outline */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-bg-elevated rounded-full overflow-hidden">
                    {/* Active Fill */}
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: selected.color }}
                        animate={{ width: `${(level / 2) * 100}%` }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                </div>

                {/* Nodes */}
                <div className="relative flex justify-between z-10">
                    {LEVELS.map((col, idx) => {
                        const isActive = level === idx;
                        const isPast = level >= idx;
                        return (
                            <div key={col.id} className="flex flex-col items-center">
                                <button
                                    onClick={() => setLevel(idx)}
                                    className={`
                    w-12 h-12 rounded-full border-4 flex items-center justify-center bg-bg-card transition-all duration-300
                    ${isPast ? 'border-transparent' : 'border-bg-elevated'}
                    ${isActive ? 'scale-125 shadow-[0_0_30px_rgba(255,255,255,0.15)] ring-2 ring-white ring-offset-4 ring-offset-void' : 'hover:scale-110'}
                  `}
                                    style={{ borderColor: isPast && !isActive ? col.color : undefined, backgroundColor: isActive ? col.color : undefined }}
                                >
                                    <span className={`text-xl ${isActive ? 'text-void' : 'opacity-50 grayscale'}`}>{col.icon}</span>
                                </button>
                                <span className={`mt-4 font-semibold text-sm transition-colors ${isActive ? 'text-chalk' : 'text-text-tertiary'}`}>
                                    {col.title}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Description readout */}
            <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center bg-bg-card border border-border-default rounded-2xl p-6 w-full mb-12"
            >
                <h4 className="text-lg font-bold mb-2" style={{ color: selected.color }}>{selected.description}</h4>
                <p className="text-text-secondary text-sm leading-relaxed">{selected.details}</p>
            </motion.div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onComplete}
                className="px-8 py-3 rounded-xl bg-chalk text-void font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all"
            >
                Confirm Posture →
            </motion.button>
        </motion.div>
    );
};
