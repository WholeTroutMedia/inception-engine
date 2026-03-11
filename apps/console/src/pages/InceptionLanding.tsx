/**
 * Inception Landing — W2 (Showcase page built with Nano Banana scroll animation)
 *
 * IE's own landing/marketing page demonstrating the scroll animation pipeline.
 * Hero with 3D agent network visualization, scroll-driven sections, live stats.
 */

import { useEffect, useRef, useState } from 'react';
import './InceptionLanding.css';

const STATS = [
    { value: 40, label: 'Active Agents', suffix: '' },
    { value: 20, label: 'Constitutional Articles', suffix: '' },
    { value: 1895, label: 'Total Sessions', suffix: '+' },
    { value: 97.8, label: 'Success Rate', suffix: '%' },
];

function useCountUp(target: number, duration = 1800) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start: number;
        const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration]);
    return count;
}

function StatCounter({ value, label, suffix }: { value: number; label: string; suffix: string }) {
    const count = useCountUp(value);
    return (
        <div className="landing-stat">
            <div className="landing-stat-value">{count.toLocaleString()}{suffix}</div>
            <div className="landing-stat-label">{label}</div>
        </div>
    );
}

const AGENTS_RING = ['ATHENA', 'VERA', 'IRIS', 'FORGE', 'SCRIBE', 'PRISM', 'KEEPER', 'AURORA'];

function AgentOrbit() {
    const [angle, setAngle] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setAngle(a => a + 0.3), 16);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="landing-orbit-container">
            {/* Core */}
            <div className="landing-core">
                <span className="landing-core-text">GENESIS</span>
                <span className="landing-core-version">v5.0.0</span>
            </div>
            {/* Orbital ring */}
            <div className="landing-ring" />
            {/* Agents */}
            {AGENTS_RING.map((agentId, i) => {
                const theta = (i / AGENTS_RING.length) * 360 + angle;
                const rad = (theta * Math.PI) / 180;
                const r = 140;
                const x = Math.cos(rad) * r;
                const y = Math.sin(rad) * r;
                return (
                    <div
                        key={agentId}
                        className="landing-agent-node"
                        style={{ ['--agent-x' as string]: `${x}px`, ['--agent-y' as string]: `${y}px` }}
                    >
                        {agentId}
                    </div>
                );
            })}
            {/* Connection lines SVG */}
            <svg className="landing-svg" viewBox="-200 -200 400 400">
                {AGENTS_RING.map((_, i) => {
                    const theta = (i / AGENTS_RING.length) * 360 + angle;
                    const rad = (theta * Math.PI) / 180;
                    return (
                        <line
                            key={i}
                            x1={0} y1={0}
                            x2={Math.cos(rad) * 140} y2={Math.sin(rad) * 140}
                            stroke="rgba(255,107,53,0.15)"
                            strokeWidth={0.5}
                        />
                    );
                })}
            </svg>
        </div>
    );
}

export default function InceptionLanding() {
    const heroRef = useRef<HTMLDivElement>(null);
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const parallaxY = scrollY * 0.3;

    return (
        <div className="landing-page">
            {/* Hero */}
            <section className="landing-hero" ref={heroRef}>
                <div className="landing-hero-orb" style={{ ['--parallax-y' as string]: `${parallaxY}px` }} />

                <div className="landing-hero-content">
                    <div className="landing-badge">CREATIVE LIBERATION ENGINE · GENESIS v5.0.0</div>
                    <h1 className="landing-hero-title">
                        The Sovereign<br />
                        <span className="landing-hero-gradient">AI Operating System</span>
                    </h1>
                    <p className="landing-hero-desc">
                        40 constitutional agents. 20 governing articles. Zero vendor lock-in.
                        The first multi-agent framework built for regulated industries.
                    </p>
                    <div className="landing-hero-ctas">
                        <a href="/intake-form" className="landing-cta-primary">⚡ Start with Zero-Day</a>
                        <a href="/blueprints" className="landing-cta-secondary">View Blueprints →</a>
                    </div>
                </div>

                <div className="landing-hero-viz">
                    <AgentOrbit />
                </div>
            </section>

            {/* Stats */}
            <section className="landing-stats-section">
                {STATS.map((stat, i) => (
                    <StatCounter key={i} {...stat} />
                ))}
            </section>

            {/* Feature sections */}
            <section className="landing-feature-section">
                <div className="landing-feature-card">
                    <span className="landing-feature-icon">⚖️</span>
                    <h3 className="landing-feature-title">Constitutional Governance</h3>
                    <p className="landing-feature-desc">20 articles ensure every agent action is auditable, veto-able, and compliant. COMPASS provides real-time constitutional review on every flow invocation.</p>
                </div>
                <div className="landing-feature-card">
                    <span className="landing-feature-icon">🔐</span>
                    <h3 className="landing-feature-title">Agent RBAC</h3>
                    <p className="landing-feature-desc">The first framework with production-safe agent identity. Three tiers (system/operator/restricted) with scoped JWT tokens and a full audit trail.</p>
                </div>
                <div className="landing-feature-card">
                    <span className="landing-feature-icon">🏗️</span>
                    <h3 className="landing-feature-title">Vertical Blueprints</h3>
                    <p className="landing-feature-desc">Pre-configured agent networks for Finance, Healthcare, and Media. Domain-tuned reasoning traces with simulation validation and regulatory compliance checks.</p>
                </div>
                <div className="landing-feature-card">
                    <span className="landing-feature-icon">🏠</span>
                    <h3 className="landing-feature-title">Sovereign Infrastructure</h3>
                    <p className="landing-feature-desc">Self-hosted on private NAS with Forgejo CI/CD. No cloud dependency, no vendor lock-in. Your data stays on your hardware.</p>
                </div>
            </section>

            {/* CTA Section */}
            <section className="landing-cta-section">
                <h2 className="landing-cta-title">Ready to deploy your agent network?</h2>
                <p className="landing-cta-desc">Submit a plain-language brief. Your agent team is assembled in seconds.</p>
                <a href="/intake-form" className="landing-cta-primary large">
                    ⚡ Get Started with Zero-Day
                </a>
            </section>
        </div>
    );
}
