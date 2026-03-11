import React, { useEffect, useState } from 'react';

export const Celebration: React.FC<{ score: number }> = ({ score }) => {
    const [celebrate, setCelebrate] = useState(false);

    useEffect(() => {
        if (score >= 90) {
            const t1 = setTimeout(() => setCelebrate(true), 10);
            const t2 = setTimeout(() => setCelebrate(false), 3000);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [score]);

    if (!celebrate) return null;

    return (
        <div className="celebration-overlay">
            🎉 VERA-DESIGN Compliant: {score}/100
        </div>
    );
};
