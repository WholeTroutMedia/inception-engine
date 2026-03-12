/**
 * @cle/core — Constitutional Governance Types
 *
 * Types for constitutional review, article enforcement, and
 * compliance tracking. Zero runtime dependencies.
 *
 * Constitutional: Article III (Constitutional Compliance) — kdocsd enforces
 * all articles against all agent actions.
 */

// ─── Article IDs ──────────────────────────────────────────────────────────────

/** All 20 articles of the Creative Liberation Engine Constitution */
export type ArticleId =
    | 0   // Sacred Mission — artist liberation
    | 1   // Separation of Powers
    | 2   // Living Archive
    | 3   // Constitutional Compliance
    | 4   // Transparency
    | 5   // User Sovereignty
    | 6   // Quality Gates
    | 7   // Knowledge Compounding
    | 8   // Agent Identity
    | 9   // Error Recovery
    | 10  // Resource Stewardship
    | 11  // Collaboration Protocol
    | 12  // Mode Discipline
    | 13  // Version Control
    | 14  // Testing Mandate
    | 15  // Documentation
    | 16  // Security
    | 17  // Anti-Theft
    | 18  // Anti-Lock-In
    | 19; // Neural Architecture

/** Whether the article is immutable (cannot be amended) */
export const IMMUTABLE_ARTICLES: readonly ArticleId[] = [0, 1, 3, 5, 17, 18, 19] as const;

// ─── Article Violation ────────────────────────────────────────────────────────

/** A specific article violation detected by kdocsd or constitutionalPreflight */
export interface ArticleViolation {
    /** Which article was violated */
    article: ArticleId;
    /** Human-readable description of what triggered the violation */
    description: string;
    /** Severity of the violation */
    severity: 'warning' | 'block' | 'critical';
}

// ─── Constitutional Review ────────────────────────────────────────────────────

/** Full constitutional review result from kdocsd */
export interface ConstitutionalReview {
    /** Whether the action is permitted */
    approved: boolean;
    /** Violations found (empty if approved) */
    violations: ArticleViolation[];
    /** Articles that were checked */
    articlesChecked: ArticleId[];
    /** Reviewer agent (usually 'kdocsd' or 'COMPASS') */
    reviewedBy: string;
    /** ISO timestamp of when review was performed */
    reviewedAt: string;
    /** Optional explanation for why it was approved or blocked */
    reasoning?: string;
}

/** Lightweight preflight result from `constitutionalPreflight()` */
export interface PreflightResult {
    /** Whether the action passes the preflight check */
    pass: boolean;
    /** Human-readable flag descriptions (empty if pass=true) */
    flags: string[];
}

// ─── Constitutional Constants ─────────────────────────────────────────────────

/** Article definitions — name, mutability, summary */
export interface ArticleDefinition {
    name: string;
    immutable: boolean;
    summary: string;
}
