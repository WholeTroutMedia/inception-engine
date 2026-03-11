import React, { useState, useRef } from 'react';
import { Upload, Video, Box, Layers, PlayCircle, Settings, Loader2 } from 'lucide-react';
import VfxViewport from '../components/vfx/VfxViewport';

interface VfxUploadResult {
    session_id: string
    status: string
}

interface VfxMetadata {
    fps?: number
    frame_count?: number
}

interface VfxPoseLandmark {
    x: number
    y: number
    z: number
    visibility?: number
}

interface VfxMocapFrame {
    pose: VfxPoseLandmark[]
}

interface VfxCameraPose {
    t: [[number], [number], [number]]
}

interface VfxMocapPreview {
    frames?: VfxMocapFrame[]
    fps?: number
}

interface VfxScenePreview {
    poses?: VfxCameraPose[]
    point_cloud_url?: string
}

interface VfxRotoPreview {
    masks_b64?: string[]
}

interface VfxStatus {
    status: 'pending' | 'processing' | 'completed' | 'error'
    progress?: number
    error?: string
    metadata?: VfxMetadata
    mocap_preview?: VfxMocapPreview
    scene_preview?: VfxScenePreview
    roto_preview?: VfxRotoPreview
}

export default function InceptionVfx() {
    const [activeTab, setActiveTab] = useState('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<VfxUploadResult | null>(null);
    const [processingStatus, setProcessingStatus] = useState<VfxStatus | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const pollStatus = async (sessionId: string) => {
        try {
            const res = await fetch(`http://localhost:8000/api/v1/vfx/status/${sessionId}`);
            const data = await res.json();
            setProcessingStatus(data);

            if (data.status === 'processing' || data.status === 'pending') {
                setTimeout(() => pollStatus(sessionId), 1000);
            } else if (data.status === 'completed') {
                setIsUploading(false);
                setActiveTab('mocap');
            } else if (data.status === 'error') {
                setIsUploading(false);
                alert(`Processing Error: ${data.error}`);
            }
        } catch (e) {
            console.error('Polling error:', e);
            setTimeout(() => pollStatus(sessionId), 2000);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8000/api/v1/vfx/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            setUploadResult(data);
            pollStatus(data.session_id);

        } catch (error) {
            console.error('Error uploading video:', error);
            setIsUploading(false);
            alert('Failed to upload video. Check console for details.');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    const handleExport = () => {
        if (!uploadResult?.session_id) return;
        window.open(`http://localhost:8000/api/v1/vfx/export/${uploadResult.session_id}`, '_blank');
    };

    return (
        <div className="flex w-full h-full bg-obsidian text-secondary p-6">
            <div className="flex flex-col flex-1 max-w-7xl mx-auto gap-6">

                <header className="flex justify-between items-center border-b-2 border-subtle pb-4">
                    <div>
                        <h1 className="text-2xl font-bold font-sans text-cream uppercase tracking-widest flex items-center gap-2">
                            <Video className="text-copper" />
                            INCEPTION VFX
                        </h1>
                        <p className="text-sm font-mono mt-1">AI-to-3D Production Studio</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 border-2 border-subtle hover:border-copper hover:text-copper uppercase text-xs font-bold font-sans bg-surface transition-colors">
                            <Settings size={14} className="inline mr-2" />
                            Settings
                        </button>
                    </div>
                </header>

                <div className="flex gap-4 border-b-2 border-subtle pb-2">
                    {[{ id: 'upload', icon: Upload, label: 'Import Video' },
                    { id: 'mocap', icon: PlayCircle, label: 'Motion Capture' },
                    { id: 'scene', icon: Box, label: 'Scene Recon' },
                    { id: 'roto', icon: Layers, label: 'Roto/Mask' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 font-bold font-sans text-xs uppercase tracking-wider border-2 transition-colors ${activeTab === tab.id
                                ? 'bg-copper text-obsidian border-obsidian shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)]'
                                : 'border-transparent text-secondary hover:text-cream hover:border-subtle'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-subtle bg-surface">
                    {activeTab === 'upload' && (
                        <div className="text-center">
                            {isUploading ? (
                                <Loader2 size={48} className="mx-auto mb-4 text-copper opacity-50 animate-spin" />
                            ) : (
                                <Upload size={48} className="mx-auto mb-4 text-copper opacity-50" />
                            )}
                            <h3 className="text-lg font-bold text-cream mb-2">
                                {isUploading ? 'Uploading & Processing...' : 'Upload Source Video'}
                            </h3>
                            <p className="text-sm max-w-md mx-auto mb-6">Drag and drop MP4, MOV, or AVI files to begin processing. The Inception VFX pipeline will analyze the video for motion capture, depth estimation, and 3D scene reconstruction.</p>

                            <input
                                type="file"
                                title="Upload source video"
                                ref={fileInputRef}
                                className="hidden"
                                accept="video/mp4,video/quicktime,video/x-msvideo"
                                onChange={handleFileUpload}
                            />

                            <button
                                className="px-6 py-3 border-2 border-obsidian bg-copper text-obsidian font-bold uppercase tracking-widest hover:brightness-110 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition-all active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0)] disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? 'Processing...' : 'Select Video File'}
                            </button>

                            {processingStatus && processingStatus.status !== 'error' && (
                                <div className="mt-6 flex flex-col items-center gap-2">
                                    <div className="w-64 h-2 bg-obsidian rounded-full overflow-hidden border border-subtle">
                                        <div
                                            className="h-full bg-copper transition-all duration-300 ease-out"
                                            style={{ width: `${processingStatus.progress || 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-mono text-zinc-400">
                                        Phase: {processingStatus.status || 'initializing'} - {processingStatus.progress || 0}%
                                    </span>
                                </div>
                            )}

                            {processingStatus?.status === 'completed' && (
                                <div className="mt-6 p-4 border border-subtle bg-obsidian text-left text-xs font-mono overflow-auto max-w-lg">
                                    <h4 className="text-obsidian bg-copper px-2 py-1 inline-block mb-2 font-bold uppercase rounded-sm">Pipeline Complete</h4>
                                    <pre>Session: {uploadResult?.session_id}</pre>
                                    <pre>FPS: {processingStatus.metadata?.fps}</pre>
                                    <pre>Frames: {processingStatus.metadata?.frame_count}</pre>
                                    <pre>Mocap Preview: {processingStatus.mocap_preview?.frames?.length || 0} frames extracted</pre>
                                    <pre>Scene Recon: {processingStatus.scene_preview?.poses?.length || 0} camera poses</pre>
                                    <pre>Roto / Masks: {processingStatus.roto_preview?.masks_b64?.length || 0} mattes generated</pre>
                                    <button
                                        onClick={handleExport}
                                        className="mt-4 bg-copper text-obsidian px-4 py-2 hover:bg-white transition-colors uppercase tracking-widest text-xs font-bold rounded-sm">
                                        Download Master Package (.zip)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'mocap' && (
                        <div className="flex w-full h-full text-center items-center justify-center">
                            <VfxViewport mode="mocap" mocapData={processingStatus?.mocap_preview} />
                        </div>
                    )}

                    {activeTab === 'scene' && (
                        <div className="flex w-full h-full text-center items-center justify-center">
                            <VfxViewport mode="scene" sceneData={processingStatus?.scene_preview} />
                        </div>
                    )}

                    {activeTab === 'roto' && (
                        <div className="flex flex-col w-full h-full p-4 overflow-hidden">
                            <h3 className="text-copper mb-4 uppercase tracking-widest text-sm">Automated Matte Generation (RVM Fallback)</h3>
                            {processingStatus?.roto_preview?.masks_b64 ? (
                                <div className="flex-1 overflow-y-auto w-full">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-12">
                                        {processingStatus.roto_preview.masks_b64.map((src: string, i: number) => (
                                            <div key={i} className="border border-subtle bg-obsidian flex flex-col items-center p-2">
                                                <img src={src} className="w-full object-contain mb-2" alt={`Mask ${i}`} />
                                                <span className="text-[10px] font-mono text-zinc-400">Frame {i}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center border-2 border-subtle bg-obsidian">
                                    <span className="text-zinc-500 uppercase tracking-widest text-sm">No Rotoscoping Data Available</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
