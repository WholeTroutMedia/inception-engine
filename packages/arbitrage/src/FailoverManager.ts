/**
 * @module arbitrage/FailoverManager
 * @description Automatic provider failover chain, circuit breaker pattern, retry with exponential backoff
 * Closes #87 (partial)
 */
import { z } from 'zod';
import type { ProviderId, ModelArbitrage } from './ModelArbitrage';
import type { RoutingStrategy, RoutingRequest, RoutingDecision } from './RoutingStrategy';

// -- Circuit Breaker Types --

export const CircuitStateSchema = z.enum(['closed', 'open', 'half-open']);
export type CircuitState = z.infer<typeof CircuitStateSchema>;

export const FailoverConfigSchema = z.object({
  maxRetries: z.number().int().positive().default(3),
  baseDelayMs: z.number().positive().default(1000),
  maxDelayMs: z.number().positive().default(30000),
  backoffMultiplier: z.number().positive().default(2),
  jitterFactor: z.number().min(0).max(1).default(0.1),
  circuitBreaker: z.object({
    failureThreshold: z.number().int().positive().default(5),
    resetTimeoutMs: z.number().positive().default(60000),
    halfOpenMaxRequests: z.number().int().positive().default(3),
  }).optional(),
  timeoutMs: z.number().positive().default(30000),
});
export type FailoverConfig = z.infer<typeof FailoverConfigSchema>;

export interface CircuitBreaker {
  providerId: ProviderId;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number;
  lastStateChange: number;
  halfOpenRequests: number;
}

export interface FailoverAttempt {
  attemptNumber: number;
  providerId: ProviderId;
  modelId: string;
  startTime: number;
  endTime: number;
  success: boolean;
  error?: string;
  latencyMs: number;
}

export interface FailoverResult<T> {
  success: boolean;
  result?: T;
  attempts: FailoverAttempt[];
  totalLatencyMs: number;
  finalProvider: ProviderId;
  finalModel: string;
}

// -- FailoverManager --

export class FailoverManager {
  private config: FailoverConfig;
  private circuits: Map<ProviderId, CircuitBreaker> = new Map();
  private arbitrage: ModelArbitrage;
  private router: RoutingStrategy;
  private failoverLog: FailoverAttempt[] = [];

  constructor(
    arbitrage: ModelArbitrage,
    router: RoutingStrategy,
    config?: Partial<FailoverConfig>,
  ) {
    this.arbitrage = arbitrage;
    this.router = router;
    this.config = FailoverConfigSchema.parse(config ?? {});
  }

  // -- Circuit Breaker --

  getCircuit(providerId: ProviderId): CircuitBreaker {
    let circuit = this.circuits.get(providerId);
    if (!circuit) {
      circuit = {
        providerId,
        state: 'closed',
        failures: 0,
        successes: 0,
        lastFailure: 0,
        lastStateChange: Date.now(),
        halfOpenRequests: 0,
      };
      this.circuits.set(providerId, circuit);
    }
    return circuit;
  }

  canUseProvider(providerId: ProviderId): boolean {
    const circuit = this.getCircuit(providerId);
    const cbConfig = this.config.circuitBreaker;

    switch (circuit.state) {
      case 'closed':
        return true;
      case 'open': {
        const elapsed = Date.now() - circuit.lastStateChange;
        if (elapsed >= (cbConfig?.resetTimeoutMs ?? 60000)) {
          circuit.state = 'half-open';
          circuit.halfOpenRequests = 0;
          circuit.lastStateChange = Date.now();
          return true;
        }
        return false;
      }
      case 'half-open':
        return circuit.halfOpenRequests < (cbConfig?.halfOpenMaxRequests ?? 3);
    }
  }

  recordCircuitSuccess(providerId: ProviderId): void {
    const circuit = this.getCircuit(providerId);
    circuit.successes++;
    if (circuit.state === 'half-open') {
      circuit.halfOpenRequests++;
      const threshold = this.config.circuitBreaker?.halfOpenMaxRequests ?? 3;
      if (circuit.halfOpenRequests >= threshold) {
        circuit.state = 'closed';
        circuit.failures = 0;
        circuit.lastStateChange = Date.now();
      }
    } else {
      circuit.failures = 0;
    }
  }

  recordCircuitFailure(providerId: ProviderId): void {
    const circuit = this.getCircuit(providerId);
    circuit.failures++;
    circuit.lastFailure = Date.now();
    const threshold = this.config.circuitBreaker?.failureThreshold ?? 5;

    if (circuit.state === 'half-open') {
      circuit.state = 'open';
      circuit.lastStateChange = Date.now();
    } else if (circuit.failures >= threshold) {
      circuit.state = 'open';
      circuit.lastStateChange = Date.now();
    }
  }

  // -- Retry with Exponential Backoff --

  calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxDelayMs,
    );
    const jitter = delay * this.config.jitterFactor * (Math.random() * 2 - 1);
    return Math.max(0, delay + jitter);
  }

  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // -- Failover Execution --

  async executeWithFailover<T>(
    request: RoutingRequest,
    executor: (providerId: ProviderId, modelId: string) => Promise<T>,
  ): Promise<FailoverResult<T>> {
    const attempts: FailoverAttempt[] = [];
    const startTime = Date.now();
    const excludeProviders: ProviderId[] = [...(request.excludeProviders ?? [])];

    for (let i = 0; i < this.config.maxRetries; i++) {
      // Route to best available provider
      const decision = this.router.route({
        ...request,
        excludeProviders,
      });

      if (!decision) break;

      // Check circuit breaker
      if (!this.canUseProvider(decision.providerId)) {
        excludeProviders.push(decision.providerId);
        continue;
      }

      const attemptStart = Date.now();
      try {
        const result = await Promise.race([
          executor(decision.providerId, decision.modelId),
          this.timeoutPromise<T>(this.config.timeoutMs),
        ]);

        const attemptEnd = Date.now();
        const attempt: FailoverAttempt = {
          attemptNumber: i + 1,
          providerId: decision.providerId,
          modelId: decision.modelId,
          startTime: attemptStart,
          endTime: attemptEnd,
          success: true,
          latencyMs: attemptEnd - attemptStart,
        };
        attempts.push(attempt);
        this.failoverLog.push(attempt);

        this.arbitrage.recordSuccess(decision.providerId, attempt.latencyMs);
        this.recordCircuitSuccess(decision.providerId);

        return {
          success: true,
          result,
          attempts,
          totalLatencyMs: Date.now() - startTime,
          finalProvider: decision.providerId,
          finalModel: decision.modelId,
        };
      } catch (error) {
        const attemptEnd = Date.now();
        const attempt: FailoverAttempt = {
          attemptNumber: i + 1,
          providerId: decision.providerId,
          modelId: decision.modelId,
          startTime: attemptStart,
          endTime: attemptEnd,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          latencyMs: attemptEnd - attemptStart,
        };
        attempts.push(attempt);
        this.failoverLog.push(attempt);

        this.arbitrage.recordFailure(decision.providerId);
        this.recordCircuitFailure(decision.providerId);
        excludeProviders.push(decision.providerId);

        // Wait before retry (except last attempt)
        if (i < this.config.maxRetries - 1) {
          await this.sleep(this.calculateDelay(i));
        }
      }
    }

    return {
      success: false,
      attempts,
      totalLatencyMs: Date.now() - startTime,
      finalProvider: attempts[attempts.length - 1]?.providerId ?? request.preferredProvider ?? 'claude',
      finalModel: '',
    };
  }

  private timeoutPromise<T>(ms: number): Promise<T> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms),
    );
  }

  // -- Stats --

  getCircuitStates(): Map<ProviderId, CircuitBreaker> {
    return new Map(this.circuits);
  }

  getFailoverLog(limit?: number): FailoverAttempt[] {
    if (limit) return this.failoverLog.slice(-limit);
    return [...this.failoverLog];
  }

  resetCircuit(providerId: ProviderId): void {
    this.circuits.delete(providerId);
  }

  resetAllCircuits(): void {
    this.circuits.clear();
  }
}