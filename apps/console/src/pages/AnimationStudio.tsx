/**
 * Animation Studio — W2 (Nano Banana 2 Scroll Pipeline)
 *
 * Console page for generating scroll-driven animations via the pipeline.
 * Connects to POST /genmedia/scroll-animation.
 */

import { useState, useCallback } from 'react';
import './AnimationStudio.css';

interface PipelineJob {
    id: string;
    status: 'idle' | 'running' | 'complete' | 'error';
    prompt: string;
    progress: number;
    currentStep: string;
    manifest?: {
        id: string;
        totalFrames: number;
        sections: { index: number; frameCount: number; videoUrl?: string }[];
        mock: boolean;
    };
    error?: string;
}

const GENKIT_BASE = import.meta.env.VITE_GENKIT_URL ?? 'http://localhost:4100';

export default function AnimationStudio() {
    const [prompt, setPrompt] = useState('A futuristic AI command center with glowing neural networks');
    const [sectionCount, setSectionCount] = useState(6);
    const [fps, setFps] = useState(24);
    const [style, setStyle] = useState<'cinematic' | 'geometric' | 'organic' | 'tech'>('cinematic');
    const [job, setJob] = useState<PipelineJob | null>(null);
    const [embedCode, setEmbedCode] = useState('');

    const startPipeline = useCallback(async () => {
        const newJob: PipelineJob = {
            id: `job-${Date.now()}`,
            status: 'running',
            prompt,
            progress: 0,
            currentStep: 'Generating keyframes with Nano Banana 2...',
        };
        setJob(newJob);
        setEmbedCode('');

        try {
            const response = await fetch(`${GENKIT_BASE}/genmedia/scroll-animation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, sectionCount, fps, style }),
            });

            if (!response.ok) {
                throw new Error(`Pipeline error: ${response.status}`);
            }

            const manifest = await response.json();
            setJob(prev => prev ? {
                ...prev,
                status: 'complete',
                progress: 100,
                currentStep: 'Complete',
                manifest,
            } : null);

            // Generate embed code
            setEmbedCode(`<div class="scroll-animation" data-manifest="${manifest.id}" style="--scroll-sections:${sectionCount}"></div>\n<script src="/genmedia/player.js"></script>`);
        } catch (err) {
            setJob(prev => prev ? {
                ...prev,
                status: 'error',
                error: err instanceof Error ? err.message : 'Unknown error',
            } : null);
        }
    }, [prompt, sectionCount, fps, style]);

    return (
        <div className="container">
            <div className="header">
                <h1 className="title">
                    <span className="titleAccent">⬡</span> Animation Studio
                    <span className="badge">NANO BANANA 2</span>
                </h1>
                <p className="subtitle">Generate scroll-driven 3D animations from a text prompt</p>
            </div>

            <div className="layout">
                {/* Config Panel */}
                <div className="configPanel">
                    <h2 className="panelTitle">Configuration</h2>

                    <div className="field">
                        <label className="label">Prompt</label>
                        <textarea
                            className="textarea"
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            rows={4}
                            placeholder="Describe your animation..."
                            title="Describe your animation"
                        />
                    </div>

                    <div className="row">
                        <div className="field">
                            <label className="label">Scroll Sections</label>
                            <div className="sliderRow">
                                <input
                                    type="range" min={2} max={12} value={sectionCount}
                                    onChange={e => setSectionCount(Number(e.target.value))}
                                    className="slider"
                                    title="Scroll Sections Slider"
                                    aria-label="Number of scroll sections"
                                />
                                <span className="sliderValue">{sectionCount}</span>
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Frame Rate (FPS)</label>
                            <div className="sliderRow">
                                <input
                                    type="range" min={12} max={60} step={6} value={fps}
                                    onChange={e => setFps(Number(e.target.value))}
                                    className="slider"
                                    title="Frame Rate Slider"
                                    aria-label="Frames per second"
                                />
                                <span className="sliderValue">{fps}</span>
                            </div>
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Visual Style</label>
                        <div className="styleGrid">
                            {(['cinematic', 'geometric', 'organic', 'tech'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStyle(s)}
                                    className={`styleBtn ${style === s ? 'styleBtnActive' : ''}`}
                                >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={startPipeline}
                        disabled={job?.status === 'running'}
                        className="generateBtn"
                    >
                        {job?.status === 'running' ? '⟳ Generating...' : '▶ Generate Animation'}
                    </button>
                </div>

                {/* Status Panel */}
                <div className="statusPanel">
                    <h2 className="panelTitle">Pipeline Status</h2>

                    {!job && (
                        <div className="emptyState">
                            <span className="emptyIcon">🎬</span>
                            <p>Configure and generate your animation</p>
                        </div>
                    )}

                    {job && (
                        <div className="jobCard">
                            <div className="jobHeader">
                                <span className={`statusDot statusDot${job.status.charAt(0).toUpperCase() + job.status.slice(1)}`} />
                                <span className="jobStatus">{job.status.toUpperCase()}</span>
                                {job.manifest?.mock && <span className="mockBadge">MOCK MODE</span>}
                            </div>

                            <p className="jobStep">{job.error ?? job.currentStep}</p>

                            <div className="progressBar">
                                <div className="progressFill" style={{ ['--progress' as string]: `${job.progress}%` }} />
                            </div>

                            {job.manifest && (
                                <div className="manifestInfo">
                                    <div className="statRow">
                                        <span className="statLabel">Sections</span>
                                        <span className="statValue">{job.manifest.sections.length}</span>
                                    </div>
                                    <div className="statRow">
                                        <span className="statLabel">Total Frames</span>
                                        <span className="statValue">{job.manifest.totalFrames}</span>
                                    </div>
                                    <div className="statRow">
                                        <span className="statLabel">Manifest ID</span>
                                        <span className="statValue">{job.manifest.id}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {embedCode && (
                        <div className="embedSection">
                            <h3 className="embedTitle">Embed Code</h3>
                            <pre className="embedCode">{embedCode}</pre>
                            <button
                                onClick={() => navigator.clipboard.writeText(embedCode)}
                                className="copyBtn"
                            >
                                Copy
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
