# TypeScript Standards — brainchild-v5 GENESIS

All TypeScript in this repo is strict-mode, production-grade, and type-safe. These rules are non-negotiable.

## Strict Mode Enforcement

- `"strict": true` in all tsconfig files — no exceptions
- `"noImplicitAny": true` — never use `any`, ever
- `"strictNullChecks": true` — handle null/undefined explicitly
- `"exactOptionalPropertyTypes": true` — be precise with optional props

## Type Design Principles

1. **Types first** — define interfaces before implementation
2. **Narrow types** — use union types and literals, not broad primitives
3. **No `any`** — use `unknown` and narrow it, or define the proper type
4. **Avoid type assertions** (`as`) except at system boundaries with validation
5. **Export types** — all public interfaces must be exported from the package index

## Naming Conventions

- Interfaces: `PascalCase`, prefixed with `I` only if needed to disambiguate
- Types: `PascalCase`
- Enums: `PascalCase` with `PascalCase` values
- Functions: `camelCase`
- Files: `kebab-case.ts`
- Genkit flows: descriptive name matching the file (`archCodexFlow`, `veraFlow`)

## Import/Export Rules

- Use named exports — no default exports (makes refactoring easier)
- Index barrel files (`index.ts`) must export only public API
- Import from `@inception/[package]`, not relative paths across packages

## v5 Package Conventions

- All packages under `packages/` use `@inception/` scope
- Each package has a `CONTEXT.md` explaining its purpose and key exports
- Each package has strict `tsconfig.json` extending the root config
- Build output to `dist/` — never commit `dist/`

## Error Handling

- Use `Result<T, E>` pattern for operations that can fail
- Never swallow errors silently — log or re-throw with context
- Async functions must have explicit error handling (try/catch or .catch())
