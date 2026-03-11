// ─── Token Tier Validator ─────────────────────────────────────────────────────
// T20260306-181: JSON Schema validator that enforces tier constraints
// Uses AJV for schema validation + custom walks for tier-ancestry rules
// Run via: npm run tokens:validate
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Ajv from 'ajv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src');

const errors = [];
const warnings = [];

// ─── JSON Schemas ─────────────────────────────────────────────────────────────

const VALID_TYPES = [
    // W3C DTCG core types
    'color', 'dimension', 'fontFamily', 'fontWeight', 'number',
    'duration', 'cubicBezier', 'shadow', 'borderRadius', 'opacity',
    'fontStyle', 'letterSpacing', 'lineHeight', 'paragraphSpacing',
    'textDecoration', 'sizing', 'border', 'blur', 'gradient', 'transition',
    // Extended / Tokens Studio types
    'animation', 'textCase', 'textTransform', 'strokeStyle',
    'composition', 'string', 'boolean', 'asset', 'typography',
];

// W3C DTCG-aligned token leaf schema
// Note: additionalProperties is intentionally NOT set so $description/$extensions etc. are allowed
const tokenLeafSchema = {
    type: 'object',
    required: ['$value'],
    properties: {
        $value: {}, // any — type-checked separately by VALUE_CHECKS
        $type: { type: 'string', enum: VALID_TYPES },
        $description: { type: 'string' },
        $extensions: { type: 'object' },
    },
};

// A token group (recursive) — either leaf or subtree
const tokenGroupSchema = {
    type: 'object',
    additionalProperties: {
        oneOf: [
            tokenLeafSchema,
            { $ref: '#' }, // recursive group
        ],
    },
};

const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
ajv.addSchema(tokenGroupSchema, '#');
const validateGroup = ajv.compile(tokenLeafSchema);

// ─── Per-Type Value Checks ────────────────────────────────────────────────────

const VALUE_CHECKS = {
    // Accept hex, rgb/rgba(), or alias reference {token.path}
    color: (v) => typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$|^rgba?\(|^\{/.test(v),
    dimension: (v) => typeof v === 'string' && (/^\{/.test(v) || /^-?[\d.]+(px|rem|em|%)$/.test(v) || v === '0' || v === '0px'),
    fontWeight: (v) => (typeof v === 'number' && v >= 100 && v <= 900 && v % 100 === 0) || typeof v === 'string',
    number: (v) => typeof v === 'number',
    duration: (v) => typeof v === 'string' && (/^\{/.test(v) || /^\d+(ms|s)$/.test(v)),
    cubicBezier: (v) => typeof v === 'string',
    fontFamily: (v) => typeof v === 'string',
    shadow: (v) => typeof v === 'string',
    opacity: (v) => (typeof v === 'number' && v >= 0 && v <= 1) || typeof v === 'string',
};

function checkValueType(token, path, filePath) {
    if (!token.$type) return; // No $type = skip per-type check
    const val = token.$value;
    // Alias references are resolved at build time — skip type-check
    if (typeof val === 'string' && val.startsWith('{')) return;
    const checker = VALUE_CHECKS[token.$type];
    if (!checker) return; // Unknown type — no specific check
    if (!checker(val)) {
        errors.push(
            `${filePath}: Token "${path}" has $type="${token.$type}" but value "${val}" does not match expected format`
        );
    }
}


// ─── Tier Rules ───────────────────────────────────────────────────────────────

// TIER 1 — Primitives: must NOT use alias references (must have concrete values)
function validatePrimitiveMustNotAlias(tokens, filePath) {
    if (!filePath.includes('primitives')) return;
    walkTokens(tokens, (token, path) => {
        if (token.$value && typeof token.$value === 'string' && token.$value.startsWith('{')) {
            errors.push(
                `${filePath}: Primitive token "${path}" uses an alias reference "${token.$value}" — primitives must define concrete values`
            );
        }
    });
}

// TIER 2 — Semantics: must only reference TIER 1 primitives, never raw hex/px
function validateSemanticReferencePrimitives(tokens, filePath) {
    if (!filePath.includes('semantic')) return;
    walkTokens(tokens, (token, path) => {
        if (!token.$value) return;
        const val = String(token.$value);
        // If it's a raw color or raw pixel dimension — violation
        if (/^#[0-9a-fA-F]{3,8}$/.test(val)) {
            errors.push(
                `${filePath}: Semantic token "${path}" has raw color "${val}" — must reference a primitive e.g. {color.base.brand.primary}`
            );
        }
        if (/^\d+px$/.test(val) && !val.startsWith('{')) {
            errors.push(
                `${filePath}: Semantic token "${path}" has raw dimension "${val}" — must reference a primitive e.g. {spacing.4}`
            );
        }
    });
}

// TIER 2 — Semantics: alias refs must not skip to component tier
function validateSemanticNoComponentRef(tokens, filePath) {
    if (!filePath.includes('semantic')) return;
    const COMPONENT_TIER_PREFIXES = ['button.', 'card.', 'badge.', 'input.', 'alert.', 'modal.', 'nav.'];
    walkTokens(tokens, (token, path) => {
        const ref = typeof token.$value === 'string' ? token.$value.match(/^\{(.+)\}$/)?.[1] : null;
        if (ref && COMPONENT_TIER_PREFIXES.some((p) => ref.startsWith(p))) {
            errors.push(
                `${filePath}: Semantic token "${path}" references component-tier token "${ref}" — semantics must only ref primitives`
            );
        }
    });
}

// TIER 3 — Components: must reference semantic tokens, not raw primitives
function validateNoPrimitivesInComponents(tokens, filePath) {
    if (!filePath.includes('component')) return;
    const KNOWN_PRIMITIVE_PREFIXES = [
        'color.blue', 'color.gray', 'color.red', 'color.green',
        'color.amber', 'color.violet', 'color.warm', 'color.black', 'color.white',
        'spacing.', 'font.size.', 'radius.', 'shadow.',
    ];
    walkTokens(tokens, (token, path) => {
        const ref = typeof token.$value === 'string' ? token.$value.match(/^\{(.+)\}$/)?.[1] : null;
        if (ref && KNOWN_PRIMITIVE_PREFIXES.some((p) => ref.startsWith(p))) {
            errors.push(
                `${filePath}: Component token "${path}" references primitive "${ref}" directly — must go through semantic tier`
            );
        }
    });
}

// ─── Grid + Scale Rules ──────────────────────────────────────────────────────

function validateSpacingGrid(tokens, filePath) {
    if (!filePath.includes('spacing') || !filePath.includes('primitives')) return;
    walkTokens(tokens, (token, path) => {
        if (token.$type === 'dimension' && typeof token.$value === 'string') {
            const px = parseInt(token.$value);
            if (!isNaN(px) && px > 0 && px % 4 !== 0) {
                errors.push(`${filePath}: Spacing token "${path}" = ${token.$value} is not on the 4px grid`);
            }
        }
    });
}

function validateFontSizeCount(tokens, filePath) {
    if (!filePath.includes('typography') || !filePath.includes('primitives')) return;
    const sizes = [];
    walkTokens(tokens, (token, path) => {
        if ((path.includes('font.size') || path.match(/\.size\./)) && token.$type === 'dimension') {
            sizes.push(path);
        }
    });
    if (sizes.length > 12) {
        warnings.push(`${filePath}: Type scale has ${sizes.length} sizes — consider reducing to 12 or fewer`);
    }
}

// ─── AJV Token Leaf Validation ───────────────────────────────────────────────

function validateTokenLeafs(tokens, filePath) {
    walkTokens(tokens, (token, path) => {
        const valid = validateGroup(token);
        if (!valid) {
            for (const err of validateGroup.errors ?? []) {
                errors.push(`${filePath}: Token "${path}" schema error: ${err.message} (at ${err.instancePath || 'root'})`);
            }
        }
        checkValueType(token, path, filePath);
    });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function walkTokens(obj, cb, path = '') {
    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue; // skip metadata keys at group level
        const currentPath = path ? `${path}.${key}` : key;
        if (value && typeof value === 'object') {
            if ('$value' in value) {
                cb(value, currentPath);
            } else {
                walkTokens(value, cb, currentPath);
            }
        }
    }
}

function loadJsonFiles(dir) {
    const results = [];
    const items = readdirSync(dir);
    for (const item of items) {
        const full = join(dir, item);
        if (item === 'index.json') continue; // skip aggregator index
        if (statSync(full).isDirectory()) {
            results.push(...loadJsonFiles(full));
        } else if (item.endsWith('.json')) {
            try {
                results.push({ filePath: full, tokens: JSON.parse(readFileSync(full, 'utf8')) });
            } catch (e) {
                errors.push(`${full}: Failed to parse JSON — ${e.message}`);
            }
        }
    }
    return results;
}

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log('\n🔍  Creative Liberation Engine — Design Token Tier Validator\n');

const files = loadJsonFiles(SRC);
console.log(`   Checking ${files.length} token files...\n`);

for (const { filePath, tokens } of files) {
    // AJV leaf validation (schema enforcement)
    validateTokenLeafs(tokens, filePath);
    // Tier-ancestry rules
    validatePrimitiveMustNotAlias(tokens, filePath);
    validateSemanticReferencePrimitives(tokens, filePath);
    validateSemanticNoComponentRef(tokens, filePath);
    validateNoPrimitivesInComponents(tokens, filePath);
    // Scale rules
    validateSpacingGrid(tokens, filePath);
    validateFontSizeCount(tokens, filePath);
}

if (warnings.length > 0) {
    console.warn('⚠️   Warnings:');
    warnings.forEach((w) => console.warn(`     • ${w}`));
    console.warn('');
}

if (errors.length > 0) {
    console.error('❌  Token validation FAILED:');
    errors.forEach((e) => console.error(`     • ${e}`));
    console.error(`\n   ${errors.length} error(s) found across ${files.length} files.\n`);
    process.exit(1);
}

console.log(`✅  All token tier constraints passed — ${files.length} files, 0 errors.\n`);
