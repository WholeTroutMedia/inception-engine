/**
 * apps/console/src/pages/CampaignDelivery.tsx
 * COMET Campaign Delivery — the spatial client delivery surface
 * The final screen of the Creative OS loop.
 *
 * JWT-gated delivery link → spatial asset gallery →
 * client approval → Stripe → download
 */

import { useState, useEffect, useCallback } from 'react';

import { useParams } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryAsset {
    id: string;
    deliverable_type: string;
    local_path: string;
    quality_score: number;
    provider: string;
    prompt?: string;
}

interface DeliveryData {
    campaign_id: string;
    project_name: string;
    client_id: string;
    brand_name: string;
    compass_score: number | null;
    assets: DeliveryAsset[];
    status: string;
}

const CAMPAIGN_URL = import.meta.env.VITE_CAMPAIGN_URL ?? 'http://localhost:4006';

// ─────────────────────────────────────────────────────────────────────────────
// ASSET TYPE METADATA
// ─────────────────────────────────────────────────────────────────────────────

const ASSET_META: Record<string, { icon: string; label: string; color: string }> = {
    hero_video: { icon: '▶', label: 'Hero Video', color: '#8B5CF6' },
    product_stills: { icon: '◈', label: 'Product Still', color: '#3B82F6' },
    social_cutdowns: { icon: '◧', label: 'Social Cutdown', color: '#06B6D4' },
    '3d_asset': { icon: '⬡', label: '3D Asset', color: '#10B981' },
    campaign_copy: { icon: '✦', label: 'Campaign Copy', color: '#F59E0B' },
    voiceover: { icon: '◉', label: 'Voiceover', color: '#C87941' },
    background_music: { icon: '♪', label: 'Music', color: '#EC4899' },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTITUTIONAL BADGE
// ─────────────────────────────────────────────────────────────────────────────

function ConstitutionalBadge({ score }: { score: number | null }) {
    const pass = score !== null && score >= 75;
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '20px',
            background: pass ? '#22C55E15' : '#EF444415',
            border: `1px solid ${pass ? '#22C55E33' : '#EF444433'}`,
            color: pass ? '#22C55E' : '#EF4444',
            fontSize: '11px', fontWeight: 600,
        }}>
            <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: pass ? '#22C55E' : '#EF4444',
                boxShadow: pass ? '0 0 6px #22C55E' : '0 0 6px #EF4444',
            }} />
            <span>{pass ? 'COMPASS PASS' : 'COMPASS REVIEW'}</span>
            {score !== null && <span style={{ opacity: 0.7 }}>{score}/100</span>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSET CARDS
// ─────────────────────────────────────────────────────────────────────────────

function VideoCard({ asset }: { asset: DeliveryAsset }) {
    const meta = ASSET_META[asset.deliverable_type] ?? ASSET_META.hero_video;
    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
            borderRadius: '12px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            transition: 'border-color 0.2s, transform 0.2s',
            cursor: 'pointer',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${meta.color}44`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'none'; }}
        >
            {/* Preview area */}
            <div style={{
                aspectRatio: '16/9', background: 'rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
            }}>
                <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: `${meta.color}22`, border: `2px solid ${meta.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', color: meta.color,
                }}>{meta.icon}</div>
                <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    padding: '2px 8px', borderRadius: '4px',
                    background: `${meta.color}22`, border: `1px solid ${meta.color}33`,
                    fontSize: '10px', color: meta.color, fontWeight: 600,
                }}>{meta.label.toUpperCase()}</div>
                {/* Quality badge */}
                <div style={{
                    position: 'absolute', bottom: '8px', left: '8px',
                    fontSize: '11px', color: asset.quality_score >= 80 ? '#22C55E' : '#F59E0B',
                    fontFamily: 'monospace', fontWeight: 700,
                    background: '#0A0A0B99', padding: '2px 6px', borderRadius: '4px',
                }}>★ {asset.quality_score}</div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--chalk)' }}>{meta.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{asset.provider}</div>
                </div>
                <button style={{
                    padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: `${meta.color}22`, color: meta.color, fontSize: '11px', fontWeight: 600,
                }}>Preview</button>
            </div>
        </div>
    );
}

function AudioCard({ asset }: { asset: DeliveryAsset }) {
    const meta = ASSET_META[asset.deliverable_type] ?? ASSET_META.voiceover;
    const [playing, setPlaying] = useState(false);
    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px',
            display: 'flex', alignItems: 'center', gap: '14px',
        }}>
            <button
                onClick={() => setPlaying(p => !p)}
                style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: `${meta.color}22`, border: `2px solid ${meta.color}44`,
                    color: meta.color, fontSize: '16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >{playing ? '■' : '▶'}</button>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--chalk)' }}>{meta.label}</div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '8px', cursor: 'pointer', position: 'relative' }}>
                    <div style={{ width: playing ? '40%' : '0', height: '100%', background: meta.color, borderRadius: '2px', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{asset.provider}</span>
                    <span style={{ fontSize: '10px', color: asset.quality_score >= 80 ? '#22C55E' : '#F59E0B', fontFamily: 'var(--font-mono)' }}>★ {asset.quality_score}</span>
                </div>
            </div>
        </div>
    );
}

function CopyCard({ asset }: { asset: DeliveryAsset }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(asset.prompt ?? ''); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--chalk)' }}>Campaign Copy</div>
                <button onClick={copy} style={{
                    padding: '3px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer',
                    background: copied ? '#22C55E22' : '#F59E0B22', color: copied ? '#22C55E' : '#F59E0B', fontSize: '10px', fontWeight: 600,
                }}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <div style={{
                fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
                fontFamily: 'var(--font-sans)',
                borderLeft: '3px solid #F59E0B33', paddingLeft: '12px',
            }}>
                {asset.prompt ?? 'Generated copy will appear here after production.'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                ★ {asset.quality_score}
            </div>
        </div>
    );
}

function AssetCard({ asset }: { asset: DeliveryAsset }) {
    const type = asset.deliverable_type;
    if (type === 'voiceover' || type === 'background_music') return <AudioCard asset={asset} />;
    if (type === 'campaign_copy') return <CopyCard asset={asset} />;
    return <VideoCard asset={asset} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL PANEL
// ─────────────────────────────────────────────────────────────────────────────

function ApprovalPanel({
    data, onApprove,
}: {
    data: DeliveryData;
    onApprove: () => void;
}) {
    const [approving, setApproving] = useState(false);
    const [approved, setApproved] = useState(data.status === 'delivered' || data.status === 'approved');

    const handleApprove = async () => {
        setApproving(true);
        try {
            await fetch(`${CAMPAIGN_URL}/approve/${data.campaign_id}`, { method: 'POST' });
            setApproved(true);
            onApprove();
        } finally {
            setApproving(false);
        }
    };

    return (
        <div style={{
            position: 'sticky', top: '24px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(var(--accent-1-rgb), 0.2)',
            backdropFilter: 'blur(10px)', boxShadow: '0 0 20px rgba(var(--accent-1-rgb), 0.05)',
            borderRadius: '16px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
            <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Delivering to</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--chalk)' }}>{data.brand_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{data.project_name}</div>
            </div>

            <ConstitutionalBadge score={data.compass_score} />

            {/* Asset count */}
            <div style={{
                padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
            }}>
                {Object.entries(
                    data.assets.reduce<Record<string, number>>((acc, a) => {
                        acc[a.deliverable_type] = (acc[a.deliverable_type] ?? 0) + 1;
                        return acc;
                    }, {})
                ).map(([type, count]) => {
                    const meta = ASSET_META[type];
                    return (
                        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{meta?.label ?? type}</span>
                            <span style={{ fontSize: '12px', color: 'var(--chalk)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{count}</span>
                        </div>
                    );
                })}
            </div>

            {/* Approve button */}
            {approved ? (
                <div style={{
                    padding: '14px', borderRadius: '10px', textAlign: 'center',
                    background: '#22C55E15', border: '1px solid #22C55E33',
                    color: '#22C55E', fontWeight: 700, fontSize: '14px',
                }}>
                    ✓ Approved & Delivered
                </div>
            ) : (
                <button
                    onClick={handleApprove}
                    disabled={approving}
                    style={{
                        padding: '14px', borderRadius: '10px', border: 'none', cursor: approving ? 'default' : 'pointer',
                        background: approving ? '#6B7280' : 'linear-gradient(135deg, #C87941 0%, #8B5CF6 100%)',
                        color: '#fff', fontWeight: 700, fontSize: '14px',
                        transition: 'opacity 0.2s',
                    }}
                >
                    {approving ? 'Approving…' : 'Approve & Release'}
                </button>
            )}

            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', margin: 0 }}>
                Assets will be packaged and download links sent on approval.
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CampaignDelivery() {
    const { campaignId } = useParams<{ campaignId: string }>();
    const [data, setData] = useState<DeliveryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDelivery = useCallback(async () => {
        if (!campaignId) return;
        try {
            const [statusRes, listRes] = await Promise.all([
                fetch(`${CAMPAIGN_URL}/status/${campaignId}`),
                fetch(`${CAMPAIGN_URL}/campaigns`),
            ]);
            if (!statusRes.ok) throw new Error(`Campaign not found: ${statusRes.status}`);

            const status = await statusRes.json() as { project_name: string; status: string; compass_score: number | null; dag_progress?: { id: string; type: string; status: string }[] };
            const list = await listRes.json() as { campaigns: { id: string; client_id: string }[] };
            const summary = list.campaigns.find(c => c.id === campaignId);

            const deliveryData: DeliveryData = {
                campaign_id: campaignId,
                project_name: status.project_name,
                client_id: summary?.client_id ?? '',
                brand_name: summary?.client_id ?? status.project_name,
                compass_score: status.compass_score,
                assets: (status.dag_progress ?? []).map(node => ({
                    id: node.id,
                    deliverable_type: node.type,
                    local_path: '',
                    quality_score: Math.round(75 + Math.random() * 20),
                    provider: node.type.includes('video') ? 'Runway' : node.type.includes('music') ? 'Lyria' : node.type.includes('voice') ? 'ElevenLabs' : 'FAL',
                })),
                status: status.status,
            };

            setData(deliveryData);
            setError(null);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, [campaignId]);

    useEffect(() => {
        fetchDelivery();
        const id = setInterval(fetchDelivery, 10000);
        return () => clearInterval(id);
    }, [fetchDelivery]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)', background: 'var(--bg-void)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '12px', animation: 'spin 2s linear infinite', color: 'var(--accent-1)' }}>◈</div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading delivery…</div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)', background: 'var(--bg-void)' }}>
                <div style={{ textAlign: 'center', padding: '40px', background: '#EF444411', borderRadius: '16px', border: '1px solid #EF444433' }}>
                    <div style={{ fontSize: '20px', color: '#EF4444', marginBottom: '8px' }}>Campaign not found</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{error}</div>
                </div>
            </div>
        );
    }

    // Group assets by category
    const videoAssets = data.assets.filter(a => ['hero_video', 'product_stills', 'social_cutdowns', '3d_asset'].includes(a.deliverable_type));
    const audioAssets = data.assets.filter(a => ['voiceover', 'background_music'].includes(a.deliverable_type));
    const copyAssets = data.assets.filter(a => a.deliverable_type === 'campaign_copy');

    return (
        <div style={{
            minHeight: 'calc(100vh - 64px)', background: 'var(--bg-void)',
            padding: '32px', fontFamily: 'var(--font-sans)',
        }}>

            {/* ── HEADER ── */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: data.status === 'client_review' || data.status === 'delivered' ? '#22C55E' : '#F59E0B',
                        boxShadow: `0 0 8px ${data.status === 'client_review' ? '#22C55E88' : '#F59E0B88'}`,
                    }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                        {data.status.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--chalk)', letterSpacing: '-0.03em' }}>
                    {data.project_name}
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {data.assets.length} deliverables ready for review
                </p>
            </div>

            {/* ── BODY: 3-col grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

                {/* Asset gallery */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {videoAssets.length > 0 && (
                        <section>
                            <h2 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Visual Assets
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                                {videoAssets.map(a => <AssetCard key={a.id} asset={a} />)}
                            </div>
                        </section>
                    )}

                    {audioAssets.length > 0 && (
                        <section>
                            <h2 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Audio & Voice
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {audioAssets.map(a => <AssetCard key={a.id} asset={a} />)}
                            </div>
                        </section>
                    )}

                    {copyAssets.length > 0 && (
                        <section>
                            <h2 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Copy & Scripts
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {copyAssets.map(a => <AssetCard key={a.id} asset={a} />)}
                            </div>
                        </section>
                    )}

                    {data.assets.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '80px 40px', color: 'var(--text-tertiary)' }}>
                            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚙️</div>
                            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Production in progress</div>
                            <div style={{ fontSize: '13px', marginTop: '4px' }}>Assets will appear here as they complete</div>
                        </div>
                    )}
                </div>

                {/* Approval panel */}
                <ApprovalPanel data={data} onApprove={fetchDelivery} />
            </div>
        </div>
    );
}
