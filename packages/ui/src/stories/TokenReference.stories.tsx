// packages/ui/src/stories/TokenReference.stories.tsx
// T20260306-491: Token reference documentation page in Storybook
// eslint-disable-next-line -- Inline styles are required in this file: token swatches render live CSS var values dynamically
/* eslint-disable react/forbid-component-props */

import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';

// ─── Token reference data ─────────────────────────────────────────────────────

interface TokenGroup {
    name: string;
    description: string;
    tokens: Array<{
        name: string;
        cssVar: string;
        type: 'color' | 'dimension' | 'shadow' | 'duration' | 'string';
        example?: string;
    }>;
}

const TOKEN_GROUPS: TokenGroup[] = [
    {
        name: 'Colors — Brand',
        description: 'Primary brand colors used for interactive elements',
        tokens: [
            { name: 'Primary', cssVar: '--inc-color-primary', type: 'color' },
            { name: 'Primary Hover', cssVar: '--inc-color-primary-hover', type: 'color' },
            { name: 'Primary Subtle', cssVar: '--inc-color-primary-subtle', type: 'color' },
            { name: 'On Primary', cssVar: '--inc-color-on-primary', type: 'color' },
            { name: 'Secondary', cssVar: '--inc-color-secondary', type: 'color' },
        ],
    },
    {
        name: 'Colors — Surfaces',
        description: 'Background and surface layering system',
        tokens: [
            { name: 'Surface Base', cssVar: '--inc-color-surface-base', type: 'color' },
            { name: 'Surface Raised', cssVar: '--inc-color-surface-raised', type: 'color' },
            { name: 'Surface Overlay', cssVar: '--inc-color-surface-overlay', type: 'color' },
        ],
    },
    {
        name: 'Colors — Text',
        description: 'Text color hierarchy',
        tokens: [
            { name: 'Text Primary', cssVar: '--inc-color-text-primary', type: 'color' },
            { name: 'Text Secondary', cssVar: '--inc-color-text-secondary', type: 'color' },
            { name: 'Text Tertiary', cssVar: '--inc-color-text-tertiary', type: 'color' },
            { name: 'Text Placeholder', cssVar: '--inc-color-text-placeholder', type: 'color' },
            { name: 'Text Disabled', cssVar: '--inc-color-text-disabled', type: 'color' },
        ],
    },
    {
        name: 'Colors — Status',
        description: 'Semantic status colors for feedback states',
        tokens: [
            { name: 'Success', cssVar: '--inc-color-status-success', type: 'color' },
            { name: 'Success Subtle', cssVar: '--inc-color-status-success-subtle', type: 'color' },
            { name: 'Warning', cssVar: '--inc-color-status-warning', type: 'color' },
            { name: 'Warning Subtle', cssVar: '--inc-color-status-warning-subtle', type: 'color' },
            { name: 'Error', cssVar: '--inc-color-status-error', type: 'color' },
            { name: 'Error Subtle', cssVar: '--inc-color-status-error-subtle', type: 'color' },
        ],
    },
    {
        name: 'Spacing',
        description: '4px grid — all values are multiples of 4px',
        tokens: [
            { name: 'Space 1 (4px)', cssVar: '--inc-space-1', type: 'dimension', example: '4px' },
            { name: 'Space 2 (8px)', cssVar: '--inc-space-2', type: 'dimension', example: '8px' },
            { name: 'Space 3 (12px)', cssVar: '--inc-space-3', type: 'dimension', example: '12px' },
            { name: 'Space 4 (16px)', cssVar: '--inc-space-4', type: 'dimension', example: '16px' },
            { name: 'Space 6 (24px)', cssVar: '--inc-space-6', type: 'dimension', example: '24px' },
            { name: 'Space 8 (32px)', cssVar: '--inc-space-8', type: 'dimension', example: '32px' },
            { name: 'Space 12 (48px)', cssVar: '--inc-space-12', type: 'dimension', example: '48px' },
            { name: 'Space 16 (64px)', cssVar: '--inc-space-16', type: 'dimension', example: '64px' },
        ],
    },
    {
        name: 'Typography',
        description: '9-size type scale (xs → 3xl)',
        tokens: [
            { name: 'Font Size XS', cssVar: '--inc-font-size-xs', type: 'dimension', example: '11px' },
            { name: 'Font Size SM', cssVar: '--inc-font-size-sm', type: 'dimension', example: '13px' },
            { name: 'Font Size Base', cssVar: '--inc-font-size-base', type: 'dimension', example: '15px' },
            { name: 'Font Size LG', cssVar: '--inc-font-size-lg', type: 'dimension', example: '18px' },
            { name: 'Font Size XL', cssVar: '--inc-font-size-xl', type: 'dimension', example: '22px' },
            { name: 'Font Size 2XL', cssVar: '--inc-font-size-2xl', type: 'dimension', example: '28px' },
            { name: 'Font Size 3XL', cssVar: '--inc-font-size-3xl', type: 'dimension', example: '36px' },
            { name: 'Font Weight Regular', cssVar: '--inc-font-weight-regular', type: 'string', example: '400' },
            { name: 'Font Weight Semibold', cssVar: '--inc-font-weight-semibold', type: 'string', example: '600' },
            { name: 'Font Weight Bold', cssVar: '--inc-font-weight-bold', type: 'string', example: '700' },
        ],
    },
    {
        name: 'Border Radius',
        description: '5-step radius scale',
        tokens: [
            { name: 'Radius None', cssVar: '--inc-radius-none', type: 'dimension', example: '0px' },
            { name: 'Radius SM', cssVar: '--inc-radius-sm', type: 'dimension', example: '4px' },
            { name: 'Radius MD', cssVar: '--inc-radius-md', type: 'dimension', example: '8px' },
            { name: 'Radius LG', cssVar: '--inc-radius-lg', type: 'dimension', example: '12px' },
            { name: 'Radius XL', cssVar: '--inc-radius-xl', type: 'dimension', example: '16px' },
            { name: 'Radius Full', cssVar: '--inc-radius-full', type: 'dimension', example: '9999px' },
        ],
    },
    {
        name: 'Shadows',
        description: '4-tier shadow elevation system',
        tokens: [
            { name: 'Shadow SM', cssVar: '--inc-shadow-sm', type: 'shadow', example: '0 1px 3px rgba(0,0,0,0.08)' },
            { name: 'Shadow MD', cssVar: '--inc-shadow-md', type: 'shadow', example: '0 4px 12px rgba(0,0,0,0.12)' },
            { name: 'Shadow LG', cssVar: '--inc-shadow-lg', type: 'shadow', example: '0 8px 24px rgba(0,0,0,0.16)' },
            { name: 'Shadow Glow', cssVar: '--inc-shadow-glow', type: 'shadow', example: '0 0 20px var(--inc-color-primary)' },
        ],
    },
    {
        name: 'Motion',
        description: 'Animation duration and easing tokens',
        tokens: [
            { name: 'Duration Fast', cssVar: '--inc-duration-fast', type: 'duration', example: '100ms' },
            { name: 'Duration Base', cssVar: '--inc-duration-base', type: 'duration', example: '200ms' },
            { name: 'Duration Slow', cssVar: '--inc-duration-slow', type: 'duration', example: '350ms' },
            { name: 'Duration Slower', cssVar: '--inc-duration-slower', type: 'duration', example: '500ms' },
            { name: 'Easing Standard', cssVar: '--inc-easing-standard', type: 'string', example: 'cubic-bezier(0.4,0,0.2,1)' },
            { name: 'Easing Decelerate', cssVar: '--inc-easing-decelerate', type: 'string', example: 'cubic-bezier(0,0,0.2,1)' },
            { name: 'Easing Accelerate', cssVar: '--inc-easing-accelerate', type: 'string', example: 'cubic-bezier(0.4,0,1,1)' },
        ],
    },
];

// ─── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ cssVar, name }: { cssVar: string; name: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <div
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: `var(${cssVar})`,
                    border: '1px solid rgba(0,0,0,0.08)',
                    flexShrink: 0,
                }}
            />
            <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                <code style={{ fontSize: 11, opacity: 0.6 }}>{cssVar}</code>
            </div>
        </div>
    );
}

// ─── Spacing Swatch ───────────────────────────────────────────────────────────

function SpacingSwatch({ cssVar, name, example }: { cssVar: string; name: string; example?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
            <div style={{ width: 120, display: 'flex', alignItems: 'center' }}>
                <div
                    style={{
                        height: 16,
                        background: 'var(--inc-color-primary, #6366f1)',
                        borderRadius: 2,
                        opacity: 0.6,
                        width: `calc(${example} * 1.5)`,
                        minWidth: 4,
                        maxWidth: 120,
                    }}
                />
            </div>
            <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                <code style={{ fontSize: 11, opacity: 0.6 }}>{cssVar} — {example}</code>
            </div>
        </div>
    );
}

// ─── Shadow Swatch ────────────────────────────────────────────────────────────

function ShadowSwatch({ cssVar, name }: { cssVar: string; name: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
            <div
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: 'var(--inc-color-surface-base, #fff)',
                    boxShadow: `var(${cssVar})`,
                    flexShrink: 0,
                }}
            />
            <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                <code style={{ fontSize: 11, opacity: 0.6 }}>{cssVar}</code>
            </div>
        </div>
    );
}

// ─── Token Group Section ──────────────────────────────────────────────────────

function TokenGroupSection({ group }: { group: TokenGroup }) {
    return (
        <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{group.name}</h2>
            <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 16 }}>{group.description}</p>
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 8 }}>
                {group.tokens.map((token) => {
                    if (token.type === 'color') {
                        return <ColorSwatch key={token.cssVar} cssVar={token.cssVar} name={token.name} />;
                    }
                    if (token.type === 'shadow') {
                        return <ShadowSwatch key={token.cssVar} cssVar={token.cssVar} name={token.name} />;
                    }
                    if (token.type === 'dimension' && token.cssVar.includes('space')) {
                        return <SpacingSwatch key={token.cssVar} cssVar={token.cssVar} name={token.name} example={token.example} />;
                    }
                    return (
                        <div key={token.cssVar} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                            <div style={{ minWidth: 160, fontSize: 13, fontWeight: 600 }}>{token.name}</div>
                            <code style={{ fontSize: 11, opacity: 0.6 }}>{token.cssVar}</code>
                            {token.example && (
                                <span style={{ fontSize: 12, opacity: 0.5, fontStyle: 'italic' }}>{token.example}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Full Token Reference Page ────────────────────────────────────────────────

function TokenReferencePage() {
    return (
        <div style={{ padding: 32, maxWidth: 860, fontFamily: 'var(--inc-font-family-body, system-ui)' }}>
            <div style={{ marginBottom: 40 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Design Token Reference</h1>
                <p style={{ fontSize: 14, opacity: 0.65, lineHeight: 1.6 }}>
                    All tokens are defined in <code>@inception/design-tokens</code> and exported as CSS custom properties.
                    Use <code>var(--inc-*)</code> in component styles — never hardcode raw values.
                </p>
                <div
                    style={{
                        display: 'inline-block',
                        background: 'var(--inc-color-primary-subtle, rgba(99,102,241,0.08))',
                        border: '1px solid var(--inc-color-primary-subtle, rgba(99,102,241,0.2))',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontSize: 13,
                        color: 'var(--inc-color-primary, #6366f1)',
                        marginTop: 12,
                    }}
                >
                    📐 Tier system: Primitives → Semantic → Component tokens · W3C DTCG format
                </div>
            </div>

            {TOKEN_GROUPS.map((group) => (
                <TokenGroupSection key={group.name} group={group} />
            ))}
        </div>
    );
}

// ─── Storybook meta ───────────────────────────────────────────────────────────

const meta: Meta = {
    title: 'Design System/Token Reference',
    component: TokenReferencePage,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Live reference for all Creative Liberation Engine design tokens. Values shown are resolved from CSS custom properties in the active theme.',
            },
        },
    },
};

export default meta;
type Story = StoryObj;

export const AllTokens: Story = {};

export const ColorsOnly: Story = {
    render: () => (
        <div style={{ padding: 32, fontFamily: 'var(--inc-font-family-body, system-ui)' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Color Tokens</h1>
            {TOKEN_GROUPS.filter((g) => g.name.startsWith('Colors')).map((group) => (
                <TokenGroupSection key={group.name} group={group} />
            ))}
        </div>
    ),
};

export const SpacingAndRadius: Story = {
    render: () => (
        <div style={{ padding: 32, fontFamily: 'var(--inc-font-family-body, system-ui)' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Spacing & Radius</h1>
            {TOKEN_GROUPS.filter((g) => g.name === 'Spacing' || g.name === 'Border Radius').map((group) => (
                <TokenGroupSection key={group.name} group={group} />
            ))}
        </div>
    ),
};
