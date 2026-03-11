import { useState } from 'react';
import { motion } from 'framer-motion';

const PROFILES = [
    {
        id: 'creator',
        title: 'Creator / Visionary',
        icon: '◈',
        description: 'I need a creative partner to amplify my ideas.',
        accent: 'text-accent-2',
        bg: 'bg-accent-2/10',
        border: 'border-accent-2/30',
    },
    {
        id: 'developer',
        title: 'Software Developer',
        icon: '⬢',
        description: 'I need an autonomous coding sidekick.',
        accent: 'text-accent-1',
        bg: 'bg-accent-1/10',
        border: 'border-accent-1/30',
    },
    {
        id: 'founder',
        title: 'Founder / Operator',
        icon: '⬡',
        description: 'I need a system to run my business operations.',
        accent: 'text-accent-3',
        bg: 'bg-accent-3/10',
        border: 'border-accent-3/30',
    },
];

const INTERESTS = [
    'React', 'Generative UI', 'Creative Coding', 'Design Systems',
    'Vector Graphics', 'Video Generation', '3D / WebGL', 'Agents',
    'Orchestration', 'Hardware', 'Product Strategy', 'Growth'
];

export const IdentityProfile = ({ onComplete }: { onComplete: () => void }) => {
    const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    const toggleInterest = (interest: string) => {
        setSelectedInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] px-6 relative z-10"
        >
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight text-chalk mb-3">How do you operate?</h2>
                <p className="text-text-secondary text-sm">Select your primary role. The engine will adapt its UI and capabilities to match.</p>
            </div>

            {/* Profiles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 w-full max-w-3xl">
                {PROFILES.map((profile) => (
                    <motion.button
                        key={profile.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedProfile(profile.id)}
                        className={`
              relative p-6 rounded-2xl border text-left flex flex-col items-start gap-4 transition-all duration-300
              ${selectedProfile === profile.id
                                ? `${profile.bg} ${profile.border} ${profile.accent} shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-1 ring-inset ring-chalk-faint`
                                : 'bg-bg-card border-border-default hover:bg-bg-hover hover:border-border-strong text-chalk'}
            `}
                    >
                        <div className={`text-2xl ${selectedProfile === profile.id ? profile.accent : 'text-text-secondary'}`}>
                            {profile.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold mb-1">{profile.title}</h3>
                            <p className={`text-xs ${selectedProfile === profile.id ? 'text-chalk-dim' : 'text-text-tertiary'}`}>
                                {profile.description}
                            </p>
                        </div>

                        {/* Selection Glow */}
                        {selectedProfile === profile.id && (
                            <motion.div
                                layoutId="profile-select-glow"
                                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"
                            />
                        )}
                    </motion.button>
                ))}
            </div>

            {/* Interests Cloud */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: selectedProfile ? 1 : 0.3 }}
                className="w-full max-w-2xl text-center"
            >
                <h3 className="text-sm font-semibold text-chalk mb-6 uppercase tracking-widest">Select relevant interests</h3>
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                    {INTERESTS.map((interest) => (
                        <button
                            key={interest}
                            onClick={() => toggleInterest(interest)}
                            disabled={!selectedProfile}
                            className={`
                px-4 py-2 rounded-full text-xs font-medium transition-all duration-300
                ${selectedInterests.includes(interest)
                                    ? 'bg-chalk text-void shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                    : 'bg-bg-elevated text-text-secondary border border-border-default hover:border-border-strong'}
                ${!selectedProfile && 'opacity-50 cursor-not-allowed'}
              `}
                        >
                            {interest}
                        </button>
                    ))}
                </div>

                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: selectedProfile ? 1 : 0, y: selectedProfile ? 0 : 10 }}
                    onClick={onComplete}
                    disabled={!selectedProfile}
                    className="group relative inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-chalk text-void font-bold text-sm tracking-wide transition-all hover:scale-105 active:scale-95 disabled:opacity-0"
                >
                    Initialize Engine Core
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                    <div className="absolute inset-0 rounded-xl bg-white blur-xl opacity-20 group-hover:opacity-40 transition-opacity -z-10" />
                </motion.button>
            </motion.div>
        </motion.div>
    );
};
