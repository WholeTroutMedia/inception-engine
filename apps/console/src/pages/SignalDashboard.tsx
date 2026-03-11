/**
 * SignalDashboard — AVERI live creative intelligence surface
 *
 * The vibe-coding surface for the Creative Liberation Engine console.
 * Four live signal feed panels + ORIGIN Loop autonomous task runner +
 * CommandMembrane persistent ATHENA prompt bar.
 *
 * Route: /signal
 */

import { useState, useEffect, useCallback } from 'react';
import { SignalFeedCard, type SignalItem, type SignalSource } from './SignalFeedCard';
import { CommandMembrane } from './CommandMembrane';
import { OriginLoop } from './OriginLoop';
import styles from './signal-dashboard.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FeedState {
  trending: SignalItem[];
  campaign: SignalItem[];
  brand: SignalItem[];
  comet: SignalItem[];
}

interface FeedLoadingState {
  trending: boolean;
  campaign: boolean;
  brand: boolean;
  comet: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA GENERATORS (replace with real Genkit / dispatch API calls)
// ─────────────────────────────────────────────────────────────────────────────

function makeMockTrending(): SignalItem[] {
  const topics = [
    { headline: 'AI agents becoming "vibe coders"', subtext: 'PCMag + OpenAI Codex coverage', trend: 'up' as const, score: 0.92 },
    { headline: 'Karpathy autoresearch forks surge', subtext: '187 forks this week', trend: 'up' as const, score: 0.81 },
    { headline: 'Video generation latency benchmarks', subtext: 'Kling vs Runway latest', trend: 'flat' as const, score: 0.67 },
    { headline: 'GCP AlloyDB pgvector perf improvements', subtext: 'Blog post trending in ML circles', trend: 'up' as const, score: 0.73 },
    { headline: 'Sovereign stacks replacing SaaS tooling', subtext: 'Self-host wave Q1 2026', trend: 'up' as const, score: 0.88 },
  ];
  return topics.map((t, i) => ({ id: `trend-${i}`, ...t, timestamp: new Date() }));
}

function makeMockCampaign(): SignalItem[] {
  return [
    { id: 'c1', headline: 'Zero-Day intake conversion: 68%', subtext: 'Last 7 days', trend: 'up', score: 0.68, timestamp: new Date() },
    { id: 'c2', headline: 'Email open rate: 41.2%', subtext: 'Exceeds 32% target', trend: 'up', score: 0.41, timestamp: new Date() },
    { id: 'c3', headline: 'CPC down 18% this week', subtext: 'Optimized keyword targeting', trend: 'down', score: 0.22, timestamp: new Date() },
    { id: 'c4', headline: 'Brand mention velocity: +34%', subtext: '3-day rolling avg', trend: 'up', score: 0.74, timestamp: new Date() },
  ];
}

function makeMockBrand(): SignalItem[] {
  return [
    { id: 'b1', headline: 'Sentiment score: 8.4 / 10', subtext: 'Twitter + Reddit composite', trend: 'up', score: 0.84, timestamp: new Date() },
    { id: 'b2', headline: '"Creative Liberation Engine" searches up 27%', subtext: 'Google Trends 7d', trend: 'up', score: 0.72, timestamp: new Date() },
    { id: 'b3', headline: 'Github stars delta: +42 this week', subtext: 'brainchild-v5 repo', trend: 'up', score: 0.55, timestamp: new Date() },
    { id: 'b4', headline: 'Competitor NPS declining', subtext: 'COMET intel — 3 competitors', trend: 'flat', score: 0.4, timestamp: new Date() },
  ];
}

function makeMockCOMET(): SignalItem[] {
  return [
    { id: 'cm1', headline: 'FAL.ai launched new video model', subtext: 'Just now — COMET browser', trend: 'up', score: 0.9, timestamp: new Date() },
    { id: 'cm2', headline: 'Anthropic raising $3.5B Series E', subtext: 'Bloomberg report 6 hours ago', trend: 'flat', score: 0.6, timestamp: new Date() },
    { id: 'cm3', headline: 'OpenAI Codex: 10x inference speed', subtext: 'From Codex announcement post', trend: 'up', score: 0.85, timestamp: new Date() },
    { id: 'cm4', headline: 'Google AlloyDB free tier announcement', subtext: 'GCP blog — relevant to stack', trend: 'up', score: 0.78, timestamp: new Date() },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 45_000; // 45s refresh cycle

export default function SignalDashboard() {
  const [feeds, setFeeds] = useState<FeedState>({
    trending: [],
    campaign: [],
    brand: [],
    comet: [],
  });

  const [loading, setLoading] = useState<FeedLoadingState>({
    trending: true,
    campaign: true,
    brand: true,
    comet: true,
  });

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [averiOnline] = useState(true);

  // Load all feeds
  const loadFeeds = useCallback(async () => {
    // Mark all as loading
    setLoading({ trending: true, campaign: true, brand: true, comet: true });

    // Fetch all feeds with small stagger so they animate in with offset
    await Promise.all([
      (async () => {
        await new Promise(r => setTimeout(r, 0));
        setFeeds(prev => ({ ...prev, trending: makeMockTrending() }));
        setLoading(prev => ({ ...prev, trending: false }));
      })(),
      (async () => {
        await new Promise(r => setTimeout(r, 120));
        setFeeds(prev => ({ ...prev, campaign: makeMockCampaign() }));
        setLoading(prev => ({ ...prev, campaign: false }));
      })(),
      (async () => {
        await new Promise(r => setTimeout(r, 240));
        setFeeds(prev => ({ ...prev, brand: makeMockBrand() }));
        setLoading(prev => ({ ...prev, brand: false }));
      })(),
      (async () => {
        await new Promise(r => setTimeout(r, 360));
        setFeeds(prev => ({ ...prev, comet: makeMockCOMET() }));
        setLoading(prev => ({ ...prev, comet: false }));
      })(),
    ]);

    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    void loadFeeds();
    const timer = setInterval(() => void loadFeeds(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadFeeds]);

  const feedConfig: Array<{
    source: SignalSource;
    title: string;
    icon: string;
    accent: string;
    key: keyof FeedState;
  }> = [
    { source: 'trending', title: 'Trending Topics', icon: '◉', accent: 'var(--signal-trending)', key: 'trending' },
    { source: 'campaign', title: 'Campaign Metrics', icon: '◈', accent: 'var(--signal-campaign)', key: 'campaign' },
    { source: 'brand', title: 'Brand Sentiment', icon: '◆', accent: 'var(--signal-brand)', key: 'brand' },
    { source: 'comet', title: 'COMET Intel', icon: '⟳', accent: 'var(--signal-comet)', key: 'comet' },
  ];

  return (
    <div className={styles.signalDashboard} id="signal-dashboard">
      {/* Header */}
      <header className={styles.dashboardHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.dashboardTitle}>SIGNAL</h1>
          <p className={styles.dashboardSubtitle}>Live creative intelligence surface</p>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.averiStatus} ${averiOnline ? styles.online : styles.offline}`}>
            <span className={styles.statusDot} />
            AVERI {averiOnline ? 'live' : 'offline'}
          </span>
          <span className={styles.lastRefresh}>
            Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            id="signal-refresh-btn"
            className={styles.refreshBtn}
            onClick={() => void loadFeeds()}
            aria-label="Refresh all signal feeds"
          >
            ↺
          </button>
        </div>
      </header>

      {/* Feed Grid */}
      <section className={styles.feedGrid} aria-label="Signal feed panels">
        {feedConfig.map(({ source, title, icon, accent, key }) => (
          <SignalFeedCard
            key={source}
            source={source}
            title={title}
            icon={icon}
            items={feeds[key]}
            loading={loading[key]}
            accent={accent}
          />
        ))}
      </section>

      {/* ORIGIN Loop */}
      <section className={styles.originSection} aria-label="ORIGIN Loop autonomous task runner">
        <OriginLoop />
      </section>

      {/* Command Membrane — persistent at bottom */}
      <section className={styles.membraneSection} aria-label="ATHENA Command Membrane">
        <CommandMembrane
          placeholder="Tell ATHENA what to do across the signals..."
        />
      </section>
    </div>
  );
}
