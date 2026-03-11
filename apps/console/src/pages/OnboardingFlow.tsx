import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { AmbientBackground } from '../components/onboarding/AmbientBackground';
import { InfoBar } from '../components/onboarding/InfoBar';
import { WelcomeScreen } from '../components/onboarding/WelcomeScreen';
import { IdentityProfile } from '../components/onboarding/IdentityProfile';
import { ComfortLevel } from '../components/onboarding/ComfortLevel';
import { ServiceSetup } from '../components/onboarding/ServiceSetup';
import { StarterMission } from '../components/onboarding/StarterMission';
import { useNavigate } from 'react-router-dom';

export default function OnboardingFlow() {
    const [step, setStep] = useState(0);
    const navigate = useNavigate();

    // Auto-advance Welcome Screen after 4 seconds
    if (step === 0) {
        setTimeout(() => {
            setStep(1);
        }, 4000);
    }

    return (
        <div className="min-h-screen text-chalk font-sans antialiased overflow-hidden selection:bg-accent-1/30 relative">
            <AmbientBackground />

            <AnimatePresence mode="wait">
                {step === 0 && (
                    <motion.div key="welcome" exit={{ opacity: 0, filter: 'blur(20px)' }} transition={{ duration: 1.5 }}>
                        <WelcomeScreen />
                    </motion.div>
                )}

                {step === 1 && (
                    <motion.div key="profile" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 1, delay: 0.5 }}>
                        <IdentityProfile onComplete={() => setStep(2)} />
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div key="comfort" exit={{ opacity: 0, x: -50 }}>
                        <ComfortLevel onComplete={() => setStep(3)} />
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div key="services" exit={{ opacity: 0, x: -50 }}>
                        <ServiceSetup onComplete={() => setStep(4)} />
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div key="mission" exit={{ opacity: 0, scale: 0.9 }}>
                        <StarterMission onComplete={() => navigate('/nexus')} />
                    </motion.div>
                )}

            </AnimatePresence>

            <InfoBar />
        </div>
    );
}
