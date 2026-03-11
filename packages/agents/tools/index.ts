/**
 * Shared Tool Library
 * Explicit, validated functions granted to agents.
 * No agent has ambient capability — tools are granted, not assumed.
 *
 * Tool categories:
 *   1. Filesystem  — read, write, list
 *   2. Git         — commit, push, status
 *   3. NPM         — run, install
 *   4. Web         — http_get
 *   5. Media       — generate_image (via GenMedia pipeline)
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';
import type { AgentTool } from './agent.js';

// ─── FILESYSTEM ───────────────────────────────────────────────────────────────

export const FILE_READ: AgentTool = {
    name: 'file_read',
    description: 'Read file contents from the filesystem',
    fn: async (path: unknown) => {
        return fs.readFile(String(path), 'utf8');
    },
};

export const FILE_WRITE: AgentTool = {
    name: 'file_write',
    description: 'Write content to a file (creates dirs if needed)',
    fn: async (path: unknown, content: unknown) => {
        const p = String(path);
        const { dirname } = await import('path');
        await fs.mkdir(dirname(p), { recursive: true });
        await fs.writeFile(p, String(content), 'utf8');
        return { written: p };
    },
};

export const FILE_LIST: AgentTool = {
    name: 'file_list',
    description: 'List files in a directory',
    fn: async (dir: unknown) => {
        const entries = await fs.readdir(String(dir), { withFileTypes: true });
        return entries.map(e => ({ name: e.name, isDir: e.isDirectory() }));
    },
};

// ─── GIT ─────────────────────────────────────────────────────────────────────

export const GIT_STATUS: AgentTool = {
    name: 'git_status',
    description: 'Get git status of the repo',
    fn: async (cwd: unknown) => {
        return execSync('git status --short', { cwd: String(cwd ?? process.cwd()), encoding: 'utf8' });
    },
};

export const GIT_COMMIT: AgentTool = {
    name: 'git_commit',
    description: 'Stage all changes and commit with message',
    fn: async (message: unknown, cwd: unknown) => {
        const dir = String(cwd ?? process.cwd());
        execSync('git add -A', { cwd: dir });
        return execSync(`git commit -m "${String(message).replace(/"/g, "'")}"`, { cwd: dir, encoding: 'utf8' });
    },
};

export const GIT_PUSH: AgentTool = {
    name: 'git_push',
    description: 'Push current branch to origin',
    fn: async (cwd: unknown) => {
        return execSync('git push', { cwd: String(cwd ?? process.cwd()), encoding: 'utf8' });
    },
};

// ─── NPM / PNPM ──────────────────────────────────────────────────────────────

export const NPM_RUN: AgentTool = {
    name: 'npm_run',
    description: 'Run an npm/pnpm script',
    fn: async (script: unknown, cwd: unknown) => {
        return execSync(`pnpm run ${String(script)}`, {
            cwd: String(cwd ?? process.cwd()),
            encoding: 'utf8',
            timeout: 120_000,
        });
    },
};

export const NPM_INSTALL: AgentTool = {
    name: 'npm_install',
    description: 'Install npm packages',
    fn: async (packages: unknown, cwd: unknown) => {
        const pkgStr = Array.isArray(packages) ? (packages as string[]).join(' ') : String(packages);
        return execSync(`pnpm add ${pkgStr}`, {
            cwd: String(cwd ?? process.cwd()),
            encoding: 'utf8',
            timeout: 120_000,
        });
    },
};

// ─── WEB ─────────────────────────────────────────────────────────────────────

export const HTTP_GET: AgentTool = {
    name: 'http_get',
    description: 'Fetch content from a URL',
    fn: async (url: unknown) => {
        const res = await fetch(String(url));
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
        const ct = res.headers.get('content-type') ?? '';
        return ct.includes('json') ? res.json() : res.text();
    },
};

// ─── TOOL COLLECTIONS PER HIVE ───────────────────────────────────────────────

export const AURORA_TOOLS: AgentTool[] = [FILE_READ, FILE_WRITE, FILE_LIST, GIT_STATUS, GIT_COMMIT, GIT_PUSH, NPM_RUN, NPM_INSTALL, HTTP_GET];
export const KEEPER_TOOLS: AgentTool[] = [FILE_READ, FILE_WRITE, FILE_LIST, GIT_STATUS, GIT_COMMIT];
export const LEX_TOOLS: AgentTool[] = [FILE_READ, HTTP_GET];
export const RELAY_TOOLS: AgentTool[] = [HTTP_GET];
