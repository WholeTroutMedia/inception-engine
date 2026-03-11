/**
 * Auto-Benchmark Loop — Phase C HELIX C
 * Standardized eval harness for scoring models across capability dimensions.
 */
import type { BenchmarkResult, ScorecardEntry } from './capability-schema.js';
import { ModelScorecard } from './scorecard.js';

interface EvalPrompt {
  dimension: keyof ScorecardEntry['quality_dimensions'];
  prompt: string;
  expected_pattern?: string;
  max_tokens: number;
}

const EVAL_SUITE: EvalPrompt[] = [
  { dimension: 'reasoning_accuracy', prompt: 'Solve step by step: If 3x + 7 = 22, what is x?', expected_pattern: '5', max_tokens: 200 },
  { dimension: 'creative_quality', prompt: 'Write a haiku about quantum computing.', max_tokens: 100 },
  { dimension: 'instruction_following', prompt: 'List exactly 5 prime numbers less than 20, comma-separated.', expected_pattern: '2,\\s*3,\\s*5,\\s*7,\\s*11', max_tokens: 50 },
  { dimension: 'code_generation', prompt: 'Write a TypeScript function that reverses a string without using .reverse()', expected_pattern: 'function', max_tokens: 200 },
  { dimension: 'factual_accuracy', prompt: 'What is the speed of light in meters per second?', expected_pattern: '299.*792.*458', max_tokens: 50 },
  { dimension: 'speed_score', prompt: 'Reply with OK.', max_tokens: 5 },
];

export class AutoBenchmark {
  private budgetCapPerCycle: number;
  private scorecard: ModelScorecard;

  constructor(scorecard: ModelScorecard, budgetCap = 5.0) {
    this.scorecard = scorecard;
    this.budgetCapPerCycle = budgetCap;
  }

  /** Run benchmark on a single model, return result */
  async benchmarkModel(
    modelId: string,
    provider: string,
    callModel: (prompt: string, maxTokens: number) => Promise<{ text: string; latencyMs: number; cost: number }>,
  ): Promise<BenchmarkResult> {
    const start = Date.now();
    const scores: Record<string, number> = {};
    let totalCost = 0;
    let sampleCount = 0;

    for (const evalItem of EVAL_SUITE) {
      try {
        const { text, latencyMs, cost } = await callModel(evalItem.prompt, evalItem.max_tokens);
        totalCost += cost;
        sampleCount++;

        let score = 50; // baseline
        if (evalItem.expected_pattern) {
          const match = new RegExp(evalItem.expected_pattern, 'i').test(text);
          score = match ? 90 + Math.random() * 10 : 20 + Math.random() * 20;
        } else {
          score = text.length > 10 ? 60 + Math.random() * 30 : 30;
        }
        if (evalItem.dimension === 'speed_score') {
          score = latencyMs < 500 ? 95 : latencyMs < 1000 ? 80 : latencyMs < 3000 ? 60 : 30;
        }
        scores[evalItem.dimension] = Math.round(score);
      } catch {
        scores[evalItem.dimension] = 0;
      }

      if (totalCost >= this.budgetCapPerCycle) {
        console.warn(`[BENCHMARK] Budget cap reached for ${modelId}`);
        break;
      }
    }

    const dimensions = {
      reasoning_accuracy: scores.reasoning_accuracy ?? 0,
      creative_quality: scores.creative_quality ?? 0,
      instruction_following: scores.instruction_following ?? 0,
      code_generation: scores.code_generation ?? 0,
      factual_accuracy: scores.factual_accuracy ?? 0,
      speed_score: scores.speed_score ?? 0,
    };

    const composite = Math.round(
      Object.values(dimensions).reduce((a, b) => a + b, 0) / Object.values(dimensions).length
    );

    return {
      model_id: modelId, provider,
      eval_suite_version: '1.0.0',
      dimensions, composite_score: composite,
      cost_total: totalCost, duration_ms: Date.now() - start,
      sample_count: sampleCount, timestamp: new Date().toISOString(),
    };
  }

  /** Run benchmarks on all pending models in the scorecard */
  async benchmarkPending(
    callModel: (modelId: string, prompt: string, maxTokens: number) => Promise<{ text: string; latencyMs: number; cost: number }>,
  ): Promise<BenchmarkResult[]> {
    const pending = this.scorecard.getPending();
    const results: BenchmarkResult[] = [];
    for (const entry of pending) {
      const result = await this.benchmarkModel(
        entry.model_id, entry.provider,
        (prompt, maxTokens) => callModel(entry.model_id, prompt, maxTokens),
      );
      results.push(result);
      this.scorecard.updateEntry(entry.model_id, {
        quality_score: result.composite_score,
        quality_dimensions: result.dimensions,
        last_benchmarked: result.timestamp,
        status: 'active',
      });
    }
    return results;
  }
}