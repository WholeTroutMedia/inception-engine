/**
 * SignalFeedCard — SIGNAL Dashboard component
 *
 * A live signal card for the SIGNAL Dashboard. Shows a stream of
 * intelligence from one source (social, campaign, brand, COMET).
 */

import React, { useState, useEffect, useRef } from 'react';
import styles from './signal-dashboard.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type SignalSource = 'trending' | 'campaign' | 'brand' | 'comet';

export interface SignalItem {
  id: string;
  headline: string;
  subtext?: string;
  score?: number;
  trend?: 'up' | 'down' | 'flat';
  timestamp: Date;
}

export interface SignalFeedCardProps {
  source: SignalSource;
  title: string;
  icon: string;
  items: SignalItem[];
  loading?: boolean;
  accent?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const SignalFeedCard: React.FC<SignalFeedCardProps> = ({
  source,
  title,
  icon,
  items,
  loading = false,
  accent,
}) => {
  const [pulseActive, setPulseActive] = useState(false);
  const prevItemsLen = useRef(items.length);

  // Pulse animation when new items arrive
  useEffect(() => {
    if (items.length !== prevItemsLen.current) {
      setPulseActive(true);
      const t = setTimeout(() => setPulseActive(false), 800);
      prevItemsLen.current = items.length;
      return () => clearTimeout(t);
    }
  }, [items.length]);

  const trendIcon = (trend?: SignalItem['trend']) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  return (
    <div
      className={`${styles.signalCard} ${pulseActive ? styles.pulsing : ''}`}
      data-source={source}
      style={accent ? ({ '--card-accent': accent } as React.CSSProperties) : undefined}
    >
      {/* Header */}
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <span className={styles.cardTitle}>{title}</span>
        <span className={`${styles.liveIndicator} ${loading ? styles.loading : styles.live}`}>
          {loading ? '⟳' : '●'}
        </span>
      </div>

      {/* Feed Items */}
      <ul className={styles.signalList}>
        {loading && items.length === 0 ? (
          <li className={styles.skeletonItem} aria-label="Loading signals">
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </li>
        ) : (
          items.slice(0, 5).map((item) => (
            <li key={item.id} className={styles.signalItem}>
              <div className={styles.signalHeadline}>
                {item.trend && (
                  <span className={`${styles.trendBadge} ${styles[`trend-${item.trend}`]}`}>
                    {trendIcon(item.trend)}
                  </span>
                )}
                <span className={styles.signalText}>{item.headline}</span>
              </div>
              {item.subtext && (
                <div className={styles.signalSubtext}>{item.subtext}</div>
              )}
              {item.score !== undefined && (
                <div className={styles.scoreBar}>
                  <div
                    className={styles.scoreFill}
                    style={{ width: `${Math.round(item.score * 100)}%` }}
                  />
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};
