import React from 'react';

export interface SandboxProps {
    mode?: 'isolated' | 'integrated' | 'presentation';
    gradientBackground?: boolean;
    children: React.ReactNode;
}

export const Sandbox: React.FC<SandboxProps> = ({
    mode = 'isolated',
    gradientBackground = false,
    children
}) => {
    // Sandbox UI wrapper
    return (
        <div style={{
            padding: mode === 'presentation' ? '4rem' : '2rem',
            background: gradientBackground
                ? 'linear-gradient(135deg, var(--inc-color-surface-base), var(--inc-color-surface-card))'
                : 'var(--inc-color-surface-base)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: mode === 'presentation' ? 'center' : 'flex-start',
            color: 'var(--inc-color-text-primary)'
        }}>
            {children}
        </div>
    );
};
