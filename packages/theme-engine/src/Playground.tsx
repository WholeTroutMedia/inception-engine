import React, { useState, useMemo } from 'react';
import { BUILT_IN_THEMES, ThemeId, Theme, validateTheme, generateThemeCSS } from './themes.js';
import './Playground.css';

export const ThemePlayground: React.FC = () => {
    const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('default');

    const selectedTheme = (BUILT_IN_THEMES[selectedThemeId] || BUILT_IN_THEMES['default']) as Theme;

    // Auto-validate current theme
    const validation = useMemo(() => {
        return validateTheme(selectedTheme, {
            'color.text.primary': selectedTheme.overrides.color?.['color.text.primary'] || '#111827',
            'color.surface.base': selectedTheme.overrides.color?.['color.surface.base'] || '#f9fafb',
            'color.primary': selectedTheme.overrides.color?.['color.primary'] || '#0066cc',
        });
    }, [selectedTheme]);

    return (
        <div
            data-theme={selectedThemeId}
            className="theme-playground-root flex flex-col gap-6 p-8 min-h-screen transition-colors duration-300"
        >
            <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(selectedTheme) }} />

            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Theme Playground</h1>
                <p className="opacity-70 text-sm">Select and preview built-in themes in real-time.</p>
            </header>

            <div className="flex gap-4 mb-8">
                {Object.values(BUILT_IN_THEMES).map(theme => (
                    <button
                        key={theme.id}
                        onClick={() => setSelectedThemeId(theme.id)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${selectedThemeId === theme.id
                            ? 'border-[var(--inc-color-primary,#0066cc)] bg-[var(--inc-color-primary-subtle,#e0f2fe)] text-[var(--inc-color-primary,#0066cc)]'
                            : 'border-[var(--inc-color-border-default,#d1d5db)] hover:bg-black/5'
                            }`}
                    >
                        {theme.displayName}
                    </button>
                ))}
            </div>

            <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold">Theme Details</h2>
                    <div className="p-6 rounded-xl border border-[var(--inc-color-border-default,#e5e7eb)] bg-[var(--inc-color-surface-card,#ffffff)] shadow-sm">
                        <h3 className="font-bold text-lg mb-2">{selectedTheme.displayName}</h3>
                        <p className="text-sm opacity-80 mb-4">{selectedTheme.description}</p>

                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                            <div className="flex flex-col gap-1">
                                <span className="opacity-50 uppercase tracking-widest text-[10px]">Author</span>
                                <span>{selectedTheme.metadata.author}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="opacity-50 uppercase tracking-widest text-[10px]">Quality Score</span>
                                <span className="text-[var(--inc-color-primary,#0066cc)] font-bold">{selectedTheme.metadata.score}/100</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold">Live Validation</h2>
                    <div className={`p-6 rounded-xl border-l-4 shadow-sm ${validation.passed
                        ? 'border-green-500 bg-green-500/5'
                        : 'border-red-500 bg-red-500/5'
                        }`}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className={`w-3 h-3 rounded-full ${validation.passed ? 'bg-green-500' : 'bg-red-500'}`} />
                            <h3 className="font-bold">{validation.passed ? 'Passing WCAG AA' : 'Validation Failed'}</h3>
                        </div>

                        {!validation.passed && validation.failures.contrast && (
                            <ul className="text-sm flex flex-col gap-2 p-4 bg-red-500/10 rounded-lg text-red-900 dark:text-red-200">
                                {validation.failures.contrast.map((f, i) => (
                                    <li key={i}>
                                        <span className="font-semibold">{f.pair}</span> fail: {f.actual} (req: {f.required})
                                    </li>
                                ))}
                            </ul>
                        )}

                        {validation.passed && (
                            <p className="text-sm opacity-80">
                                All contrast, hierarchy, and rhythm requirements met.
                            </p>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};
