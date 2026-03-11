import { motion } from 'framer-motion';

export const WelcomeScreen = () => {
    const hour = new Date().getHours();
    let greeting = "Good evening. The best ideas come at night.";
    if (hour < 12) greeting = "Good morning. Let's build something.";
    else if (hour < 18) greeting = "Good afternoon. Ready when you are.";

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center z-10 relative px-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="mb-8"
            >
                {/* IE Logo Node */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent-1 to-accent-2 mx-auto mb-6 shadow-[0_0_40px_rgba(0,229,255,0.4)] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-chalk-faint mix-blend-overlay"></div>
                    <span className="text-void font-bold text-2xl tracking-tighter relative z-10">IE</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-chalk">
                    {greeting}
                </h1>
            </motion.div>
        </div>
    );
};
