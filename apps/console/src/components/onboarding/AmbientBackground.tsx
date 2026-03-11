import { motion } from 'framer-motion';

export const AmbientBackground = () => {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-void">
            {/* Background base */}
            <div className="absolute inset-0 bg-primary opacity-80" />

            {/* Aurora glow blobs */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.15, 0.25, 0.15],
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-accent-1 rounded-full mix-blend-screen filter blur-[100px]"
            />

            <motion.div
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.1, 0.2, 0.1],
                    x: [0, -100, 0],
                    y: [0, 100, 0],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-accent-2 rounded-full mix-blend-screen filter blur-[120px]"
            />

            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.1, 0.2, 0.1],
                    x: [0, 50, 0],
                    y: [0, 50, 0],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
                className="absolute top-[40%] left-[30%] w-[40vw] h-[40vh] bg-accent-3 rounded-full mix-blend-screen filter blur-[90px]"
            />

            {/* Subtle overlay to add texture/noise */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')" }} />
        </div>
    );
};
