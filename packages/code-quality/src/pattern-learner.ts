/**
 * SCRIBE Pattern Learner
 * 
 * Tracks recurring ReSharper violations per agent. After N occurrences,
 * promotes patterns to SCRIBE semantic memory, eventually becoming
 * procedural memory for automatic agent behavior.
 * 
 * @package code-quality
 * @issue #34 — HELIX D
 * @agent COMET (AURORA hive)
 */

import { InspectionIssue, ConstitutionalClass } from './resharper-cli';

// ─── Types ───────────────────────────────────────────────────

export enum MemoryStage {
  EPISODIC = 'episodic',     // Raw occurrence tracking
  SEMANTIC = 'semantic',     // Pattern recognized, stored in SCRIBE
  PROCEDURAL = 'procedural', // Automatic agent behavior
}

export interface ViolationPattern {
  typeId: string;
  category: string;
  occurrences: number;
  agents: Set<string>;
  firstSeen: string;
  lastSeen: string;
  stage: MemoryStage;
  fixPattern?: string;
}

export interface LearnerConfig {
  promotionThreshold: number;  // occurrences before semantic promotion
  proceduralThreshold: number; // occurrences before procedural promotion
  storePath: string;           // persistence path
}

export interface LearnerSnapshot {
  patterns: Record<string, ViolationPattern>;
  totalTracked: number;
  semanticCount: number;
  proceduralCount: number;
  agentStats: Record<string, number>;
}

// ─── Pattern Learner ───────────────────────────────────────

export class PatternLearner {
  private patterns: Map<string, ViolationPattern> = new Map();
  private config: LearnerConfig;

  constructor(config: LearnerConfig) {
    this.config = config;
  }

  /**
   * Record a batch of inspection issues from an agent run.
   */
  recordIssues(issues: InspectionIssue[], agentId: string): void {
    const now = new Date().toISOString();
    for (const issue of issues) {
      const key = `${issue.typeId}::${issue.category}`;
      const existing = this.patterns.get(key);
      if (existing) {
        existing.occurrences++;
        existing.agents.add(agentId);
        existing.lastSeen = now;
        this.evaluatePromotion(existing);
      } else {
        this.patterns.set(key, {
          typeId: issue.typeId,
          category: issue.category,
          occurrences: 1,
          agents: new Set([agentId]),
          firstSeen: now,
          lastSeen: now,
          stage: MemoryStage.EPISODIC,
        });
      }
    }
  }

  /**
   * Get patterns that have been promoted to semantic memory.
   * These are ready to be stored in SCRIBE.
   */
  getSemanticPatterns(): ViolationPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.stage === MemoryStage.SEMANTIC || p.stage === MemoryStage.PROCEDURAL);
  }

  /**
   * Get patterns that have reached procedural stage.
   * These should be embedded in agent behavior.
   */
  getProceduralPatterns(): ViolationPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.stage === MemoryStage.PROCEDURAL);
  }

  /**
   * Get a snapshot of current learner state.
   */
  snapshot(): LearnerSnapshot {
    const patterns: Record<string, ViolationPattern> = {};
    const agentStats: Record<string, number> = {};
    let semanticCount = 0;
    let proceduralCount = 0;

    for (const [key, pattern] of this.patterns) {
      patterns[key] = { ...pattern, agents: new Set(pattern.agents) };
      if (pattern.stage === MemoryStage.SEMANTIC) semanticCount++;
      if (pattern.stage === MemoryStage.PROCEDURAL) proceduralCount++;
      for (const agent of pattern.agents) {
        agentStats[agent] = (agentStats[agent] || 0) + pattern.occurrences;
      }
    }

    return {
      patterns,
      totalTracked: this.patterns.size,
      semanticCount,
      proceduralCount,
      agentStats,
    };
  }

  /**
   * Register a fix pattern for a known violation type.
   * Once a fix is known, BOLT can apply it automatically.
   */
  registerFixPattern(typeId: string, category: string, fixPattern: string): void {
    const key = `${typeId}::${category}`;
    const pattern = this.patterns.get(key);
    if (pattern) {
      pattern.fixPattern = fixPattern;
    }
  }

  private evaluatePromotion(pattern: ViolationPattern): void {
    if (
      pattern.stage === MemoryStage.EPISODIC &&
      pattern.occurrences >= this.config.promotionThreshold
    ) {
      pattern.stage = MemoryStage.SEMANTIC;
    }
    if (
      pattern.stage === MemoryStage.SEMANTIC &&
      pattern.occurrences >= this.config.proceduralThreshold &&
      pattern.fixPattern
    ) {
      pattern.stage = MemoryStage.PROCEDURAL;
    }
  }
}

export default PatternLearner;