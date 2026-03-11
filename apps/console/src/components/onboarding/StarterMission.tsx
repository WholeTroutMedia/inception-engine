import { motion } from 'framer-motion';

const MISSIONS = [
    {
        id: 'mission-generate',
        title: 'Generate a Genesis Component',
        description: 'Use the Design Agent to scaffold a new UI primitive with tokens.',
        icon: '◈',
        color: 'var(--accent-1)'
    },
    {
        id: 'mission-research',
        title: 'Deep Research Brief',
        description: 'Deploy ATHENA to gather intelligence on recent AI UX patterns.',
        icon: '✦',
        color: 'var(--accent-2)'
    },
    {
        id: 'mission-system',
        title: 'System Health Audit',
        description: 'Run a diagnostic on local containers and active dependencies.',
        icon: '⬢',
        color: 'var(--accent-3)'
    }
];

export const StarterMission = ({ onComplete }: { onComplete: () => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] px-6 relative z-10"
        >
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight text-chalk mb-3">Initiate First Sequence</h2>
                <p className="text-text-secondary text-sm">Select a starter mission to calibrate the engine to your workflow.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 w-full max-w-3xl">
                {MISSIONS.map((mission) => (
                    <motion.button
                        key={mission.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onComplete}
                        className="group relative p-6 rounded-2xl border text-left flex flex-col items-start gap-4 transition-all duration-300 bg-bg-card border-border-default hover:bg-bg-hover hover:border-border-strong text-chalk"
                    >
                        <div className="text-2xl" style={{ color: mission.color }}>
                            {mission.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold mb-1 group-hover:text-chalk transition-colors">{mission.title}</h3>
                            <p className="text-xs text-text-tertiary group-hover:text-text-secondary transition-colors">
                                {mission.description}
                            </p>
                        </div>
                        <motion.div
                            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                    </motion.button>
                ))}
            </div>

            <button
                onClick={onComplete}
                className="text-xs font-semibold uppercase tracking-widest text-text-tertiary hover:text-chalk transition-colors"
            >
                Skip sequence — Proceed to Nexus
            </button>

        </motion.div>
    );
};
