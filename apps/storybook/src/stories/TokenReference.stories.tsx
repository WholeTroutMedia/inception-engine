import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';

// Token reference documentation page for Storybook
// This renders a live lookup of all CSS custom properties from the token system

function TokenTable({ category, prefix }: { category: string; prefix: string }) {
  const [tokens, setTokens] = useState<Array<{ name: string; value: string }>>([]);

  useEffect(() => {
    const vars: Array<{ name: string; value: string }> = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule instanceof CSSStyleRule) {
            for (const prop of Array.from(rule.style)) {
              if (prop.startsWith(`--inc-${prefix}`)) {
                vars.push({ name: prop, value: rule.style.getPropertyValue(prop).trim() });
              }
            }
          }
        }
      } catch {
        // Cross-origin stylesheet
      }
    }
    setTokens(vars);
  }, [prefix]);

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{category}</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f4f4f5', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px' }}>Token</th>
            <th style={{ padding: '8px 12px' }}>Value</th>
            <th style={{ padding: '8px 12px' }}>Preview</th>
          </tr>
        </thead>
        <tbody>
          {tokens.length === 0 && (
            <tr><td colSpan={3} style={{ padding: '8px 12px', color: '#71717a' }}>No tokens found — ensure design-token CSS is imported</td></tr>
          )}
          {tokens.map(({ name, value }) => (
            <tr key={name} style={{ borderBottom: '1px solid #e4e4e7' }}>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{name}</td>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#71717a' }}>{value}</td>
              <td style={{ padding: '8px 12px' }}>
                {prefix === 'color' && (
                  <span style={{
                    display: 'inline-block', width: 24, height: 24,
                    borderRadius: 4, background: `var(${name})`,
                    border: '1px solid #e4e4e7',
                  }} />
                )}
                {prefix === 'spacing' && (
                  <span style={{
                    display: 'inline-block', height: 8,
                    width: `var(${name})`, minWidth: 4,
                    background: '#0f62fe', borderRadius: 2,
                  }} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TokenDocs() {
  return (
    <div style={{ padding: 32, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Design Tokens</h1>
      <p style={{ color: '#71717a', marginBottom: 48 }}>
        The Creative Liberation Engine design token system — W3C DTCG format, compiled by Style Dictionary v4.
        All tokens are CSS custom properties prefixed with <code>--inc-</code>.
      </p>
      <TokenTable category="🎨 Color" prefix="color" />
      <TokenTable category="📐 Spacing" prefix="spacing" />
      <TokenTable category="🔄 Motion" prefix="motion" />
      <TokenTable category="📦 Shadow" prefix="shadow" />
      <TokenTable category="📐 Radius" prefix="radius" />
    </div>
  );
}

const meta: Meta<typeof TokenDocs> = {
  title: 'Design System/Token Reference',
  component: TokenDocs,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Live reference of all design tokens. Values update dynamically when the theme is changed.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TokenDocs>;

export const AllTokens: Story = {};
