// packages/theme-engine/src/export-dtcg.ts
// T20260306-141: Theme export as W3C DTCG JSON

import { BUILT_IN_THEMES, type ThemeId, type Theme } from './themes.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DtcgToken {
    $type: string;
    $value: string | number;
    $description?: string;
    $deprecated?: boolean;
}

interface DtcgGroup {
    [key: string]: DtcgToken | DtcgGroup;
}

interface DtcgBundle {
    $schema?: string;
    $metadata: {
        themeId: ThemeId;
        themeName: string;
        exportedAt: string;
        generator: string;
        version: string;
    };
    colors: DtcgGroup;
    typography?: DtcgGroup;
    spacing?: DtcgGroup;
    radius?: DtcgGroup;
    shadow?: DtcgGroup;
    motion?: DtcgGroup;
    raw?: DtcgGroup;
}

// ─── CSS var → token tier classifier ─────────────────────────────────────────

function classifyVar(key: string): { tier: string; group: string; name: string } {
    // key example: '--inc-color-primary' or '--inc-font-size-base'
    const stripped = key.replace(/^--inc-/, '');
    const parts = stripped.split('-');

    const tierMap: Record<string, string> = {
        color: 'colors',
        font: 'typography',
        space: 'spacing',
        radius: 'radius',
        shadow: 'shadow',
        motion: 'motion',
        duration: 'motion',
        easing: 'motion',
    };

    const firstPart = parts[0];
    const tier = firstPart ? (tierMap[firstPart] ?? 'raw') : 'raw';
    const group = parts.slice(1, -1).join('-') || 'base';
    const name = parts[parts.length - 1] ?? stripped;

    return { tier, group, name };
}

function typeForTier(tier: string): string {
    return {
        colors: 'color',
        typography: 'dimension',
        spacing: 'dimension',
        radius: 'dimension',
        shadow: 'shadow',
        motion: 'duration',
        raw: 'string',
    }[tier] ?? 'string';
}

// ─── Main export function ─────────────────────────────────────────────────────

export function exportThemeAsDtcg(themeId: ThemeId): DtcgBundle {
    const theme = BUILT_IN_THEMES[themeId] as Theme;
    if (!theme) throw new Error(`Unknown theme: ${themeId}`);

    const bundle: DtcgBundle = {
        $schema: 'https://tr.designtokens.org/format/',
        $metadata: {
            themeId,
            themeName: theme.displayName,
            exportedAt: new Date().toISOString(),
            generator: '@inception/theme-engine',
            version: '1.0.0',
        },
        colors: {},
        typography: {},
        spacing: {},
        radius: {},
        shadow: {},
        motion: {},
        raw: {},
    };

    // Walk the theme's CSS variable overrides
    // We need to construct them from the theme's override definitions
    const cssVars: Record<string, string> = {};
    if (theme.overrides.color) {
        for (const [k, v] of Object.entries(theme.overrides.color)) {
            cssVars[`--inc-${k.replace(/\./g, '-')}`] = v;
        }
    }
    if (theme.overrides.spacing) {
        for (const [k, v] of Object.entries(theme.overrides.spacing)) {
            cssVars[`--inc-${k.replace(/\./g, '-')}`] = v;
        }
    }

    for (const [cssVar, value] of Object.entries(cssVars)) {
        const { tier, group, name } = classifyVar(cssVar);
        const $type = typeForTier(tier);

        // Coerce value to correct DTCG type
        const $value: string | number = tier === 'spacing' || tier === 'radius'
            ? (parseFloat(value) || value)
            : value;

        const dtcgToken: DtcgToken = { $type, $value, $description: `${cssVar} override for ${theme.displayName}` };

        const targetGroup = (bundle as unknown as Record<string, DtcgGroup | unknown>)[tier] as DtcgGroup;
        if (targetGroup) {
            if (!targetGroup[group]) targetGroup[group] = {};
            (targetGroup[group] as DtcgGroup)[name] = dtcgToken;
        }
    }

    return bundle;
}

/** Export all themes as a Map<ThemeId, DtcgBundle> */
export function exportAllThemes(): Map<ThemeId, DtcgBundle> {
    const result = new Map<ThemeId, DtcgBundle>();
    for (const id of Object.keys(BUILT_IN_THEMES) as ThemeId[]) {
        result.set(id, exportThemeAsDtcg(id));
    }
    return result;
}

/** Serialize a bundle to formatted JSON ready to write to disk */
export function serializeDtcg(bundle: DtcgBundle): string {
    // Remove empty groups
    const cleaned = Object.fromEntries(
        Object.entries(bundle).filter(([k, v]) => {
            if (k.startsWith('$')) return true;
            return v && typeof v === 'object' && Object.keys(v as object).length > 0;
        })
    );
    return JSON.stringify(cleaned, null, 2);
}

// ─── CSS variable export ──────────────────────────────────────────────────────

export function exportThemeAsCssVars(themeId: ThemeId): string {
    const theme = BUILT_IN_THEMES[themeId] as Theme;
    if (!theme) throw new Error(`Unknown theme: ${themeId}`);

    const vars: string[] = [];
    if (theme.overrides.color) {
        for (const [k, v] of Object.entries(theme.overrides.color)) {
            vars.push(`  --inc-${k.replace(/\./g, '-')}: ${v};`);
        }
    }
    if (theme.overrides.spacing) {
        for (const [k, v] of Object.entries(theme.overrides.spacing)) {
            vars.push(`  --inc-${k.replace(/\./g, '-')}: ${v};`);
        }
    }

    return `/* ${theme.displayName} — generated by @inception/theme-engine */\n[data-theme="${themeId}"] {\n${vars.join('\n')}\n}\n`;
}

export function exportAllThemesAsCss(): string {
    return (Object.keys(BUILT_IN_THEMES) as ThemeId[])
        .map(exportThemeAsCssVars)
        .join('\n\n');
}
