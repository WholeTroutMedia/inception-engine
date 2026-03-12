# CONTEXT — @cle/cle-core

The shared runtime foundation for all Creative Liberation Engine v5 packages. Contains the canonical types, interfaces, constants, and utilities that every other package depends on.

## Purpose

Single source of truth for:

- Agent type definitions (AgentId, HiveId, AgentStatus)
- Constitutional types (ConstitutionalReview, ArticleViolation)
- Flow input/output schemas (shared across genkit flows)
- Provider types (LLMProvider, ModelConfig)
- System event types (BootEvent, SessionEvent, MemoryWrite)
- Utility functions (result handling, error formatting)

## Key Exports (src/index.ts)

```typescript
// Agent types
export type { AgentId, HiveId, AgentStatus, AgentRoster }

// Constitutional types  
export type { ConstitutionalReview, ArticleId }

// Flow schemas
export type { FlowInput, FlowOutput, FlowContext }

// Provider types
export type { LLMProvider, ModelConfig, ProviderHealth }

// Utilities
export { Result, Ok, Err, isOk, isErr }
```

## Critical Rule

**This package must have ZERO runtime dependencies.** Types only. No Genkit, no Express, no external packages. Any utility function must use only Node.js built-ins.

This keeps the package lightweight — it is imported by every other package and must not create dependency chains.

## File Structure

```
src/
  index.ts          — Barrel export of all public types
  types/
    agents.ts       — Agent and hive type definitions
    constitution.ts — Constitutional governance types
    flows.ts        — Genkit flow shared schemas
    providers.ts    — LLM provider types
    events.ts       — System event types
  utils/
    result.ts       — Result<T,E> monad
    errors.ts       — Error formatting utilities
```
