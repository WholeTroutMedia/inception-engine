// packages/design-sandbox/src/SandboxContext.tsx
// DS-501, DS-502, DS-503, DS-504
// Isolated state for the Design Sandbox — never touches production tokens

'use client';

import React, { createContext, useContext, useCallback, useReducer, useRef } from 'react';
import type { Theme } from '@inception/theme-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SandboxMode = 'sandbox' | 'guided' | 'freeform';

export interface GuardrailEvent {
    type: 'hard' | 'soft' | 'nudge' | 'celebration';
    message: string;
    tokenPath?: string;
    suggestion?: string;
    timestamp: number;
}

export interface SandboxSnapshot {
    id: string;
    timestamp: number;
    overrides: Record<string, string>;
    description: string;
}

export interface SandboxState {
    mode: SandboxMode;
    overrides: Record<string, string>;        // tokenPath → value (sandbox-isolated)
    history: SandboxSnapshot[];               // undo ring buffer (max 50)
    historyIndex: number;                     // current position in history
    qualityScore: number;
    lastGuardrail: GuardrailEvent | null;
    isDirty: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type SandboxAction =
    | { type: 'SET_MODE'; mode: SandboxMode }
    | { type: 'SET_OVERRIDE'; tokenPath: string; value: string }
    | { type: 'BATCH_OVERRIDE'; overrides: Record<string, string> }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'RESET' }
    | { type: 'SNAPSHOT'; description: string }
    | { type: 'SET_QUALITY_SCORE'; score: number }
    | { type: 'SET_GUARDRAIL'; event: GuardrailEvent | null }
    | { type: 'LOAD_THEME'; theme: Theme };

const MAX_HISTORY = 50;

function sandboxReducer(state: SandboxState, action: SandboxAction): SandboxState {
    switch (action.type) {
        case 'SET_MODE':
            return { ...state, mode: action.mode };

        case 'SET_OVERRIDE': {
            const newOverrides = { ...state.overrides, [action.tokenPath]: action.value };
            return pushSnapshot(state, newOverrides, `Changed ${action.tokenPath}`);
        }

        case 'BATCH_OVERRIDE': {
            const newOverrides = { ...state.overrides, ...action.overrides };
            return pushSnapshot(state, newOverrides, 'Batch override applied');
        }

        case 'UNDO': {
            if (state.historyIndex <= 0) return state;
            const newIndex = state.historyIndex - 1;
            const snapshot = state.history[newIndex];
            return {
                ...state,
                historyIndex: newIndex,
                overrides: snapshot?.overrides ?? {},
                isDirty: newIndex > 0,
            };
        }

        case 'REDO': {
            if (state.historyIndex >= state.history.length - 1) return state;
            const newIndex = state.historyIndex + 1;
            const snapshot = state.history[newIndex];
            return {
                ...state,
                historyIndex: newIndex,
                overrides: snapshot?.overrides ?? state.overrides,
                isDirty: true,
            };
        }

        case 'RESET':
            return { ...initialState, mode: state.mode };

        case 'SET_QUALITY_SCORE':
            return { ...state, qualityScore: action.score };

        case 'SET_GUARDRAIL':
            return { ...state, lastGuardrail: action.event };

        case 'LOAD_THEME':
            return pushSnapshot(state, action.theme.overrides.color ?? {}, `Loaded theme: ${action.theme.id}`);

        default:
            return state;
    }
}

function pushSnapshot(state: SandboxState, overrides: Record<string, string>, description: string): SandboxState {
    const snapshot: SandboxSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: Date.now(),
        overrides,
        description,
    };

    // Trim history at current index + add new snapshot (handles redo divergence)
    const trimmed = state.history.slice(0, state.historyIndex + 1);
    const newHistory = [...trimmed, snapshot].slice(-MAX_HISTORY);

    return {
        ...state,
        overrides,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
    };
}

// ─── Guardrail Evaluator ─────────────────────────────────────────────────────

const HARD_CONSTRAINTS: Record<string, (value: string) => string | null> = {
    'font-size': (v) => {
        const px = parseInt(v);
        if (v.endsWith('px') && px < 12) return 'Font size below 12px is not allowed — minimum is 12px for readability';
        return null;
    },
};

function evaluateGuardrail(tokenPath: string, value: string, mode: SandboxMode): GuardrailEvent | null {
    // Hard constraints always apply
    for (const [key, check] of Object.entries(HARD_CONSTRAINTS)) {
        if (tokenPath.includes(key)) {
            const msg = check(value);
            if (msg) return { type: 'hard', message: msg, tokenPath, timestamp: Date.now() };
        }
    }

    // Non-token value detection (soft in guided, blocked in sandbox mode)
    const isLiteralHex = /^#[0-9a-fA-F]{3,8}$/.test(value);
    const isLiteralPx = /^\d+px$/.test(value) && !value.startsWith('var(');

    if (isLiteralHex && mode !== 'freeform') {
        return {
            type: mode === 'sandbox' ? 'soft' : 'nudge',
            message: `Raw hex value "${value}" detected`,
            tokenPath,
            suggestion: 'Use a token reference instead: var(--inc-color-*)',
            timestamp: Date.now(),
        };
    }

    if (isLiteralPx && mode === 'guided') {
        return {
            type: 'nudge',
            message: `Literal px value "${value}" — consider using a spacing token`,
            tokenPath,
            suggestion: `Try var(--inc-spacing-inset-md) or another spacing token`,
            timestamp: Date.now(),
        };
    }

    return null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface SandboxContextValue {
    state: SandboxState;
    setMode: (mode: SandboxMode) => void;
    setOverride: (tokenPath: string, value: string) => void;
    batchOverride: (overrides: Record<string, string>) => void;
    undo: () => void;
    redo: () => void;
    reset: () => void;
    loadTheme: (theme: Theme) => void;
    canUndo: boolean;
    canRedo: boolean;
    exportCSS: () => string;
    exportJSON: () => string;
}

const initialState: SandboxState = {
    mode: 'guided',
    overrides: {},
    history: [{ id: 'initial', timestamp: Date.now(), overrides: {}, description: 'Initial state' }],
    historyIndex: 0,
    qualityScore: 100,
    lastGuardrail: null,
    isDirty: false,
};

const SandboxCtx = createContext<SandboxContextValue | null>(null);

export function SandboxProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(sandboxReducer, initialState);

    const setMode = useCallback((mode: SandboxMode) => dispatch({ type: 'SET_MODE', mode }), []);

    const setOverride = useCallback((tokenPath: string, value: string) => {
        const guardrail = evaluateGuardrail(tokenPath, value, state.mode);
        if (guardrail?.type === 'hard') {
            dispatch({ type: 'SET_GUARDRAIL', event: guardrail });
            return; // Block the change
        }
        if (guardrail) dispatch({ type: 'SET_GUARDRAIL', event: guardrail });
        dispatch({ type: 'SET_OVERRIDE', tokenPath, value });
    }, [state.mode]);

    const batchOverride = useCallback((overrides: Record<string, string>) => {
        dispatch({ type: 'BATCH_OVERRIDE', overrides });
    }, []);

    const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
    const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
    const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
    const loadTheme = useCallback((theme: Theme) => dispatch({ type: 'LOAD_THEME', theme }), []);

    const exportCSS = useCallback((): string => {
        const lines = [':root.sandbox-preview {'];
        for (const [path, value] of Object.entries(state.overrides)) {
            lines.push(`  --inc-${path.replace(/\./g, '-')}: ${value};`);
        }
        lines.push('}');
        return lines.join('\n');
    }, [state.overrides]);

    const exportJSON = useCallback((): string => {
        return JSON.stringify(
            Object.entries(state.overrides).reduce((acc, [path, value]) => {
                acc[path] = { $value: value, $type: 'color' };
                return acc;
            }, {} as Record<string, unknown>),
            null, 2
        );
    }, [state.overrides]);

    return (
        <SandboxCtx.Provider value={{
            state,
            setMode, setOverride, batchOverride, undo, redo, reset, loadTheme,
            canUndo: state.historyIndex > 0,
            canRedo: state.historyIndex < state.history.length - 1,
            exportCSS, exportJSON,
        }}>
            {children}
        </SandboxCtx.Provider>
    );
}

export function useSandbox(): SandboxContextValue {
    const ctx = useContext(SandboxCtx);
    if (!ctx) throw new Error('useSandbox must be used within <SandboxProvider>');
    return ctx;
}
