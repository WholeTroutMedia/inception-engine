import React, { useState, useEffect } from 'react';
import { VeraScorePanel } from './VeraScorePanel';

// Theme type from theme-engine
type ThemeName = 'default' | 'dark' | 'light' | 'high-contrast';

const THEMES: ThemeName[] = ['light', 'dark', 'high-contrast'];

const TOKEN_GROUPS = [
  { label: 'Brand Colors', vars: ['--inc-color-brand-primary', '--inc-color-brand-secondary'] },
  { label: 'Neutral', vars: ['--inc-color-background-default', '--inc-color-background-subtle', '--inc-color-background-inverse'] },
  { label: 'Text', vars: ['--inc-color-text-primary', '--inc-color-text-secondary', '--inc-color-text-brand'] },
  { label: 'Border', vars: ['--inc-color-border-default', '--inc-color-border-focus'] },
  { label: 'Spacing', vars: ['--inc-spacing-inline-sm', '--inc-spacing-inline-md', '--inc-spacing-inline-lg', '--inc-spacing-stack-sm', '--inc-spacing-stack-md', '--inc-spacing-stack-lg'] },
  { label: 'Radius', vars: ['--inc-radius-component-button', '--inc-radius-component-card', '--inc-radius-component-badge'] },
];

function ColorSwatch({ varName }: { varName: string }) {
  const [value, setValue] = useState('');
  const isColor = varName.includes('color');
  const isSpacing = varName.includes('spacing');
  const isRadius = varName.includes('radius');

  useEffect(() => {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    setValue(computed || '—');
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--inc-color-border-default, #e4e4e7)' }}>
      {isColor && (
        <div style={{
          width: 32, height: 32, borderRadius: 6,
          background: `var(${varName})`,
          border: '1px solid var(--inc-color-border-default, #e4e4e7)',
          flexShrink: 0,
        }} />
      )}
      {isSpacing && (
        <div style={{
          height: 8, width: `var(${varName})`,
          background: 'var(--inc-color-brand-primary, #0f62fe)',
          borderRadius: 2, flexShrink: 0, minWidth: 4,
        }} />
      )}
      {isRadius && (
        <div style={{
          width: 32, height: 32,
          borderRadius: `var(${varName})`,
          background: 'var(--inc-color-brand-primary, #0f62fe)',
          flexShrink: 0,
        }} />
      )}
      <div>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--inc-color-text-secondary, #71717a)' }}>{varName}</div>
        <div style={{ fontSize: 11, color: 'var(--inc-color-text-secondary, #71717a)', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTheme, setActiveTheme] = useState<ThemeName>('light');

  const applyTheme = (theme: ThemeName) => {
    setActiveTheme(theme);
    document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--inc-color-background-default)' }}>
      {/* Header */}
      <header style={{
        padding: '24px 48px', borderBottom: '1px solid var(--inc-color-border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--inc-color-text-secondary)', fontWeight: 600 }}>
            Creative Liberation Engine
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--inc-color-text-primary)', marginTop: 4 }}>
            Token Playground
          </h1>
        </div>
        {/* Theme switcher */}
        <div style={{ display: 'flex', gap: 8 }}>
          {THEMES.map(t => (
            <button
              key={t}
              onClick={() => applyTheme(t)}
              style={{
                padding: '6px 16px', borderRadius: 6, border: '1px solid var(--inc-color-border-default)',
                background: activeTheme === t ? 'var(--inc-color-brand-primary)' : 'transparent',
                color: activeTheme === t ? '#fff' : 'var(--inc-color-text-primary)',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                transition: 'all 150ms ease',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Content: 2-column layout */}
      <main style={{ padding: '48px', maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, alignItems: 'start' }}>
        {/* Token Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 32 }}>
          {TOKEN_GROUPS.map(group => (
            <div key={group.label} style={{
              background: 'var(--inc-color-background-subtle)',
              border: '1px solid var(--inc-color-border-default)',
              borderRadius: 12, padding: 24,
            }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--inc-color-text-secondary)', marginBottom: 16 }}>
                {group.label}
              </h2>
              {group.vars.map(v => <ColorSwatch key={v} varName={v} />)}
            </div>
          ))}

          {/* Footer panel */}
          <div style={{
            padding: 32,
            background: 'var(--inc-color-background-subtle)',
            border: '1px solid var(--inc-color-border-default)',
            borderRadius: 12, textAlign: 'center',
            gridColumn: '1 / -1',
          }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--inc-color-brand-primary, #0f62fe)' }}>ATELIER</div>
            <div style={{ fontSize: 14, color: 'var(--inc-color-text-secondary)', marginTop: 8 }}>
              Creative Liberation Engine Design System · Token Playground · {TOKEN_GROUPS.length} token groups loaded
            </div>
          </div>
        </div>

        {/* VERA Score Panel — sticky right column */}
        <div style={{ position: 'sticky', top: 24 }}>
          <VeraScorePanel />
        </div>
      </main>
    </div>
  );
}
