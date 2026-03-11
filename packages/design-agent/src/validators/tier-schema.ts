/**
 * VERA-DESIGN: JSON Schema Tier Constraint Validator
 * DS-403 — T20260306-181
 *
 * Enforces 3-tier token architecture:
 *   Tier 1: Primitives — raw values (must be literals, no references)
 *   Tier 2: Semantics — must reference a primitive (no raw values allowed)
 *   Tier 3: Components — must reference a semantic (never a primitive directly)
 *
 * W3C DTCG compliant: validates "$value" and "$type" fields.
 * Enforces naming conventions per tier.
 */

export type TokenTier = 1 | 2 | 3;

export interface DTCGToken {
    $value: string | number;
    $type: string;
    $description?: string;
}

export interface TierViolation {
    path: string;    // dot-path to the offending token
    tier: TokenTier;
    rule: string;    // which invariant was broken
    actual: string;  // the actual value that caused the violation
    expected: string; // what the value should look like
    severity: 'error' | 'warning';
}

export interface TierValidationResult {
    passed: boolean;
    violations: TierViolation[];
    stats: {
        totalTokens: number;
        primitiveCount: number;
        semanticCount: number;
        componentCount: number;
        errorCount: number;
        warningCount: number;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern library
// ─────────────────────────────────────────────────────────────────────────────

/** Raw literal patterns — allowed ONLY in Tier 1 primitives */
const RAW_VALUE_PATTERNS = [
    /^#([0-9a-fA-F]{3,8})$/,              // hex color
    /^rgba?\(\s*\d+/,                      // rgb / rgba
    /^hsl[a]?\(\s*\d+/,                   // hsl / hsla
    /^\d+(px|rem|em|pt|vw|vh|%)$/,        // dimension
    /^\d+(\.\d+)?$/,                       // unitless number
    /^[a-z-]+(,\s*[a-z-]+)*\s*(,\s*(serif|sans-serif|monospace))?$/, // font stack
];

/** Reference pattern — required in Tier 2 and Tier 3 */
const REFERENCE_PATTERN = /^\{[\w.]+\}$/;

/** Tier 1 path prefixes (must start with these) */
const PRIMITIVE_PREFIXES = ['color.', 'spacing.', 'font.', 'radius.', 'shadow.', 'motion.', 'opacity.'];

/** Tier 2 path prefixes (must start with these) */
const SEMANTIC_PREFIXES = [
    'text.', 'surface.', 'border.', 'action.', 'status.',
    'feedback.', 'interactive.', 'elevation.', 'overlay.',
];

/** Tier 3 path prefixes (component-level) */
const COMPONENT_PREFIXES = [
    'button.', 'input.', 'card.', 'badge.', 'nav.',
    'sidebar.', 'modal.', 'tooltip.', 'table.', 'form.',
];

function detectTier(path: string): TokenTier {
    if (COMPONENT_PREFIXES.some(p => path.startsWith(p))) return 3;
    if (SEMANTIC_PREFIXES.some(p => path.startsWith(p))) return 2;
    return 1; // default: primitive
}

function isRawValue(value: string): boolean {
    return RAW_VALUE_PATTERNS.some(p => p.test(String(value).trim()));
}

function isReference(value: string): boolean {
    return REFERENCE_PATTERN.test(String(value).trim());
}

function extractReferencePath(ref: string): string {
    return ref.replace(/^\{/, '').replace(/\}$/, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Core validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively flatten a nested DTCG token tree into dot-path → token pairs.
 */
function flattenTokens(
    obj: Record<string, unknown>,
    prefix = '',
    out: Map<string, DTCGToken> = new Map(),
): Map<string, DTCGToken> {
    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue; // skip meta fields
        const path = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === 'object') {
            const v = value as Record<string, unknown>;
            if ('$value' in v) {
                // It's a leaf token
                out.set(path, v as unknown as DTCGToken);
            } else {
                // It's a group — recurse
                flattenTokens(v as Record<string, unknown>, path, out);
            }
        }
    }
    return out;
}

/**
 * Validate an entire DTCG token file against the 3-tier constraint system.
 *
 * @param tier - the declared tier of the file being validated
 * @param tokens - the raw parsed JSON of the token file
 * @param allTokenPaths - optional: set of ALL known token paths across tiers (for reference validation)
 */
export function validateTierConstraints(
    tier: TokenTier,
    tokens: Record<string, unknown>,
    allTokenPaths?: Set<string>,
): TierValidationResult {
    const violations: TierViolation[] = [];
    const flatTokens = flattenTokens(tokens);

    let primitiveCount = 0;
    let semanticCount = 0;
    let componentCount = 0;

    for (const [path, token] of flatTokens) {
        const detectedTier = detectTier(path);
        const declaredValue = String(token.$value);

        // Count by detected tier
        if (detectedTier === 1) primitiveCount++;
        else if (detectedTier === 2) semanticCount++;
        else componentCount++;

        // ── Tier 1 (Primitive): must be raw, never a reference ────────────────
        if (tier === 1) {
            if (isReference(declaredValue)) {
                violations.push({
                    path,
                    tier,
                    rule: 'T1-NO-REF',
                    actual: declaredValue,
                    expected: 'A raw literal value (hex, px, rem, etc.)',
                    severity: 'error',
                });
            } else if (!isRawValue(declaredValue)) {
                violations.push({
                    path,
                    tier,
                    rule: 'T1-UNKNOWN-FORMAT',
                    actual: declaredValue,
                    expected: 'A recognized raw literal (hex color, px dimension, font stack...)',
                    severity: 'warning',
                });
            }
        }

        // ── Tier 2 (Semantic): must be a reference to a primitive ─────────────
        if (tier === 2) {
            if (!isReference(declaredValue)) {
                violations.push({
                    path,
                    tier,
                    rule: 'T2-MUST-REF',
                    actual: declaredValue,
                    expected: 'A token reference like {color.amber.500}',
                    severity: 'error',
                });
            } else if (allTokenPaths) {
                const refPath = extractReferencePath(declaredValue);
                if (!allTokenPaths.has(refPath)) {
                    violations.push({
                        path,
                        tier,
                        rule: 'T2-BROKEN-REF',
                        actual: declaredValue,
                        expected: `A reference to an existing primitive token. "${refPath}" not found.`,
                        severity: 'error',
                    });
                } else if (detectTier(refPath) !== 1) {
                    violations.push({
                        path,
                        tier,
                        rule: 'T2-WRONG-TARGET-TIER',
                        actual: declaredValue,
                        expected: 'Semantic tokens must reference Tier 1 primitives, not other semantics or components',
                        severity: 'error',
                    });
                }
            }
        }

        // ── Tier 3 (Component): must reference a semantic ─────────────────────
        if (tier === 3) {
            if (!isReference(declaredValue)) {
                violations.push({
                    path,
                    tier,
                    rule: 'T3-MUST-REF',
                    actual: declaredValue,
                    expected: 'A token reference like {text.primary}',
                    severity: 'error',
                });
            } else if (allTokenPaths) {
                const refPath = extractReferencePath(declaredValue);
                if (!allTokenPaths.has(refPath)) {
                    violations.push({
                        path,
                        tier,
                        rule: 'T3-BROKEN-REF',
                        actual: declaredValue,
                        expected: `Reference to an existing semantic token. "${refPath}" not found.`,
                        severity: 'error',
                    });
                } else if (detectTier(refPath) === 1) {
                    violations.push({
                        path,
                        tier,
                        rule: 'T3-SKIP-TIER',
                        actual: declaredValue,
                        expected: 'Component tokens must reference semantics (Tier 2), not primitives (Tier 1) directly',
                        severity: 'error',
                    });
                }
            }
        }

        // ── Universal: $type must be declared ────────────────────────────────
        if (!token.$type) {
            violations.push({
                path,
                tier,
                rule: 'MISSING-TYPE',
                actual: '(no $type field)',
                expected: 'All DTCG tokens must declare a $type (color, dimension, fontFamily, etc.)',
                severity: 'warning',
            });
        }
    }

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    return {
        passed: errorCount === 0,
        violations,
        stats: {
            totalTokens: flatTokens.size,
            primitiveCount,
            semanticCount,
            componentCount,
            errorCount,
            warningCount,
        },
    };
}

/**
 * Build a flat set of all token paths from a DTCG token tree.
 * Used to populate `allTokenPaths` for cross-tier reference validation.
 */
export function buildTokenPathSet(tokens: Record<string, unknown>): Set<string> {
    return new Set(flattenTokens(tokens).keys());
}
