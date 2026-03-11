/**
 * COMET — useSMGStore React Hook
 *
 * Fetches and caches the SMGGraph for the active domain from GHOST.
 * Live-polls every 30s for staleness updates.
 * Provides coverage report and domain switching.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:3080';

export interface SMGCoverage {
    domain: string;
    platform: string;
    coverage_score: number;
    total_states: number;
    total_transitions: number;
    stale_states: number;
    last_crawled: string | null;
    staleness_score: number;
    exists: boolean;
    crawl_in_progress: boolean;
}

// Minimal SMG graph shape for UI usage
export interface SMGGraphSummary {
    id: string;
    domain: string;
    platform: 'web' | 'android' | 'ios' | 'visionos';
    version: number;
    crawled_at: string;
    coverage_score: number;
    total_states: number;
    total_transitions: number;
    entry_state_id: string;
    landmark_ids: string[];
    district_clusters: Record<string, string[]>;
    staleness_score: number;
    states: Record<string, {
        id: string;
        label: string;
        url_pattern: string;
        lynch_type: 'path' | 'edge' | 'district' | 'node' | 'landmark';
        inbound_count: number;
        outbound_count: number;
        elements: Array<{ id: string; label: string; action: string; selector: string }>;
        is_auth_required: boolean;
        last_crawled: string;
        staleness_score: number;
    }>;
    transitions: Array<{
        id: string;
        from_state: string;
        to_state: string;
        element_id: string;
        frequency: number;
    }>;
}

export function useSMGStore(domain: string, platform: 'web' | 'android' | 'ios' = 'web') {
    const [smg, setSMG] = useState<SMGGraphSummary | null>(null);
    const [coverage, setCoverage] = useState<SMGCoverage | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchSMG = useCallback(async () => {
        if (!domain) return;
        setLoading(true);
        setError(null);
        try {
            const [smgRes, covRes] = await Promise.all([
                fetch(`${GATEWAY_URL}/ghost/smg/${encodeURIComponent(domain)}?platform=${platform}`),
                fetch(`${GATEWAY_URL}/ghost/smg/${encodeURIComponent(domain)}/coverage?platform=${platform}`),
            ]);

            if (smgRes.ok) {
                setSMG(await smgRes.json());
            } else if (smgRes.status === 404) {
                setSMG(null);
            }

            if (covRes.ok) {
                setCoverage(await covRes.json());
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [domain, platform]);

    const triggerCrawl = useCallback(async (url?: string) => {
        const crawlUrl = url ?? `https://${domain}`;
        await fetch(`${GATEWAY_URL}/ghost/crawl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: crawlUrl, max_depth: 2, async: true }),
        });
        // Start polling more frequently while crawl is in progress
        setTimeout(fetchSMG, 3000);
    }, [domain, fetchSMG]);

    // Initial fetch + 30s polling
    useEffect(() => {
        void fetchSMG();
        pollRef.current = setInterval(fetchSMG, 30_000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchSMG]);

    return { smg, coverage, loading, error, refetch: fetchSMG, triggerCrawl };
}
